import { useEffect, useRef, useState } from 'react';
import type { GearData, SkillTarget, SortMode } from './model';
import type { SearchProgress, SearchResult } from './search';

export function useSimulatorSearch(data: GearData) {
  const { maxSkillLevels } = data;
  const [targets, setTargets] = useState<SkillTarget[]>([]);
  const [sort, setSort] = useState<SortMode>('slots');
  const [weaponType, setWeaponType] = useState<string | null>(null);
  const [progress, setProgress] = useState<SearchProgress | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  const startSearch = () => {
    const selected = [
      ...targets
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
    setSearching(true);
    setProgress(null);
    setResults([]);
    setMessage('');
    const next = new Worker(new URL('../simulator/search.worker.ts', import.meta.url), { type: 'module' });
    worker.current = next;
    next.onmessage = (
      event: MessageEvent<{
        results?: SearchResult[];
        error?: string;
        progress?: { stage: 'preparing' | 'searching'; visited: number; found: number };
      }>,
    ) => {
      if (event.data.progress) {
        setProgress(event.data.progress);
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
      setSearching(false);
      setMessage('検索に失敗しました');
      next.terminate();
      if (worker.current === next) worker.current = null;
    };
    next.postMessage({ data, targets: selected, sort, weaponType });
  };
  const cancelSearch = () => {
    worker.current?.terminate();
    worker.current = null;
    setSearching(false);
    setMessage('検索を中断しました');
  };

  return {
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
  };
}
