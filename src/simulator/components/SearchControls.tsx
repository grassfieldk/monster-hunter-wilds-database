import { Button, Checkbox, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { type Dispatch, type SetStateAction, useMemo } from 'react';
import { OptionPicker } from '../../components/OptionPicker';
import { text } from '../../data';
import type { Skill, SkillLevel, Weapon } from '../../types';
import { decorationTypeForSlot, type GearData, maxSeriesSkillTargets, type SkillTarget, type SortMode } from '../model';
import type { SearchProgress } from '../search';
import type { SearchCriteria } from '../searchPresets';
import { SavedSearchPresets } from './SavedSearchPresets';
import { type SkillOption, SkillTargetList } from './SkillTargetList';

type Props = {
  data: GearData;
  selectableWeapons: Weapon[];
  skills: Skill[];
  skillLevels: SkillLevel[];
  availableLevels: Map<number, number[]>;
  unusableSkillIds: Set<number>;
  weaponTargets: SkillTarget[];
  setWeaponTargets: Dispatch<SetStateAction<SkillTarget[]>>;
  armorTargets: SkillTarget[];
  setArmorTargets: Dispatch<SetStateAction<SkillTarget[]>>;
  seriesTargets: SkillTarget[];
  setSeriesTargets: Dispatch<SetStateAction<SkillTarget[]>>;
  sort: SortMode;
  setSort: Dispatch<SetStateAction<SortMode>>;
  weaponType: string | null;
  setWeaponType: Dispatch<SetStateAction<string | null>>;
  weaponId: string | null;
  setWeaponId: Dispatch<SetStateAction<string | null>>;
  includeMeldingOnly: boolean;
  setIncludeMeldingOnly: Dispatch<SetStateAction<boolean>>;
  includeArtian: boolean;
  setIncludeArtian: Dispatch<SetStateAction<boolean>>;
  searching: boolean;
  progress: SearchProgress | null;
  onSearch: () => void;
  onCancel: () => void;
  onLoadCriteria: (criteria: SearchCriteria) => void;
};

export function SearchControls({
  data,
  selectableWeapons,
  skills,
  skillLevels,
  availableLevels,
  unusableSkillIds,
  weaponTargets,
  setWeaponTargets,
  armorTargets,
  setArmorTargets,
  seriesTargets,
  setSeriesTargets,
  sort,
  setSort,
  weaponType,
  setWeaponType,
  weaponId,
  setWeaponId,
  includeMeldingOnly,
  setIncludeMeldingOnly,
  includeArtian,
  setIncludeArtian,
  searching,
  progress,
  onSearch,
  onCancel,
  onLoadCriteria,
}: Props) {
  const { weapons, armor, amulets, decorations, artianSkills, maxSkillLevels } = data;
  const skillOptions = useMemo(
    () =>
      skills
        .filter((item) => maxSkillLevels[item.game_id] > 0 && !text(item.names).startsWith('#Rejected#'))
        .map((item): SkillOption => {
          const description = text(item.descriptions);
          return {
            id: item.game_id,
            name: text(item.names),
            description: description.startsWith('#Rejected#') ? '' : description,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'ja')),
    [skills, maxSkillLevels],
  );
  const levelDescriptions = useMemo(
    () =>
      new Map(
        skillLevels.map((row) => {
          const description = text(row.descriptions);
          return [`${row.skill_id}:${row.level}`, description.startsWith('#Rejected#') ? '' : description] as const;
        }),
      ),
    [skillLevels],
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
  const seriesSkillIds = new Set(skills.filter((skill) => skill.category === 1).map((skill) => skill.game_id));
  const weaponSkillOptions = skillOptions.filter((item) => weaponSkillIds.has(item.id) && !seriesSkillIds.has(item.id));
  const armorSkillOptions = skillOptions.filter((item) => armorSkillIds.has(item.id) && !seriesSkillIds.has(item.id));
  const seriesSkillOptions = skillOptions.filter((item) => armorSkillIds.has(item.id) && seriesSkillIds.has(item.id));
  const weaponTypeOptions = useMemo(
    () =>
      [...new Map(weapons.map((item) => [item.weapon_type, item.category])).entries()].map(([value, label]) => ({
        value,
        label,
      })),
    [weapons],
  );
  const weaponOptions = useMemo(() => {
    const selected = selectableWeapons.filter((weapon) => weapon.weapon_type === weaponType);
    const names = selected.map((weapon) => text(weapon.names));
    return selected
      .map((weapon, index) => ({
        value: weapon.game_id,
        label:
          names.filter((name) => name === names[index]).length > 1
            ? `${names[index]}（攻撃 ${weapon.attack}・会心 ${weapon.affinity}%）`
            : names[index],
      }))
      .filter((option) => includeArtian || !artianSkills.weaponIds.includes(option.value))
      .sort((a, b) => a.label.localeCompare(b.label, 'ja'));
  }, [selectableWeapons, weaponType, includeArtian, artianSkills.weaponIds]);
  const criteria = useMemo(
    () => ({
      weaponTargets,
      armorTargets,
      seriesTargets,
      sort,
      weaponType,
      weaponId,
      includeMeldingOnly,
      includeArtian,
    }),
    [weaponTargets, armorTargets, seriesTargets, sort, weaponType, weaponId, includeMeldingOnly, includeArtian],
  );

  return (
    <Stack gap="sm">
      <Text>検索条件</Text>
      <SimpleGrid cols={{ base: 2, sm: 2 }} spacing="sm" className="simulator-search-settings">
        <OptionPicker
          label="武器種"
          placeholder="全武器種"
          clearable
          data={weaponTypeOptions}
          value={weaponType}
          onChange={(value) => {
            setWeaponType(value);
            setWeaponId(null);
          }}
          buttonClassName="simulator-compact-select"
          style={{ width: '100%' }}
        />
        <OptionPicker
          label="武器"
          placeholder="指定なし"
          clearable
          disabled={!weaponType}
          data={weaponOptions}
          value={weaponId}
          onChange={setWeaponId}
          buttonClassName="simulator-compact-select"
          style={{ width: '100%' }}
        />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 2, sm: 2 }} spacing="sm" className="simulator-skill-targets">
        <SkillTargetList
          title="武器系スキル"
          options={weaponSkillOptions}
          targets={weaponTargets}
          setTargets={setWeaponTargets}
          availableLevels={availableLevels}
          unusableSkillIds={unusableSkillIds}
          levelDescriptions={levelDescriptions}
        />
        <SkillTargetList
          title="防具系スキル"
          options={armorSkillOptions}
          targets={armorTargets}
          setTargets={setArmorTargets}
          availableLevels={availableLevels}
          unusableSkillIds={unusableSkillIds}
          levelDescriptions={levelDescriptions}
        />
      </SimpleGrid>
      <SkillTargetList
        title="シリーズスキル"
        options={seriesSkillOptions}
        targets={seriesTargets}
        setTargets={setSeriesTargets}
        maxTargets={maxSeriesSkillTargets}
        availableLevels={availableLevels}
        unusableSkillIds={unusableSkillIds}
        levelDescriptions={levelDescriptions}
      />
      <Stack gap={4}>
        <Text size="sm">ランダム装備</Text>
        <div className="simulator-random-equipment-control">
          <Group gap="xs" wrap="nowrap">
            <Checkbox
              size="xs"
              label="錬金装飾"
              checked={includeMeldingOnly}
              onChange={(event) => setIncludeMeldingOnly(event.currentTarget.checked)}
            />
            <Checkbox
              size="xs"
              label="アーティア"
              checked={includeArtian}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setIncludeArtian(checked);
                if (!checked && weaponId && artianSkills.weaponIds.includes(weaponId)) setWeaponId(null);
              }}
            />
          </Group>
        </div>
      </Stack>
      <SavedSearchPresets criteria={criteria} onLoad={onLoadCriteria} />
      <SimpleGrid cols={{ base: 2, sm: 2 }} spacing="sm" className="simulator-search-actions">
        <Button
          onClick={searching ? onCancel : onSearch}
          variant={searching ? 'light' : 'filled'}
          color={searching ? 'gray' : undefined}
          className="simulator-search-button"
        >
          {searching ? '中断' : '検索'}
        </Button>
        <OptionPicker
          ariaLabel="候補の優先順位"
          data={[
            { value: 'slots', label: '空き枠優先' },
            { value: 'defense', label: '防御・耐性優先' },
          ]}
          value={sort}
          onChange={(value) => setSort(value === 'defense' ? 'defense' : 'slots')}
          buttonClassName="simulator-compact-select"
          style={{ width: '100%' }}
        />
      </SimpleGrid>
      {(searching || progress) && (
        <Text size="sm">
          検索済: {progress?.visited.toLocaleString() ?? 0} 件、ヒット:{' '}
          {progress?.limitReached
            ? '200 件以上'
            : `${progress?.found.toLocaleString() ?? 0} 件${progress?.lowerBound && progress.found ? '以上' : ''}`}
        </Text>
      )}
      <Text size="xs" c="dimmed">
        空き枠・防御力が同じ候補では、指定外スキルの有用性も比較します
      </Text>
    </Stack>
  );
}
