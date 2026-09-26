import { Button, Group, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import { type Dispatch, type SetStateAction, useMemo } from 'react';
import { OptionPicker } from '../../components/OptionPicker';
import { SkillDescriptionTooltip } from '../../components/SkillDescriptionTooltip';
import { text } from '../../data';
import type { Skill, SkillLevel } from '../../types';
import {
  armorSlots,
  type Build,
  decorationTypeForSlot,
  type EquipmentSlot,
  equipmentSlots,
  formatSlotLevels,
  type GearData,
  isVirtualAmulet,
  isVirtualWeapon,
  selectedGear,
  summarizeBuild,
} from '../model';
import { ArtianBonusEditor } from './ArtianBonusEditor';
import { ArtianSkillEditor } from './ArtianSkillEditor';
import { RandomAmuletEditor } from './RandomAmuletEditor';
import { SkillLevelMarks, skillSlotCount } from './SkillLevelMarks';

const slotLabels: Record<EquipmentSlot, string> = {
  weapon: '武器',
  head: '頭',
  chest: '胴',
  arms: '腕',
  waist: '腰',
  legs: '脚',
  amulet: '護石',
};

type Props = {
  build: Build;
  setBuild: Dispatch<SetStateAction<Build>>;
  data: GearData;
  skillById: Map<number, Skill>;
  skillLevels: SkillLevel[];
  availableLevels: Map<number, number[]>;
  unusableSkillIds: Set<number>;
  onShare: () => void;
};

export function BuildEditor({
  build,
  setBuild,
  data,
  skillById,
  skillLevels,
  availableLevels,
  unusableSkillIds,
  onShare,
}: Props) {
  const { weapons, armor, amulets, decorations } = data;
  const slotCount = skillSlotCount(availableLevels);
  const summary = useMemo(() => summarizeBuild(build, data), [build, data]);
  const equipped = useMemo(() => selectedGear(build, data), [build, data]);
  const weaponGroups = useMemo(
    () => [...new Set(weapons.map((item) => item.category))].map((category) => ({ value: category, label: category })),
    [weapons],
  );
  const gearOptions = useMemo(
    () => ({
      weapon: [
        ...weapons.map((item) => ({ value: item.game_id, label: text(item.names), group: item.category })),
        ...(isVirtualWeapon(equipped.weapon)
          ? [{ value: equipped.weapon.game_id, label: text(equipped.weapon.names), group: equipped.weapon.category }]
          : []),
      ],
      head: armor.filter((item) => item.part === 0).map((item) => ({ value: item.game_id, label: text(item.names) })),
      chest: armor.filter((item) => item.part === 1).map((item) => ({ value: item.game_id, label: text(item.names) })),
      arms: armor.filter((item) => item.part === 2).map((item) => ({ value: item.game_id, label: text(item.names) })),
      waist: armor.filter((item) => item.part === 3).map((item) => ({ value: item.game_id, label: text(item.names) })),
      legs: armor.filter((item) => item.part === 4).map((item) => ({ value: item.game_id, label: text(item.names) })),
      amulet: [
        ...amulets.map((item) => ({ value: item.game_id, label: text(item.names) })),
        ...(isVirtualAmulet(equipped.amulet)
          ? [{ value: equipped.amulet.game_id, label: text(equipped.amulet.names) }]
          : []),
      ],
    }),
    [weapons, armor, amulets, equipped],
  );
  const decorationOptions = useMemo(
    () =>
      new Map(
        [...new Set(decorations.map((item) => item.type))].map((type) => [
          type,
          decorations.filter((item) => item.type === type),
        ]),
      ),
    [decorations],
  );
  const skillEffects = useMemo(
    () => new Map(skillLevels.map((level) => [`${level.skill_id}:${level.level}`, text(level.descriptions)])),
    [skillLevels],
  );
  const activeLevel = (id: number, level: number) =>
    availableLevels
      .get(id)
      ?.filter((value) => value <= level)
      .at(-1) ?? null;

  const updateGear = (slot: EquipmentSlot, id: string | null) => {
    setBuild((current) => ({
      ...current,
      [slot]: id,
      weaponBonuses: slot === 'weapon' ? [] : current.weaponBonuses,
      decorations: { ...current.decorations, [slot]: [] },
    }));
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" align="start">
        <Text fw={600}>装備を組む</Text>
        <Button size="xs" variant="light" onClick={onShare}>
          URL をコピー
        </Button>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        {equipmentSlots.map((slot) => {
          const item =
            slot === 'weapon'
              ? equipped.weapon
              : slot === 'amulet'
                ? equipped.amulet
                : equipped.armor[armorSlots.indexOf(slot)];
          const levels = item && 'slots' in item ? item.slots.filter((level) => level > 0) : [];
          return (
            <Stack key={slot} gap="xs">
              <OptionPicker
                className="simulator-gear-select"
                label={slotLabels[slot]}
                placeholder={`${slotLabels[slot]}を選択`}
                clearable
                groups={slot === 'weapon' ? weaponGroups : undefined}
                data={gearOptions[slot]}
                value={build[slot]}
                onChange={(value) => updateGear(slot, value)}
              />
              {levels.map((level, index) => (
                <OptionPicker
                  key={index}
                  size="xs"
                  label={`装飾品 ${index + 1}（${level}）`}
                  clearable
                  data={(
                    decorationOptions.get(
                      slot === 'amulet' && isVirtualAmulet(item) ? item.slotTypes[index] : decorationTypeForSlot(slot),
                    ) ?? []
                  )
                    .filter((deco) => deco.required_slot <= level)
                    .map((deco) => ({ value: String(deco.game_id), label: text(deco.names) }))}
                  value={build.decorations[slot]?.[index] == null ? null : String(build.decorations[slot]?.[index])}
                  onChange={(value) =>
                    setBuild((current) => {
                      const ids = [...(current.decorations[slot] ?? [])];
                      ids[index] = value === null ? null : Number(value);
                      return { ...current, decorations: { ...current.decorations, [slot]: ids } };
                    })
                  }
                />
              ))}
            </Stack>
          );
        })}
      </SimpleGrid>
      <ArtianSkillEditor build={build} setBuild={setBuild} data={data} weapon={equipped.weapon} />
      <RandomAmuletEditor build={build} setBuild={setBuild} data={data} />
      <ArtianBonusEditor build={build} setBuild={setBuild} data={data} weapon={equipped.weapon} />
      <Group gap="lg">
        <Text size="sm">防御力 {summary.defense}</Text>
        <Text size="sm">耐性 {summary.resistances.join(' / ')}</Text>
        <Text size="sm">空きスロット {formatSlotLevels(summary.freeSlots)}</Text>
      </Group>
      <Text size="xs" c="dimmed">
        防御力は防具の強化前の値です
      </Text>
      {equipped.weapon && (
        <Group gap="lg">
          <Text size="sm">攻撃力 {summary.attack}</Text>
          <Text size="sm">会心率 {summary.affinity}%</Text>
          <Text size="sm">属性値 {summary.attributeValue}</Text>
          {summary.sharpnessBonus > 0 && <Text size="sm">斬れ味強化 +{summary.sharpnessBonus}</Text>}
        </Group>
      )}
      <Table withTableBorder withColumnBorders>
        <Table.Tbody>
          {[...summary.skills]
            .sort((a, b) => text(skillById.get(a[0])?.names).localeCompare(text(skillById.get(b[0])?.names), 'ja'))
            .map(([id, level]) => (
              <Table.Tr key={id} className={unusableSkillIds.has(id) ? 'simulator-skill-unusable' : undefined}>
                <Table.Td>
                  <SkillDescriptionTooltip skillId={id} level={activeLevel(id, level) ?? level}>
                    {text(skillById.get(id)?.names) || `ID ${id}`}
                  </SkillDescriptionTooltip>
                </Table.Td>
                <Table.Td>
                  <SkillLevelMarks
                    level={activeLevel(id, level) ?? 0}
                    maxLevel={availableLevels.get(id)?.at(-1) ?? level}
                    slotCount={slotCount}
                  />
                </Table.Td>
                <Table.Td>
                  {activeLevel(id, level) === null
                    ? '未発動'
                    : (skillEffects.get(`${id}:${activeLevel(id, level)}`) ?? '')}
                </Table.Td>
              </Table.Tr>
            ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
