import { Alert, Stack, Title } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { BuildEditor } from '../simulator/components/BuildEditor';
import { SearchControls } from '../simulator/components/SearchControls';
import { SearchResults } from '../simulator/components/SearchResults';
import type { Build } from '../simulator/model';
import { readSharedBuild } from '../simulator/share';
import { useSimulatorSearch } from '../simulator/useSimulatorSearch';

export function SimulatorPage() {
  const { weapons, armor, amulets, decorations, skills, skillLevels, randomAmulets, artianSkills, skillById } =
    useDatabase();
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
    () => ({ weapons, armor, amulets, decorations, maxSkillLevels, skillNames, randomAmulets, artianSkills }),
    [weapons, armor, amulets, decorations, maxSkillLevels, skillNames, randomAmulets, artianSkills],
  );
  const [params, setParams] = useSearchParams();
  const sharedBuild = params.get('build');
  const [build, setBuild] = useState<Build>(() => readSharedBuild(sharedBuild));
  useEffect(() => setBuild(readSharedBuild(sharedBuild)), [sharedBuild]);
  const {
    targets,
    setTargets,
    sort,
    setSort,
    weaponType,
    setWeaponType,
    progress,
    results,
    searching,
    message,
    setMessage,
    startSearch,
    cancelSearch,
  } = useSimulatorSearch(data);

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
      <Title order={1} size="h3">
        装備シミュレータ
      </Title>
      <SearchControls
        data={data}
        skills={skills}
        availableLevels={availableLevels}
        targets={targets}
        setTargets={setTargets}
        sort={sort}
        setSort={setSort}
        weaponType={weaponType}
        setWeaponType={setWeaponType}
        searching={searching}
        progress={progress}
        onSearch={startSearch}
        onCancel={cancelSearch}
      />
      {message && <Alert>{message}</Alert>}
      <SearchResults
        results={results}
        data={data}
        skillById={skillById}
        availableLevels={availableLevels}
        onEdit={setBuild}
      />
      <BuildEditor
        build={build}
        setBuild={setBuild}
        data={data}
        skillById={skillById}
        skillLevels={skillLevels}
        availableLevels={availableLevels}
        onShare={share}
      />
    </Stack>
  );
}
