import type { TreeNodeData } from '@mantine/core';
import {
  Anchor,
  Badge,
  Box,
  Group,
  getTreeExpandedState,
  NativeSelect,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Tree,
  useTree,
} from '@mantine/core';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  EquipmentMaterialGroups,
  EquipmentMaterialTable,
  EquipmentRecipeSection,
} from '../components/EquipmentMaterials';
import { text, useDatabase } from '../data';
import { formatEquipmentSkills } from '../formatters';
import { weaponAttributeLabel } from '../labels';
import type { Amulet, Armor, ArmorSeries, Decoration, EquipmentSkill, Skill, Weapon } from '../types';
import { NotFoundPage } from './NotFoundPage';

const categories = [
  { key: 'weapons', label: '武器' },
  { key: 'armor', label: '防具' },
  { key: 'amulets', label: '護石' },
  { key: 'decorations', label: '装飾品' },
] as const;

const armorParts = ['頭', '胴', '腕', '腰', '脚'];

function compareIds(a: number | string, b: number | string) {
  return Number(a) - Number(b);
}

type AmuletGroup = {
  amulet_type: number;
  items: Amulet[];
};

function amuletName(amulet: Amulet) {
  return text(amulet.names).replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/u, '');
}

function groupAmulets(amulets: Amulet[]) {
  const groups = new Map<number, Amulet[]>();
  for (const amulet of amulets) groups.set(amulet.amulet_type, [...(groups.get(amulet.amulet_type) ?? []), amulet]);
  return [...groups.entries()]
    .map(([amulet_type, items]) => ({ amulet_type, items: items.sort((a, b) => a.level - b.level) }))
    .sort((a, b) => compareIds(a.amulet_type, b.amulet_type));
}

function AmuletLevelMarks({ items }: { items: Amulet[] }) {
  const levels = new Set(items.map((item) => item.level));
  const levelLabel = [...levels].sort((a, b) => a - b).join('、');
  return (
    <span className="amulet-level-marks" role="img" aria-label={`存在するレベル: ${levelLabel}`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index + 1}
          className="amulet-level-mark"
          data-active={levels.has(index + 1) || undefined}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function formatAmuletSkills(items: Amulet[], skillById: Map<number, Skill>) {
  const names = new Set<string>();
  for (const item of items) {
    for (const skill of item.skills) {
      const definition = skillById.get(skill.skill_id);
      names.add(definition ? text(definition.names) : `ID ${skill.skill_id}`);
    }
    const effect = text(item.descriptions).match(/装備することで(.+?)が発動/u)?.[1] ?? '';
    for (const match of effect.matchAll(/([^と]+?)スキル/gu)) names.add(match[1]);
  }
  return [...names].join('、') || 'なし';
}

function EquipmentStats({ stats }: { stats: { label: string; value: ReactNode }[] }) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
      {stats.map((stat) => (
        <div key={stat.label}>
          <Text size="sm" c="dimmed">
            {stat.label}
          </Text>
          <Text size="sm" fw={500}>
            {stat.value}
          </Text>
        </div>
      ))}
    </SimpleGrid>
  );
}

function WeaponTreeView({
  currentId,
  weapons,
  weaponTrees,
}: {
  currentId: string;
  weapons: Weapon[];
  weaponTrees: { parent_id: string; child_id: string }[];
}) {
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
      parents.forEach((parentId) => {
        findRoots(parentId, nextPath);
      });
    };
    findRoots(currentId, new Set());
    const buildNode = (weaponId: string, path: Set<string>): TreeNodeData | null => {
      const weapon = weaponById.get(weaponId);
      if (!weapon || path.has(weaponId)) return null;
      const nextPath = new Set(path).add(weaponId);
      return {
        value: weapon.game_id,
        label: text(weapon.names),
        children: (childrenById.get(weaponId) ?? [])
          .map((childId) => buildNode(childId, nextPath))
          .filter((node): node is TreeNodeData => node !== null),
      };
    };
    return [...roots]
      .map((rootId) => buildNode(rootId, new Set()))
      .filter((node): node is TreeNodeData => node !== null);
  }, [currentId, weapons, weaponTrees]);
  const tree = useTree({ initialExpandedState: getTreeExpandedState(treeData, '*') });

  return (
    <Tree
      data={treeData}
      tree={tree}
      levelOffset="md"
      expandOnClick={false}
      expandOnSpace={false}
      renderNode={({ node, elementProps }) => (
        <Group gap={4} wrap="nowrap" {...elementProps}>
          {node.value === currentId ? (
            <Text className="equipment-tree-label" fw={600}>
              {node.label}
            </Text>
          ) : (
            <Anchor
              className="equipment-tree-label"
              component={Link}
              to={`/equipment/weapons/${encodeURIComponent(node.value)}`}
            >
              {node.label}
            </Anchor>
          )}
        </Group>
      )}
    />
  );
}

function EquipmentList() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { armor, armorSeries, amulets, weapons, decorations, skillById } = useDatabase();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const kind = params.get('kind') ?? 'weapons';
  const active = categories.some((category) => category.key === kind) ? kind : 'weapons';
  const weaponCategories = useMemo(() => [...new Set(weapons.map((weapon) => weapon.category))], [weapons]);
  const requestedWeaponCategory = params.get('weapon');
  const activeWeaponCategory =
    requestedWeaponCategory !== null && weaponCategories.includes(requestedWeaponCategory)
      ? requestedWeaponCategory
      : weaponCategories[0];

  const rows = useMemo(() => {
    if (active === 'weapons')
      return weapons
        .filter((weapon) => weapon.category === activeWeaponCategory)
        .sort((a, b) => compareIds(a.game_id, b.game_id));
    if (active === 'armor') {
      const armorSeriesIds = new Set(armor.map((item) => item.series_id));
      return armorSeries
        .filter((series) => armorSeriesIds.has(series.game_id))
        .sort((a, b) => compareIds(a.game_id, b.game_id));
    }
    if (active === 'amulets') return groupAmulets(amulets);
    return [...decorations].sort((a, b) => compareIds(a.game_id, b.game_id));
  }, [active, activeWeaponCategory, armor, armorSeries, amulets, decorations, weapons]);

  return (
    <Stack className={active === 'weapons' ? 'page-stack with-rank-tabs' : 'page-stack'} gap="md">
      {active === 'weapons' && (
        <Box className="section-tabs rank-tabs">
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
        </Box>
      )}
      <Box className="responsive-table-container">
        <Table className="responsive-table" striped highlightOnHover withTableBorder>
          <Table.Thead>
            {active === 'weapons' && (
              <Table.Tr>
                <Table.Th>武器</Table.Th>
                <Table.Th className="numeric-cell">攻撃</Table.Th>
                <Table.Th className="numeric-cell">会心</Table.Th>
              </Table.Tr>
            )}
            {active === 'armor' && (
              <Table.Tr>
                <Table.Th>シリーズ</Table.Th>
                <Table.Th className="numeric-cell">レア度</Table.Th>
              </Table.Tr>
            )}
            {active === 'amulets' && (
              <Table.Tr>
                <Table.Th>護石</Table.Th>
                <Table.Th>レベル</Table.Th>
                <Table.Th>スキル</Table.Th>
              </Table.Tr>
            )}
            {active === 'decorations' && (
              <Table.Tr>
                <Table.Th>装飾品</Table.Th>
                <Table.Th className="numeric-cell">必要スロット</Table.Th>
              </Table.Tr>
            )}
          </Table.Thead>
          <Table.Tbody>
            {rows.map((entry) => {
              if (active === 'weapons') {
                const weapon = entry as Weapon;
                return (
                  <Table.Tr key={weapon.game_id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/equipment/weapons/${encodeURIComponent(weapon.game_id)}`} fw={500}>
                        {text(weapon.names)}
                      </Anchor>
                    </Table.Td>
                    <Table.Td className="numeric-cell">{weapon.attack.toLocaleString('ja-JP')}</Table.Td>
                    <Table.Td className="numeric-cell">{weapon.affinity}%</Table.Td>
                  </Table.Tr>
                );
              }
              if (active === 'armor') {
                const series = entry as ArmorSeries;
                return (
                  <Table.Tr key={series.game_id}>
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`/equipment/armor/${encodeURIComponent(String(series.game_id))}`}
                        fw={500}
                      >
                        {text(series.names)}
                      </Anchor>
                    </Table.Td>
                    <Table.Td className="numeric-cell">{series.rarity}</Table.Td>
                  </Table.Tr>
                );
              }
              if (active === 'amulets') {
                const group = entry as AmuletGroup;
                const item = group.items[0];
                return (
                  <Table.Tr key={group.amulet_type}>
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`/equipment/amulets/${encodeURIComponent(String(group.amulet_type))}`}
                        fw={500}
                      >
                        {amuletName(item)}
                      </Anchor>
                    </Table.Td>
                    <Table.Td className="centered-cell">
                      <AmuletLevelMarks items={group.items} />
                    </Table.Td>
                    <Table.Td>{formatAmuletSkills(group.items, skillById)}</Table.Td>
                  </Table.Tr>
                );
              }
              const item = entry as Decoration;
              return (
                <Table.Tr key={item.game_id}>
                  <Table.Td>
                    <Anchor
                      component={Link}
                      to={`/equipment/decorations/${encodeURIComponent(String(item.game_id))}`}
                      fw={500}
                    >
                      {text(item.names)}
                    </Anchor>
                  </Table.Td>
                  <Table.Td className="numeric-cell">{item.required_slot}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>
    </Stack>
  );
}

function WeaponDetailStats({ item, skillById }: { item: Weapon; skillById: Map<number, Skill> }) {
  const attributes =
    [
      item.attribute_value > 0 ? `${weaponAttributeLabel(item.attribute)} ${item.attribute_value}` : null,
      item.sub_attribute_value > 0 ? `${weaponAttributeLabel(item.sub_attribute)} ${item.sub_attribute_value}` : null,
    ]
      .filter(Boolean)
      .join(' / ') || 'なし';
  return (
    <EquipmentStats
      stats={[
        { label: 'レア度', value: item.rarity },
        { label: '攻撃力', value: item.attack },
        { label: '会心率', value: `${item.affinity}%` },
        { label: '価格', value: `${item.price.toLocaleString('ja-JP')} z` },
        { label: '属性', value: attributes },
        { label: 'スロット', value: item.slots.join('・') || 'なし' },
        { label: 'スキル', value: formatEquipmentSkills(item.skills, skillById) },
      ]}
    />
  );
}

function ArmorDetailStats({
  item,
  seriesName,
  skillById,
}: {
  item: Armor;
  seriesName: string;
  skillById: Map<number, Skill>;
}) {
  return (
    <EquipmentStats
      stats={[
        { label: 'シリーズ', value: seriesName },
        { label: '部位', value: armorParts[item.part] ?? `部位 ${item.part}` },
        { label: 'レア度', value: item.rarity ?? '不明' },
        { label: '防御力', value: item.defense },
        { label: 'スロット', value: item.slots.join('・') || 'なし' },
        { label: '属性耐性', value: item.resistances.join('・') },
        { label: 'スキル', value: formatEquipmentSkills(item.skills, skillById) },
      ]}
    />
  );
}

function formatNumberRange(values: number[]) {
  const unique = [...new Set(values)].sort((a, b) => a - b);
  if (unique.length === 1) return unique[0].toLocaleString('ja-JP');
  return `${unique[0].toLocaleString('ja-JP')}〜${unique.at(-1)?.toLocaleString('ja-JP')}`;
}

function getArmorSetSkills(items: Armor[]) {
  const levels = new Map<number, number>();
  for (const item of items) {
    for (const skill of item.skills) {
      levels.set(skill.skill_id, (levels.get(skill.skill_id) ?? 0) + skill.level);
    }
  }
  return [...levels].map(([skill_id, level]) => ({ skill_id, level }));
}

function ArmorSetSkillTable({ items, skillById }: { items: Armor[]; skillById: Map<number, Skill> }) {
  const skills = getArmorSetSkills(items);
  const cells: (EquipmentSkill | null)[] = skills.length ? skills : [null, null];
  if (cells.length === 1) cells.push(null);
  const rows: (EquipmentSkill | null)[][] = [];
  for (let index = 0; index < cells.length; index += 2) rows.push([cells[index], cells[index + 1]]);
  return (
    <Box className="responsive-table-container">
      <Table className="responsive-table responsive-table--intrinsic" withTableBorder withColumnBorders>
        <Table.Tbody>
          {rows.map((row, rowIndex) => (
            <Table.Tr key={rowIndex}>
              {row.map((skill, index) => (
                <Table.Td key={skill ? skill.skill_id : `empty-${rowIndex}-${index}`}>
                  {skill ? `${text(skillById.get(skill.skill_id)?.names)} Lv ${skill.level}` : ''}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}

function AmuletDetailStats({ group, skillById }: { group: AmuletGroup; skillById: Map<number, Skill> }) {
  return (
    <EquipmentStats
      stats={[
        { label: 'レベル', value: <AmuletLevelMarks items={group.items} /> },
        { label: 'レア度', value: formatNumberRange(group.items.map((item) => item.rarity)) },
        { label: 'スキル', value: formatAmuletSkills(group.items, skillById) },
      ]}
    />
  );
}

function DecorationDetailStats({ item, skillById }: { item: Decoration; skillById: Map<number, Skill> }) {
  return (
    <EquipmentStats
      stats={[
        { label: 'レア度', value: item.rarity },
        { label: '必要スロット', value: item.required_slot },
        { label: '価格', value: `${item.price.toLocaleString('ja-JP')} z` },
        { label: 'スキル', value: formatEquipmentSkills(item.skills, skillById) },
      ]}
    />
  );
}

function ArmorSeriesDetail() {
  const { id } = useParams();
  const { armor, armorSeries, armorRecipes, armorUpgradeRecipes, itemById, skillById } = useDatabase();
  const decodedId = id ? decodeURIComponent(id) : '';
  const piece = armor.find((entry) => entry.game_id === decodedId);
  const seriesId = piece?.series_id ?? Number(decodedId);
  const series = armorSeries.find((entry) => entry.game_id === seriesId);
  if (!series) return <NotFoundPage />;

  const pieces = armor.filter((entry) => entry.series_id === series.game_id).sort((a, b) => a.part - b.part);
  const recipeGroups = pieces
    .map((item) => ({
      item,
      materials: armorRecipes
        .filter((recipe) => recipe.armor_id === item.game_id)
        .flatMap((recipe) => recipe.materials),
    }))
    .filter((group) => group.materials.length > 0);
  const upgradeMaterials = armorUpgradeRecipes.find((recipe) => recipe.series_id === series.game_id)?.materials ?? [];

  return (
    <Stack className="page-stack" gap="lg">
      <Stack gap="xs">
        <Group gap="xs">
          <Badge variant="light">防具</Badge>
          <Text size="lg" fw={600}>
            {text(series.names)}
          </Text>
        </Group>
        <EquipmentStats
          stats={[
            { label: 'レア度', value: series.rarity },
            { label: '部位数', value: pieces.length },
            { label: '装備形式', value: series.one_set ? '一式装備' : '部位別' },
          ]}
        />
        <Stack gap={4}>
          <Text size="sm" c="dimmed">
            セットスキル
          </Text>
          <ArmorSetSkillTable items={pieces} skillById={skillById} />
        </Stack>
      </Stack>

      <Box visibleFrom="sm" className="responsive-table-container">
        <Table className="responsive-table responsive-table--intrinsic">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>部位</Table.Th>
              <Table.Th>防具</Table.Th>
              <Table.Th className="numeric-cell">防御</Table.Th>
              <Table.Th>スロット</Table.Th>
              <Table.Th>属性耐性</Table.Th>
              <Table.Th>スキル</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pieces.map((item) => (
              <Table.Tr key={item.game_id}>
                <Table.Td>{armorParts[item.part] ?? `部位 ${item.part}`}</Table.Td>
                <Table.Td>{text(item.names)}</Table.Td>
                <Table.Td className="numeric-cell">{item.defense.toLocaleString('ja-JP')}</Table.Td>
                <Table.Td>{item.slots.join('・') || 'なし'}</Table.Td>
                <Table.Td>{item.resistances.join('・')}</Table.Td>
                <Table.Td>{formatEquipmentSkills(item.skills, skillById)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
      <Stack hiddenFrom="sm" gap="sm">
        {pieces.map((item) => (
          <Stack key={item.game_id} gap={4}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Text size="sm" fw={600} style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                {armorParts[item.part] ?? `部位 ${item.part}`}　{text(item.names)}
              </Text>
              <Text size="sm" className="numeric-cell" style={{ flexShrink: 0 }}>
                防御 {item.defense.toLocaleString('ja-JP')}
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              スロット: {item.slots.join('・') || 'なし'}
            </Text>
            <Text size="sm" c="dimmed">
              属性耐性: {item.resistances.join('・')}
            </Text>
            <Text size="sm" c="dimmed" style={{ overflowWrap: 'anywhere' }}>
              スキル: {formatEquipmentSkills(item.skills, skillById)}
            </Text>
          </Stack>
        ))}
      </Stack>

      <Stack gap="xs">
        <Text size="sm" fw={600}>
          必要素材
        </Text>
        {recipeGroups.length ? (
          <EquipmentMaterialGroups
            groups={recipeGroups.map(({ item, materials }) => ({
              key: item.game_id,
              label: (
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <Text size="sm" fw={600}>
                    {armorParts[item.part] ?? `部位 ${item.part}`}
                  </Text>
                  <Text size="sm" className="numeric-cell" style={{ flexShrink: 0 }}>
                    {item.price?.toLocaleString('ja-JP') ?? '不明'} z
                  </Text>
                </Group>
              ),
              materials,
            }))}
            itemById={itemById}
          />
        ) : (
          <Text size="sm" c="dimmed">
            生産レシピはありません
          </Text>
        )}
      </Stack>

      {upgradeMaterials.length > 0 && (
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            強化素材
          </Text>
          <EquipmentMaterialTable materials={upgradeMaterials} itemById={itemById} />
        </Stack>
      )}
    </Stack>
  );
}

function EquipmentDetail() {
  const { kind, id } = useParams();
  const {
    armor,
    amulets,
    weapons,
    decorations,
    skillById,
    itemById,
    armorRecipes,
    amuletRecipes,
    weaponRecipes,
    weaponTrees,
    armorSeries,
    armorUpgradeRecipes,
  } = useDatabase();
  const decodedId = id ? decodeURIComponent(id) : '';
  const requestedAmulet = kind === 'amulets' ? amulets.find((entry) => entry.game_id === decodedId) : undefined;
  const amuletType = requestedAmulet?.amulet_type ?? Number(decodedId);
  const amuletGroup: AmuletGroup = {
    amulet_type: amuletType,
    items: Number.isFinite(amuletType)
      ? amulets.filter((entry) => entry.amulet_type === amuletType).sort((a, b) => a.level - b.level)
      : [],
  };
  const equipment =
    kind === 'weapons'
      ? weapons.find((entry) => entry.game_id === decodedId)
      : kind === 'armor'
        ? armor.find((entry) => entry.game_id === decodedId)
        : kind === 'amulets'
          ? amuletGroup.items[0]
          : kind === 'decorations'
            ? decorations.find((entry) => String(entry.game_id) === decodedId)
            : undefined;
  if (!equipment) return <NotFoundPage />;

  const recipes =
    kind === 'weapons'
      ? weaponRecipes.filter((recipe) => recipe.weapon_id === decodedId)
      : kind === 'armor'
        ? armorRecipes.filter((recipe) => recipe.armor_id === decodedId)
        : kind === 'amulets'
          ? amuletRecipes.filter((recipe) => amuletGroup.items.some((item) => item.game_id === recipe.amulet_id))
          : [];
  const equipmentName = kind === 'amulets' ? amuletName(equipment as Amulet) : text(equipment.names);
  return (
    <Stack className="page-stack" gap="lg">
      <Stack gap="xs">
        <Group gap="xs">
          <Badge variant="light">
            {kind === 'weapons'
              ? (equipment as Weapon).category
              : kind === 'armor'
                ? '防具'
                : kind === 'amulets'
                  ? '護石'
                  : '装飾品'}
          </Badge>
          <Text size="lg" fw={600}>
            {equipmentName}
          </Text>
        </Group>
        <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>
          {text(equipment.descriptions)}
        </Text>
      </Stack>
      {kind === 'weapons' &&
        (() => {
          const item = equipment as Weapon;
          const hasTree = weaponTrees.some((edge) => edge.parent_id === item.game_id || edge.child_id === item.game_id);
          return (
            <>
              <WeaponDetailStats item={item} skillById={skillById} />
              <EquipmentRecipeSection recipes={recipes} itemById={itemById} />
              {hasTree && (
                <Stack gap="xs">
                  <Text size="sm" fw={600}>
                    派生
                  </Text>
                  <WeaponTreeView currentId={item.game_id} weapons={weapons} weaponTrees={weaponTrees} />
                </Stack>
              )}
            </>
          );
        })()}
      {kind === 'armor' &&
        (() => {
          const item = equipment as Armor;
          const series = armorSeries.find((entry) => entry.game_id === item.series_id);
          const upgradeMaterials =
            armorUpgradeRecipes.find((entry) => entry.series_id === item.series_id)?.materials ?? [];
          return (
            <>
              <ArmorDetailStats item={item} seriesName={series ? text(series.names) : '不明'} skillById={skillById} />
              <EquipmentRecipeSection recipes={recipes} itemById={itemById} />
              {upgradeMaterials.length > 0 && (
                <Stack gap="xs">
                  <Text size="sm" fw={600}>
                    強化素材
                  </Text>
                  <EquipmentMaterialTable materials={upgradeMaterials} itemById={itemById} />
                </Stack>
              )}
            </>
          );
        })()}
      {kind === 'amulets' && (
        <>
          <AmuletDetailStats group={amuletGroup} skillById={skillById} />
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              必要素材
            </Text>
            {recipes.length ? (
              <EquipmentMaterialGroups
                groups={[...recipes]
                  .sort((a, b) => (a.level ?? Number.MAX_SAFE_INTEGER) - (b.level ?? Number.MAX_SAFE_INTEGER))
                  .map((recipe) => {
                    const amulet = amuletGroup.items.find((item) => item.game_id === recipe.amulet_id);
                    return {
                      key: recipe.amulet_id ?? recipe.level ?? 'unknown',
                      label: (
                        <Group justify="space-between" gap="xs" wrap="nowrap">
                          <Text size="sm" fw={600}>
                            レベル {recipe.level ?? '不明'}
                          </Text>
                          <Text size="sm" className="numeric-cell" style={{ flexShrink: 0 }}>
                            {amulet?.price.toLocaleString('ja-JP') ?? '不明'} z
                          </Text>
                        </Group>
                      ),
                      materials: recipe.materials,
                    };
                  })}
                itemById={itemById}
              />
            ) : (
              <Text size="sm" c="dimmed">
                生産レシピはありません
              </Text>
            )}
          </Stack>
        </>
      )}
      {kind === 'decorations' && <DecorationDetailStats item={equipment as Decoration} skillById={skillById} />}
    </Stack>
  );
}

export function EquipmentPage() {
  const { kind, id } = useParams();
  return id ? kind === 'armor' ? <ArmorSeriesDetail /> : <EquipmentDetail /> : <EquipmentList />;
}
