import { Alert, Stack } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { BuildEditor } from '../simulator/components/BuildEditor';
import { SearchControls } from '../simulator/components/SearchControls';
import { SearchResults } from '../simulator/components/SearchResults';
import type { Build } from '../simulator/model';
import { skillUsable } from '../simulator/relevance';
import { readSharedBuild } from '../simulator/share';
import { useSimulatorSearch } from '../simulator/useSimulatorSearch';

export function SimulatorPage() {
  const {
    weapons,
    armor,
    amulets,
    decorations,
    decorationProbabilities,
    skills,
    skillLevels,
    randomAmulets,
    artianSkills,
    skillById,
  } = useDatabase();
  const maxSkillLevels = useMemo(
    () =>
      Object.fromEntries(
        skillLevels.reduce(
          (map, row) => map.set(row.skill_id, Math.max(map.get(row.skill_id) ?? 0, row.level)),
          new Map<number, number>(),
        ),
      ),
    [skillLevels],
  );
  const availableLevels = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const row of skillLevels) map.set(row.skill_id, [...(map.get(row.skill_id) ?? []), row.level]);
    for (const levels of map.values()) levels.sort((a, b) => a - b);
    return map;
  }, [skillLevels]);
  const skillNames = useMemo(
    () => Object.fromEntries(skills.map((skill) => [skill.game_id, text(skill.names)])),
    [skills],
  );
  const data = useMemo(
    () => ({
      weapons,
      armor,
      amulets,
      decorations,
      maxSkillLevels,
      skillNames,
      randomAmulets,
      artianSkills,
      meldingOnlyDecorationIds: decorationProbabilities
        .filter((row) => row.probabilities.every((probability) => probability === 0))
        .map((row) => row.accessory_id),
    }),
    [
      weapons,
      armor,
      amulets,
      decorations,
      decorationProbabilities,
      maxSkillLevels,
      skillNames,
      randomAmulets,
      artianSkills,
    ],
  );
  const seriesSkillIds = useMemo(
    () => new Set(skills.filter((skill) => skill.category === 1).map((skill) => skill.game_id)),
    [skills],
  );
  const [params, setParams] = useSearchParams();
  const sharedBuild = params.get('build');
  const [build, setBuild] = useState<Build>(() => readSharedBuild(sharedBuild));
  useEffect(() => setBuild(readSharedBuild(sharedBuild)), [sharedBuild]);
  const {
    weaponTargets,
    setWeaponTargets,
    armorTargets,
    setArmorTargets,
    sort,
    setSort,
    weaponType,
    setWeaponType,
    includeMeldingOnly,
    setIncludeMeldingOnly,
    progress,
    results,
    searching,
    message,
    setMessage,
    startSearch,
    cancelSearch,
    seriesTargets,
    setSeriesTargets,
    searchedTargets,
  } = useSimulatorSearch(data, seriesSkillIds);
  const unusableSkillIds = useMemo(() => {
    if (!weaponType) return new Set<number>();
    const selectedWeapons = weapons.filter((weapon) => weapon.weapon_type === weaponType);
    return new Set(
      skills
        .filter((skill) => !selectedWeapons.some((weapon) => skillUsable(text(skill.names), weapon)))
        .map((skill) => skill.game_id),
    );
  }, [weaponType, weapons, skills]);

  const share = async () => {
    const next = new URLSearchParams(params);
    next.set('build', JSON.stringify(build));
    setParams(next);
    const url = new URL(window.location.href);
    url.search = next.toString();
    try {
      await navigator.clipboard.writeText(url.toString());
      setMessage('装備の URL をコピーしました');
    } catch {
      setMessage('URL をコピーできませんでした');
    }
  };

  return (
    <Stack className="page-stack" gap="lg">
      <SearchControls
        data={data}
        skills={skills}
        skillLevels={skillLevels}
        availableLevels={availableLevels}
        unusableSkillIds={unusableSkillIds}
        weaponTargets={weaponTargets}
        setWeaponTargets={setWeaponTargets}
        armorTargets={armorTargets}
        setArmorTargets={setArmorTargets}
        seriesTargets={seriesTargets}
        setSeriesTargets={setSeriesTargets}
        sort={sort}
        setSort={setSort}
        weaponType={weaponType}
        setWeaponType={setWeaponType}
        includeMeldingOnly={includeMeldingOnly}
        setIncludeMeldingOnly={setIncludeMeldingOnly}
        searching={searching}
        progress={progress}
        onSearch={startSearch}
        onCancel={cancelSearch}
      />
      {message && <Alert>{message}</Alert>}
      <SearchResults
        results={results}
        searchedTargets={searchedTargets}
        data={data}
        skillById={skillById}
        availableLevels={availableLevels}
        unusableSkillIds={unusableSkillIds}
        limitReached={progress?.limitReached ?? false}
        searching={searching}
        onEdit={setBuild}
      />
      <BuildEditor
        build={build}
        setBuild={setBuild}
        data={data}
        skillById={skillById}
        skillLevels={skillLevels}
        availableLevels={availableLevels}
        unusableSkillIds={unusableSkillIds}
        onShare={share}
      />
    </Stack>
  );
}
