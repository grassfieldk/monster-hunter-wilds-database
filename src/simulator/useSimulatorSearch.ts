import { useEffect, useRef, useState } from 'react';
import { type GearData, maxSeriesSkillTargets, type SkillTarget, type SortMode } from './model';
import type { SearchProgress, SearchResult } from './search';
import { readSavedSearch, saveSearch } from './searchPersistence';

export function useSimulatorSearch(data: GearData, seriesSkillIds: Set<number>) {
  const { maxSkillLevels } = data;
  const [saved] = useState(readSavedSearch);
  const [weaponTargets, setWeaponTargets] = useState<SkillTarget[]>(saved?.weaponTargets ?? []);
  const [armorTargets, setArmorTargets] = useState<SkillTarget[]>(
    saved?.armorTargets.filter((target) => !seriesSkillIds.has(target.id)) ?? [],
  );
  const [seriesTargets, setSeriesTargets] = useState<SkillTarget[]>(
    [
      ...(saved?.seriesTargets ?? []),
      ...(saved?.armorTargets.filter((target) => seriesSkillIds.has(target.id)) ?? []),
    ].slice(0, maxSeriesSkillTargets),
  );
  const [searchedTargets, setSearchedTargets] = useState<SkillTarget[]>(saved?.searchedTargets ?? []);
  const [sort, setSort] = useState<SortMode>(saved?.sort ?? 'slots');
  const [weaponType, setWeaponType] = useState<string | null>(saved?.weaponType ?? null);
  const [includeMeldingOnly, setIncludeMeldingOnly] = useState(saved?.includeMeldingOnly ?? false);
  const [progress, setProgress] = useState<SearchProgress | null>(saved?.progress ?? null);
  const [results, setResults] = useState<SearchResult[]>(saved?.results ?? []);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState(
    saved?.searching ? 'リロードにより検索を中断しました' : (saved?.message ?? ''),
  );
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  useEffect(() => {
    saveSearch({
      weaponTargets,
      armorTargets,
      seriesTargets,
      searchedTargets,
      sort,
      weaponType,
      includeMeldingOnly,
      progress,
      results,
      searching,
      message:
        message === '探索した候補には、条件を満たす装備がありませんでした' || message.includes('中断しました')
          ? message
          : '',
    });
  }, [
    weaponTargets,
    armorTargets,
    seriesTargets,
    searchedTargets,
    sort,
    weaponType,
    includeMeldingOnly,
    progress,
    results,
    searching,
    message,
  ]);
  const startSearch = () => {
    setProgress(null);
    setResults([]);
    const selected = [
      ...[...weaponTargets, ...armorTargets, ...seriesTargets]
        .filter((target) => Number.isSafeInteger(target.id) && target.level > 0)
        .reduce(
          (map, target) =>
            map.set(target.id, { id: target.id, level: Math.max(target.level, map.get(target.id)?.level ?? 0) }),
          new Map<number, SkillTarget>(),
        )
        .values(),
    ];
    const selectedSeries = [
      ...seriesTargets
        .slice(0, maxSeriesSkillTargets)
        .filter((target) => Number.isSafeInteger(target.id) && target.level > 0)
        .reduce(
          (map, target) =>
            map.set(target.id, { id: target.id, level: Math.max(target.level, map.get(target.id)?.level ?? 0) }),
          new Map<number, SkillTarget>(),
        )
        .values(),
    ];
    if (!selected.length) {
      setMessage('検索するスキルを指定してください');
      return;
    }
    if (selected.some((target) => target.level > (maxSkillLevels[target.id] ?? 0))) {
      setMessage('指定されたスキルの最大 Lv を超えています');
      return;
    }
    worker.current?.terminate();
    setSearchedTargets(selected);
    setSearching(true);
    setMessage('');
    const next = new Worker(new URL('../simulator/search.worker.ts', import.meta.url), { type: 'module' });
    worker.current = next;
    next.onmessage = (
      event: MessageEvent<{
        results?: SearchResult[];
        error?: string;
        progress?: SearchProgress;
      }>,
    ) => {
      if (worker.current !== next) return;
      if (event.data.progress) {
        setProgress(event.data.progress);
        if (event.data.progress.results) setResults(event.data.progress.results);
        return;
      }
      setSearching(false);
      if (event.data.error) setMessage(event.data.error);
      else {
        setResults(event.data.results ?? []);
        if (!event.data.results?.length) setMessage('探索した候補には、条件を満たす装備がありませんでした');
      }
      next.terminate();
      if (worker.current === next) worker.current = null;
    };
    next.onerror = () => {
      if (worker.current !== next) return;
      setSearching(false);
      setMessage('検索に失敗しました');
      next.terminate();
      if (worker.current === next) worker.current = null;
    };
    next.postMessage({
      data,
      targets: selected,
      sort,
      weaponType,
      weaponRequired: weaponTargets.length > 0,
      includeMeldingOnly,
      seriesTargets: selectedSeries,
    });
  };
  const cancelSearch = () => {
    worker.current?.terminate();
    worker.current = null;
    setSearching(false);
    setMessage('検索を中断しました');
  };

  return {
    weaponTargets,
    setWeaponTargets,
    armorTargets,
    setArmorTargets,
    seriesTargets,
    setSeriesTargets,
    searchedTargets,
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
  };
}
