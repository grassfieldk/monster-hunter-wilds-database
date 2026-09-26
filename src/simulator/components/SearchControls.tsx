import { Button, Group, Paper, Select, Stack, Text } from '@mantine/core';
import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import { text } from '../../data';
import type { Skill } from '../../types';
import { decorationTypeForSlot, type GearData, type SkillTarget, type SortMode } from '../model';
import type { SearchProgress } from '../search';

type Props = {
  data: GearData;
  skills: Skill[];
  availableLevels: Map<number, number[]>;
  targets: SkillTarget[];
  setTargets: Dispatch<SetStateAction<SkillTarget[]>>;
  sort: SortMode;
  setSort: Dispatch<SetStateAction<SortMode>>;
  weaponType: string | null;
  setWeaponType: Dispatch<SetStateAction<string | null>>;
  searching: boolean;
  progress: SearchProgress | null;
  onSearch: () => void;
  onCancel: () => void;
};

export function SearchControls({
  data,
  skills,
  availableLevels,
  targets,
  setTargets,
  sort,
  setSort,
  weaponType,
  setWeaponType,
  searching,
  progress,
  onSearch,
  onCancel,
}: Props) {
  const { weapons, armor, amulets, decorations, artianSkills, maxSkillLevels } = data;
  const [skillCategory, setSkillCategory] = useState<'weapon' | 'armor'>('armor');
  const skillOptions = useMemo(
    () =>
      skills
        .filter((item) => maxSkillLevels[item.game_id] > 0 && !text(item.names).startsWith('#Rejected#'))
        .map((item) => ({ value: String(item.game_id), label: text(item.names) }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ja')),
    [skills, maxSkillLevels],
  );
  const weaponSkillIds = useMemo(
    () =>
      new Set([
        ...weapons.flatMap((item) => item.skills.map((skill) => skill.skill_id)),
        ...decorations
          .filter((item) => item.type === decorationTypeForSlot('weapon'))
          .flatMap((item) => item.skills.map((skill) => skill.skill_id)),
      ]),
    [weapons, decorations],
  );
  const armorSkillIds = useMemo(
    () =>
      new Set([
        ...armor.flatMap((item) => item.skills.map((skill) => skill.skill_id)),
        ...amulets.flatMap((item) => item.skills.map((skill) => skill.skill_id)),
        ...decorations
          .filter((item) => item.type === decorationTypeForSlot('head'))
          .flatMap((item) => item.skills.map((skill) => skill.skill_id)),
        ...artianSkills.skillPairs.flatMap((pair) => [pair.groupSkillId, pair.seriesSkillId]),
      ]),
    [armor, amulets, decorations, artianSkills],
  );
  const categorizedSkillOptions = skillOptions.filter((item) =>
    (skillCategory === 'weapon' ? weaponSkillIds : armorSkillIds).has(Number(item.value)),
  );
  const weaponTypeOptions = useMemo(
    () =>
      [...new Map(weapons.map((item) => [item.weapon_type, item.category])).entries()].map(([value, label]) => ({
        value,
        label,
      })),
    [weapons],
  );

  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Text fw={600}>スキル条件から検索</Text>
        <Group gap="xs">
          <Button
            size="xs"
            variant={skillCategory === 'armor' ? 'filled' : 'light'}
            onClick={() => setSkillCategory('armor')}
          >
            防具系スキル
          </Button>
          <Button
            size="xs"
            variant={skillCategory === 'weapon' ? 'filled' : 'light'}
            onClick={() => setSkillCategory('weapon')}
          >
            武器系スキル
          </Button>
        </Group>
        {targets.map((target, index) => (
          <Group key={index} gap="xs" align="end" wrap="nowrap">
            <Select
              label={index === 0 ? 'スキル' : undefined}
              placeholder="スキルを選択"
              searchable
              clearable
              data={
                target.id && !categorizedSkillOptions.some((option) => option.value === String(target.id))
                  ? [...categorizedSkillOptions, ...skillOptions.filter((option) => option.value === String(target.id))]
                  : categorizedSkillOptions
              }
              value={target.id ? String(target.id) : null}
              onChange={(value) =>
                setTargets((current) =>
                  current.map((entry, at) =>
                    at === index ? { id: Number(value), level: availableLevels.get(Number(value))?.[0] ?? 1 } : entry,
                  ),
                )
              }
              style={{ flex: 1 }}
            />
            <Select
              label={index === 0 ? '必要 Lv' : undefined}
              data={(availableLevels.get(target.id) ?? [1]).map((level) => ({
                value: String(level),
                label: String(level),
              }))}
              value={String(target.level)}
              onChange={(value) =>
                setTargets((current) =>
                  current.map((entry, at) => (at === index ? { ...entry, level: Number(value) || 1 } : entry)),
                )
              }
              w={92}
            />
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setTargets((current) => current.filter((_, at) => at !== index))}
            >
              削除
            </Button>
          </Group>
        ))}
        <Group gap="sm">
          <Button variant="light" onClick={() => setTargets((current) => [...current, { id: 0, level: 1 }])}>
            スキルを追加
          </Button>
          <Select
            aria-label="武器種"
            placeholder="全武器種"
            clearable
            searchable
            data={weaponTypeOptions}
            value={weaponType}
            onChange={setWeaponType}
            w={180}
          />
          <Select
            aria-label="候補の優先順位"
            data={[
              { value: 'slots', label: '空きスロット優先' },
              { value: 'defense', label: '防御・耐性優先' },
            ]}
            value={sort}
            onChange={(value) => setSort(value === 'defense' ? 'defense' : 'slots')}
            w={180}
          />
          <Button onClick={onSearch} loading={searching}>
            検索
          </Button>
          {searching && (
            <Button variant="light" color="gray" onClick={onCancel}>
              中断
            </Button>
          )}
        </Group>
        {searching && (
          <Text size="sm">
            {progress?.stage === 'preparing' ? '候補を準備中' : '検索中'}　確認した件数{' '}
            {progress?.visited.toLocaleString() ?? 0} 件
          </Text>
        )}
        <Text size="xs" c="dimmed">
          条件を満たす装備の上位 30 件を表示します。空き枠・防御力が同じ候補では、指定外スキルの有用性も比較します
        </Text>
      </Stack>
    </Paper>
  );
}
