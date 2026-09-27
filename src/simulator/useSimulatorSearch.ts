import { useEffect, useRef, useState } from 'react';
import { type GearData, maxSeriesSkillTargets, type SkillTarget, type SortMode } from './model';
import type { SearchProgress, SearchResult } from './search';
import { readSavedSearch, saveSearch } from './searchPersistence';
import type { SearchCriteria } from './searchPresets';

const searchTimeoutMs = 30_000;

export function useSimulatorSearch(data: GearData, seriesSkillIds: Set<number>) {
  const { maxSkillLevels } = data;
  const validWeaponId = (weaponType: string | null, weaponId: string | null, includeArtian: boolean) =>
    weaponId &&
    data.weapons.some((weapon) => weapon.game_id === weaponId && weapon.weapon_type === weaponType) &&
    (includeArtian || !data.artianSkills.weaponIds.includes(weaponId))
      ? weaponId
      : null;
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
  const [weaponId, setWeaponId] = useState<string | null>(() =>
    validWeaponId(saved?.weaponType ?? null, saved?.weaponId ?? null, saved?.includeArtian ?? true),
  );
  const [includeMeldingOnly, setIncludeMeldingOnly] = useState(saved?.includeMeldingOnly ?? false);
  const [includeArtian, setIncludeArtian] = useState(saved?.includeArtian ?? true);
  const [progress, setProgress] = useState<SearchProgress | null>(saved?.progress ?? null);
  const [results, setResults] = useState<SearchResult[]>(saved?.results ?? []);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState(
    saved?.searching ? 'リロードにより検索を中断しました' : (saved?.message ?? ''),
  );
  const worker = useRef<Worker | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultCount = useRef(results.length);
  const stopWorker = () => {
    if (timeout.current !== null) clearTimeout(timeout.current);
    timeout.current = null;
    worker.current?.terminate();
    worker.current = null;
  };
  useEffect(
    () => () => {
      worker.current?.terminate();
      if (timeout.current !== null) clearTimeout(timeout.current);
    },
    [],
  );
  useEffect(() => {
    saveSearch({
      weaponTargets,
      armorTargets,
      seriesTargets,
      searchedTargets,
      sort,
      weaponType,
      weaponId,
      includeMeldingOnly,
      includeArtian,
      progress,
      results,
      searching,
      message:
        message === '探索した候補には、条件を満たす装備がありませんでした' ||
        message.includes('中断しました') ||
        message.includes('時間上限')
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
    weaponId,
    includeMeldingOnly,
    includeArtian,
    progress,
    results,
    searching,
    message,
  ]);
  const startSearch = () => {
    setProgress(null);
    setResults([]);
    resultCount.current = 0;
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
    stopWorker();
    setSearchedTargets(selected);
    setSearching(true);
    setMessage('');
    const next = new Worker(new URL('../simulator/search.worker.ts', import.meta.url), { type: 'module' });
    worker.current = next;
    timeout.current = setTimeout(() => {
      if (worker.current !== next) return;
      stopWorker();
      setSearching(false);
      setProgress((current) => ({
        stage: 'searching',
        visited: current?.visited ?? 0,
        found: current?.found ?? resultCount.current,
        lowerBound: true,
      }));
      setMessage(
        resultCount.current
          ? '検索を時間上限で終了しました。見つかった候補のみ表示しています'
          : '検索を時間上限で終了しました。時間内に候補は見つかりませんでした',
      );
    }, searchTimeoutMs);
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
        if (event.data.progress.results) {
          resultCount.current = event.data.progress.results.length;
          setResults(event.data.progress.results);
        }
        return;
      }
      setSearching(false);
      if (event.data.error) {
        setMessage(event.data.error);
        setProgress((current) =>
          current && resultCount.current ? { ...current, lowerBound: true, results: undefined } : current,
        );
      } else {
        resultCount.current = event.data.results?.length ?? 0;
        setResults(event.data.results ?? []);
        if (!event.data.results?.length) setMessage('探索した候補には、条件を満たす装備がありませんでした');
      }
      stopWorker();
    };
    next.onerror = () => {
      if (worker.current !== next) return;
      setSearching(false);
      setMessage('検索に失敗しました');
      setProgress((current) =>
        current && resultCount.current ? { ...current, lowerBound: true, results: undefined } : current,
      );
      stopWorker();
    };
    next.postMessage({
      data,
      targets: selected,
      sort,
      weaponType,
      weaponId,
      weaponRequired: weaponTargets.length > 0,
      includeMeldingOnly,
      seriesTargets: selectedSeries,
      includeArtian,
    });
  };
  const cancelSearch = () => {
    stopWorker();
    setSearching(false);
    setProgress((current) =>
      current && resultCount.current ? { ...current, lowerBound: true, results: undefined } : current,
    );
    setMessage('検索を中断しました');
  };
  const loadCriteria = (criteria: SearchCriteria) => {
    stopWorker();
    resultCount.current = 0;
    setWeaponTargets(criteria.weaponTargets.map((target) => ({ ...target })));
    setArmorTargets(criteria.armorTargets.map((target) => ({ ...target })));
    setSeriesTargets(criteria.seriesTargets.map((target) => ({ ...target })));
    setSort(criteria.sort);
    setWeaponType(criteria.weaponType);
    setWeaponId(validWeaponId(criteria.weaponType, criteria.weaponId, criteria.includeArtian));
    setIncludeMeldingOnly(criteria.includeMeldingOnly);
    setIncludeArtian(criteria.includeArtian);
    setSearchedTargets([]);
    setProgress(null);
    setResults([]);
    setSearching(false);
    setMessage('');
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
    weaponId,
    setWeaponId,
    includeMeldingOnly,
    setIncludeMeldingOnly,
    includeArtian,
    setIncludeArtian,
    progress,
    results,
    searching,
    message,
    setMessage,
    startSearch,
    cancelSearch,
    loadCriteria,
  };
}
