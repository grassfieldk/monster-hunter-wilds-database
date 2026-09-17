import { Anchor, Badge, Box, getTreeExpandedState, Group, NativeSelect, SimpleGrid, Stack, Table, Text, Tree, useTree } from '@mantine/core';
import type { TreeNodeData } from '@mantine/core';
import { useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { text, useDatabase } from '../data';
import type { Amulet, Armor, ArmorSeries, Decoration, EquipmentRecipe, Weapon } from '../types';
import { NotFoundPage } from './NotFoundPage';

const categories = [
  { key: 'weapons', label: '武器' },
  { key: 'armor', label: '防具' },
  { key: 'amulets', label: '護石' },
  { key: 'decorations', label: '装飾品' },
] as const;

const armorParts = ['頭', '胴', '腕', '腰', '脚'];

function WeaponTreeView({ currentId, weapons, weaponTrees }: { currentId: string; weapons: Weapon[]; weaponTrees: { parent_id: string; child_id: string }[] }) {
  const treeData = useMemo<TreeNodeData[]>(() => {
    const weaponById = new Map(weapons.map((weapon) => [weapon.game_id, weapon]));
    const childrenById = new Map<string, string[]>();
    const parentsById = new Map<string, string[]>();
    for (const edge of weaponTrees) {
      childrenById.set(edge.parent_id, [...(childrenById.get(edge.parent_id) ?? []), edge.child_id]);
      parentsById.set(edge.child_id, [...(parentsById.get(edge.child_id) ?? []), edge.parent_id]);
    }
    const roots = new Set<string>();
    const findRoots = (weaponId: string, path: Set<string>) => {
      if (path.has(weaponId)) return;
      const nextPath = new Set(path).add(weaponId);
      const parents = parentsById.get(weaponId) ?? [];
      if (!parents.length) {
        roots.add(weaponId);
        return;
      }
      parents.forEach((parentId) => findRoots(parentId, nextPath));
    };
    findRoots(currentId, new Set());
    const buildNode = (weaponId: string, path: Set<string>): TreeNodeData | null => {
      const weapon = weaponById.get(weaponId);
      if (!weapon || path.has(weaponId)) return null;
      const nextPath = new Set(path).add(weaponId);
      return {
        value: weapon.game_id,
        label: text(weapon.names),
        children: (childrenById.get(weaponId) ?? []).map((childId) => buildNode(childId, nextPath)).filter((node): node is TreeNodeData => node !== null),
      };
    };
    return [...roots].map((rootId) => buildNode(rootId, new Set())).filter((node): node is TreeNodeData => node !== null);
  }, [currentId, weapons, weaponTrees]);
  const tree = useTree({ initialExpandedState: getTreeExpandedState(treeData, '*') });

  return <Tree
    data={treeData}
    tree={tree}
    levelOffset="md"
    expandOnClick={false}
    expandOnSpace={false}
    renderNode={({ node, elementProps }) => (
      <Group gap={4} wrap="nowrap" {...elementProps}>
        {node.value === currentId ? <Text className="equipment-tree-label" fw={600}>{node.label}</Text> : <Anchor className="equipment-tree-label" component={Link} to={`/equipment/weapons/${encodeURIComponent(node.value)}`}>{node.label}</Anchor>}
      </Group>
    )}
  />;
}

function EquipmentList() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { armor, armorSeries, amulets, weapons, decorations } = useDatabase();
  const params = new URLSearchParams(search);
  const kind = params.get('kind') ?? 'weapons';
  const active = categories.some((category) => category.key === kind) ? kind : 'weapons';
  const weaponCategories = [...new Set(weapons.map((weapon) => weapon.category))];
  const requestedWeaponCategory = params.get('weapon');
  const activeWeaponCategory = weaponCategories.includes(requestedWeaponCategory ?? '')
    ? requestedWeaponCategory!
    : weaponCategories[0];

  const rows = active === 'weapons' ? weapons.filter((weapon) => weapon.category === activeWeaponCategory).sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja'))
    : active === 'armor' ? armorSeries.filter((series) => armor.some((item) => item.series_id === series.game_id)).sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja'))
      : active === 'amulets' ? [...amulets].sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja'))
        : [...decorations].sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja'));

  return (
    <Stack className={active === 'weapons' ? 'page-stack with-rank-tabs' : 'page-stack'} gap="md">
      {active === 'weapons' && <Box className="section-tabs rank-tabs">
        <NativeSelect
          aria-label="武器種"
          data={weaponCategories}
          value={activeWeaponCategory ?? null}
          size="sm"
          classNames={{ root: 'weapon-type-select-root', input: 'weapon-type-select' }}
          onChange={(value) => {
            navigate(`/equipment?kind=weapons&weapon=${encodeURIComponent(value.currentTarget.value)}`);
          }}
        />
      </Box>}
      <Box className="responsive-table-container">
        <Table className="responsive-table" striped highlightOnHover withTableBorder>
          <Table.Thead>
            {active === 'weapons' && <Table.Tr><Table.Th>武器</Table.Th><Table.Th className="numeric-cell">攻撃</Table.Th><Table.Th className="numeric-cell">会心</Table.Th></Table.Tr>}
            {active === 'armor' && <Table.Tr><Table.Th>シリーズ</Table.Th><Table.Th className="numeric-cell">レア度</Table.Th></Table.Tr>}
            {active === 'amulets' && <Table.Tr><Table.Th>護石</Table.Th></Table.Tr>}
            {active === 'decorations' && <Table.Tr><Table.Th>装飾品</Table.Th><Table.Th className="numeric-cell">必要スロット</Table.Th></Table.Tr>}
          </Table.Thead>
          <Table.Tbody>
            {rows.map((entry) => {
              if (active === 'weapons') {
                const weapon = entry as Weapon;
                return <Table.Tr key={weapon.game_id}><Table.Td><Anchor component={Link} to={`/equipment/weapons/${encodeURIComponent(weapon.game_id)}`} fw={500}>{text(weapon.names)}</Anchor></Table.Td><Table.Td className="numeric-cell">{weapon.attack.toLocaleString('ja-JP')}</Table.Td><Table.Td className="numeric-cell">{weapon.affinity}%</Table.Td></Table.Tr>;
              }
              if (active === 'armor') {
                const series = entry as ArmorSeries;
                return <Table.Tr key={series.game_id}><Table.Td><Anchor component={Link} to={`/equipment/armor/${encodeURIComponent(String(series.game_id))}`} fw={500}>{text(series.names)}</Anchor></Table.Td><Table.Td className="numeric-cell">{series.rarity}</Table.Td></Table.Tr>;
              }
              if (active === 'amulets') {
                const item = entry as Amulet;
                return <Table.Tr key={item.game_id}><Table.Td><Anchor component={Link} to={`/equipment/amulets/${encodeURIComponent(item.game_id)}`} fw={500}>{text(item.names)}</Anchor></Table.Td></Table.Tr>;
              }
              const item = entry as Decoration;
              return <Table.Tr key={item.game_id}><Table.Td><Anchor component={Link} to={`/equipment/decorations/${encodeURIComponent(String(item.game_id))}`} fw={500}>{text(item.names)}</Anchor></Table.Td><Table.Td className="numeric-cell">{item.required_slot}</Table.Td></Table.Tr>;
            })}
          </Table.Tbody>
        </Table>
      </Box>
    </Stack>
  );
}

function ArmorSeriesDetail() {
  const { id } = useParams();
  const { armor, armorSeries, armorRecipes, armorUpgradeRecipes, itemById, skills } = useDatabase();
  const decodedId = id ? decodeURIComponent(id) : '';
  const piece = armor.find((entry) => entry.game_id === decodedId);
  const seriesId = piece?.series_id ?? Number(decodedId);
  const series = armorSeries.find((entry) => entry.game_id === seriesId);
  if (!series) return <NotFoundPage />;

  const pieces = armor.filter((entry) => entry.series_id === series.game_id).sort((a, b) => a.part - b.part);
  const skillNames = (refs: { skill_id: number; level: number }[]) => refs.map((ref) => {
    const skill = skills.find((entry) => entry.game_id === ref.skill_id);
    return `${skill ? text(skill.names) : `ID ${ref.skill_id}`} Lv ${ref.level}`;
  }).join('、') || 'なし';
  const materialName = (itemId: number) => {
    const item = itemById.get(itemId);
    return item ? <Anchor component={Link} to={`/items/${item.game_id}`}>{text(item.names)}</Anchor> : `ID ${itemId}`;
  };
  const recipeGroups = pieces.map((item) => ({
    item,
    materials: armorRecipes.filter((recipe) => recipe.armor_id === item.game_id).flatMap((recipe) => recipe.materials),
  })).filter((group) => group.materials.length > 0);
  const upgradeMaterials = armorUpgradeRecipes.find((recipe) => recipe.series_id === series.game_id)?.materials ?? [];

  return <Stack className="page-stack" gap="lg">
    <Stack gap="xs">
      <Group gap="xs"><Badge variant="light">防具</Badge><Text size="lg" fw={600}>{text(series.names)}</Text></Group>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        <div><Text size="sm" c="dimmed">レア度</Text><Text size="sm" fw={500}>{series.rarity}</Text></div>
        <div><Text size="sm" c="dimmed">生産価格</Text><Text size="sm" fw={500}>{series.price.toLocaleString('ja-JP')} z</Text></div>
        <div><Text size="sm" c="dimmed">部位数</Text><Text size="sm" fw={500}>{pieces.length}</Text></div>
        <div><Text size="sm" c="dimmed">装備形式</Text><Text size="sm" fw={500}>{series.one_set ? '一式装備' : '部位別'}</Text></div>
      </SimpleGrid>
    </Stack>

    <Box visibleFrom="sm" className="responsive-table-container">
      <Table className="responsive-table responsive-table--intrinsic">
        <Table.Thead><Table.Tr><Table.Th>部位</Table.Th><Table.Th>防具</Table.Th><Table.Th className="numeric-cell">防御</Table.Th><Table.Th>スロット</Table.Th><Table.Th>属性耐性</Table.Th><Table.Th>スキル</Table.Th></Table.Tr></Table.Thead>
        <Table.Tbody>{pieces.map((item) => <Table.Tr key={item.game_id}>
          <Table.Td>{armorParts[item.part] ?? `部位 ${item.part}`}</Table.Td>
          <Table.Td>{text(item.names)}</Table.Td>
          <Table.Td className="numeric-cell">{item.defense.toLocaleString('ja-JP')}</Table.Td>
          <Table.Td>{item.slots.join('・') || 'なし'}</Table.Td>
          <Table.Td>{item.resistances.join('・')}</Table.Td>
          <Table.Td>{skillNames(item.skills)}</Table.Td>
        </Table.Tr>)}</Table.Tbody>
      </Table>
    </Box>
    <Stack hiddenFrom="sm" gap="sm">
      {pieces.map((item) => <Stack key={item.game_id} gap={4}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text size="sm" fw={600} style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{armorParts[item.part] ?? `部位 ${item.part}`}　{text(item.names)}</Text>
          <Text size="sm" className="numeric-cell" style={{ flexShrink: 0 }}>防御 {item.defense.toLocaleString('ja-JP')}</Text>
        </Group>
        <Text size="sm" c="dimmed">スロット: {item.slots.join('・') || 'なし'}</Text>
        <Text size="sm" c="dimmed">属性耐性: {item.resistances.join('・')}</Text>
        <Text size="sm" c="dimmed" style={{ overflowWrap: 'anywhere' }}>スキル: {skillNames(item.skills)}</Text>
      </Stack>)}
    </Stack>

    <Stack gap="xs">
      <Text size="sm" fw={600}>必要素材</Text>
      {recipeGroups.length ? <SimpleGrid cols={2} spacing="md">{recipeGroups.map(({ item, materials }) => <Stack key={item.game_id} gap={4}>
        <Text size="sm" fw={600}>{armorParts[item.part] ?? `部位 ${item.part}`}</Text>
        {materials.map((material, index) => <Group key={`${material.item_id}-${index}`} justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
          <Text size="sm" style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>{materialName(material.item_id)}</Text>
          <Text size="sm" className="numeric-cell" style={{ flexShrink: 0 }}>x{material.amount}</Text>
        </Group>)}
      </Stack>)}</SimpleGrid> : <Text size="sm" c="dimmed">生産レシピはありません</Text>}
    </Stack>

    {upgradeMaterials.length > 0 && <Stack gap="xs">
      <Text size="sm" fw={600}>強化素材</Text>
      <SimpleGrid cols={2} spacing="md">
        <Stack gap={4}>
          {upgradeMaterials.map((material, index) => <Group key={`${material.item_id}-${index}`} justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
            <Text size="sm" style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>{materialName(material.item_id)}</Text>
            <Text size="sm" className="numeric-cell" style={{ flexShrink: 0 }}>x{material.amount}</Text>
          </Group>)}
        </Stack>
      </SimpleGrid>
    </Stack>}
  </Stack>;
}

function EquipmentDetail() {
  const { kind, id } = useParams();
  const { armor, amulets, weapons, decorations, skills, itemById, armorRecipes, amuletRecipes, weaponRecipes, weaponTrees, armorSeries, armorUpgradeRecipes } = useDatabase();
  const decodedId = id ? decodeURIComponent(id) : '';
  const equipment = kind === 'weapons' ? weapons.find((entry) => entry.game_id === decodedId)
    : kind === 'armor' ? armor.find((entry) => entry.game_id === decodedId)
      : kind === 'amulets' ? amulets.find((entry) => entry.game_id === decodedId)
        : kind === 'decorations' ? decorations.find((entry) => String(entry.game_id) === decodedId) : undefined;
  if (!equipment) return <NotFoundPage />;

  const skillNames = (refs: { skill_id: number; level: number }[]) => refs.map((ref) => {
    const skill = skills.find((entry) => entry.game_id === ref.skill_id);
    return `${skill ? text(skill.names) : `ID ${ref.skill_id}`} Lv ${ref.level}`;
  }).join('、') || 'なし';

  const recipes = kind === 'weapons' ? weaponRecipes.filter((recipe) => recipe.weapon_id === decodedId)
    : kind === 'armor' ? armorRecipes.filter((recipe) => recipe.armor_id === decodedId)
      : kind === 'amulets' ? amuletRecipes.filter((recipe) => recipe.amulet_id === decodedId) : [];
  const materialName = (itemId: number) => {
    const item = itemById.get(itemId);
    return item ? <Anchor component={Link} to={`/items/${item.game_id}`}>{text(item.names)}</Anchor> : `ID ${itemId}`;
  };
  const materialTable = (materials: { item_id: number; amount: number }[]) => <Table className="responsive-table responsive-table--intrinsic">
    <Table.Thead><Table.Tr><Table.Th>素材</Table.Th><Table.Th className="numeric-cell">必要数</Table.Th></Table.Tr></Table.Thead>
    <Table.Tbody>{materials.map((material, index) => <Table.Tr key={`${material.item_id}-${index}`}>
      <Table.Td>{materialName(material.item_id)}</Table.Td>
      <Table.Td className="numeric-cell">{material.amount}</Table.Td>
    </Table.Tr>)}</Table.Tbody>
  </Table>;
  const recipeBlock = (recipeList: EquipmentRecipe[]) => <Stack gap="xs">
    <Text size="sm" fw={600}>必要素材</Text>
    {recipeList.length ? materialTable(recipeList.flatMap((recipe) => recipe.materials)) : <Text size="sm" c="dimmed">生産レシピはありません</Text>}
  </Stack>;
  return <Stack className="page-stack" gap="lg">
    <Stack gap="xs">
      <Group gap="xs"><Badge variant="light">{kind === 'weapons' ? (equipment as Weapon).category : kind === 'armor' ? '防具' : kind === 'amulets' ? '護石' : '装飾品'}</Badge><Text size="lg" fw={600}>{text(equipment.names)}</Text></Group>
      <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>{text(equipment.descriptions)}</Text>
    </Stack>
    {kind === 'weapons' && (() => { const item = equipment as Weapon; const hasTree = weaponTrees.some((edge) => edge.parent_id === item.game_id || edge.child_id === item.game_id); return <><SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm"><div><Text size="sm" c="dimmed">レア度</Text><Text size="sm" fw={500}>{item.rarity}</Text></div><div><Text size="sm" c="dimmed">攻撃力</Text><Text size="sm" fw={500}>{item.attack}</Text></div><div><Text size="sm" c="dimmed">会心率</Text><Text size="sm" fw={500}>{item.affinity}%</Text></div><div><Text size="sm" c="dimmed">価格</Text><Text size="sm" fw={500}>{item.price.toLocaleString('ja-JP')} z</Text></div><div><Text size="sm" c="dimmed">属性</Text><Text size="sm" fw={500}>{item.attribute_value || 'なし'}</Text></div><div><Text size="sm" c="dimmed">スロット</Text><Text size="sm" fw={500}>{item.slots.join('・') || 'なし'}</Text></div><div><Text size="sm" c="dimmed">スキル</Text><Text size="sm" fw={500}>{skillNames(item.skills)}</Text></div></SimpleGrid>{recipeBlock(recipes)}{hasTree && <Stack gap="xs"><Text size="sm" fw={600}>派生</Text><WeaponTreeView currentId={item.game_id} weapons={weapons} weaponTrees={weaponTrees} /></Stack>}</>; })()}
    {kind === 'armor' && (() => { const item = equipment as Armor; const series = armorSeries.find((entry) => entry.game_id === item.series_id); const upgradeMaterials = armorUpgradeRecipes.find((entry) => entry.series_id === item.series_id)?.materials ?? []; return <><SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm"><div><Text size="sm" c="dimmed">シリーズ</Text><Text size="sm" fw={500}>{series ? text(series.names) : '不明'}</Text></div><div><Text size="sm" c="dimmed">部位</Text><Text size="sm" fw={500}>{armorParts[item.part] ?? `部位 ${item.part}`}</Text></div><div><Text size="sm" c="dimmed">レア度</Text><Text size="sm" fw={500}>{item.rarity ?? '不明'}</Text></div><div><Text size="sm" c="dimmed">防御力</Text><Text size="sm" fw={500}>{item.defense}</Text></div><div><Text size="sm" c="dimmed">スロット</Text><Text size="sm" fw={500}>{item.slots.join('・') || 'なし'}</Text></div><div><Text size="sm" c="dimmed">属性耐性</Text><Text size="sm" fw={500}>{item.resistances.join('・')}</Text></div><div><Text size="sm" c="dimmed">スキル</Text><Text size="sm" fw={500}>{skillNames(item.skills)}</Text></div></SimpleGrid>{recipeBlock(recipes)}{upgradeMaterials.length > 0 && <Stack gap="xs"><Text size="sm" fw={600}>強化素材</Text>{materialTable(upgradeMaterials)}</Stack>}</>; })()}
    {kind === 'amulets' && (() => { const item = equipment as Amulet; return <><SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm"><div><Text size="sm" c="dimmed">レア度</Text><Text size="sm" fw={500}>{item.rarity}</Text></div><div><Text size="sm" c="dimmed">レベル</Text><Text size="sm" fw={500}>{item.level}</Text></div><div><Text size="sm" c="dimmed">価格</Text><Text size="sm" fw={500}>{item.price.toLocaleString('ja-JP')} z</Text></div><div><Text size="sm" c="dimmed">スキル</Text><Text size="sm" fw={500}>{skillNames(item.skills)}</Text></div></SimpleGrid>{recipeBlock(recipes)}</>; })()}
    {kind === 'decorations' && (() => { const item = equipment as Decoration; return <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm"><div><Text size="sm" c="dimmed">レア度</Text><Text size="sm" fw={500}>{item.rarity}</Text></div><div><Text size="sm" c="dimmed">必要スロット</Text><Text size="sm" fw={500}>{item.required_slot}</Text></div><div><Text size="sm" c="dimmed">価格</Text><Text size="sm" fw={500}>{item.price.toLocaleString('ja-JP')} z</Text></div><div><Text size="sm" c="dimmed">スキル</Text><Text size="sm" fw={500}>{skillNames(item.skills)}</Text></div></SimpleGrid>; })()}
  </Stack>;
}

export function EquipmentPage() {
  const { kind, id } = useParams();
  return id ? kind === 'armor' ? <ArmorSeriesDetail /> : <EquipmentDetail /> : <EquipmentList />;
}
