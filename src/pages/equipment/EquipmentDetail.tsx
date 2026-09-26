import { Badge, Box, Group, Stack, Table, Text } from '@mantine/core';
import { useParams } from 'react-router-dom';
import {
  EquipmentMaterialGroups,
  EquipmentMaterialTable,
  EquipmentRecipeSection,
} from '../../components/EquipmentMaterials';
import { EquipmentSkills, SkillDescriptionTooltip } from '../../components/SkillDescriptionTooltip';
import { text, useDatabase } from '../../data';
import { weaponAttributeLabel } from '../../labels';
import type { Amulet, Armor, Decoration, EquipmentSkill, Skill, Weapon } from '../../types';
import { NotFoundPage } from '../NotFoundPage';
import { type AmuletGroup, AmuletLevelMarks, AmuletSkills, amuletName } from './amulets';
import { EquipmentStats } from './EquipmentStats';
import { armorParts } from './equipmentConstants';
import { WeaponTreeView } from './WeaponTreeView';

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
        { label: 'スキル', value: <EquipmentSkills skills={item.skills} skillById={skillById} /> },
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
        { label: 'スキル', value: <EquipmentSkills skills={item.skills} skillById={skillById} /> },
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
                  {skill ? (
                    <SkillDescriptionTooltip skillId={skill.skill_id} level={skill.level}>
                      {text(skillById.get(skill.skill_id)?.names)} Lv {skill.level}
                    </SkillDescriptionTooltip>
                  ) : (
                    ''
                  )}
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
        { label: 'スキル', value: <AmuletSkills items={group.items} skillById={skillById} /> },
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
        { label: 'スキル', value: <EquipmentSkills skills={item.skills} skillById={skillById} /> },
      ]}
    />
  );
}

export function ArmorSeriesDetail() {
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
                <Table.Td>
                  <EquipmentSkills skills={item.skills} skillById={skillById} />
                </Table.Td>
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
              スキル: <EquipmentSkills skills={item.skills} skillById={skillById} />
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

export function EquipmentDetail() {
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
