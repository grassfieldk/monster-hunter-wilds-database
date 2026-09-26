import { type SkillTarget, type SortMode, validBuild } from './model';
import type { SearchProgress, SearchResult } from './search';

const storageKey = 'simulator-search-v1';

export type SavedSearch = {
  weaponTargets: SkillTarget[];
  armorTargets: SkillTarget[];
  seriesTargets: SkillTarget[];
  searchedTargets: SkillTarget[];
  sort: SortMode;
  weaponType: string | null;
  includeMeldingOnly: boolean;
  progress: SearchProgress | null;
  results: SearchResult[];
  searching: boolean;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validTargets(value: unknown): value is SkillTarget[] {
  return (
    Array.isArray(value) &&
    value.every(
      (target) =>
        isRecord(target) &&
        Number.isSafeInteger(target.id) &&
        Number.isSafeInteger(target.level) &&
        (target.level as number) > 0,
    )
  );
}

function validResult(value: unknown): value is SearchResult {
  if (!isRecord(value) || !validBuild(value.build)) return false;
  return (
    typeof value.defense === 'number' &&
    Number.isFinite(value.defense) &&
    Array.isArray(value.resistances) &&
    value.resistances.length === 5 &&
    value.resistances.every((item: unknown) => typeof item === 'number' && Number.isFinite(item)) &&
    Array.isArray(value.freeSlots) &&
    value.freeSlots.every((item: unknown) => typeof item === 'number' && Number.isSafeInteger(item)) &&
    Array.isArray(value.skills) &&
    value.skills.every(
      (item: unknown) =>
        Array.isArray(item) &&
        item.length === 2 &&
        item.every((part) => typeof part === 'number' && Number.isSafeInteger(part)),
    ) &&
    typeof value.utility === 'number' &&
    Number.isFinite(value.utility)
  );
}

export function readSavedSearch(): SavedSearch | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const saved: unknown = JSON.parse(raw);
    if (!isRecord(saved) || !validTargets(saved.weaponTargets) || !validTargets(saved.armorTargets)) return null;
    if (saved.seriesTargets !== undefined && !validTargets(saved.seriesTargets)) return null;
    if (saved.searchedTargets !== undefined && !validTargets(saved.searchedTargets)) return null;
    if (saved.sort !== 'slots' && saved.sort !== 'defense') return null;
    if (saved.weaponType !== null && typeof saved.weaponType !== 'string') return null;
    if (saved.includeMeldingOnly !== undefined && typeof saved.includeMeldingOnly !== 'boolean') return null;
    if (!Array.isArray(saved.results) || !saved.results.every(validResult)) return null;
    const progress = saved.progress;
    if (
      progress !== null &&
      (!isRecord(progress) ||
        (progress.stage !== 'preparing' && progress.stage !== 'searching') ||
        typeof progress.visited !== 'number' ||
        typeof progress.found !== 'number')
    )
      return null;
    return {
      weaponTargets: saved.weaponTargets,
      armorTargets: saved.armorTargets,
      seriesTargets: saved.seriesTargets ?? [],
      searchedTargets: saved.searchedTargets ?? [],
      sort: saved.sort,
      weaponType: saved.weaponType,
      includeMeldingOnly: saved.includeMeldingOnly ?? false,
      progress: progress as SearchProgress | null,
      results: saved.results.slice(0, 10),
      searching: saved.searching === true,
      message: typeof saved.message === 'string' ? saved.message : '',
    };
  } catch {
    return null;
  }
}

export function saveSearch(search: SavedSearch) {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...search,
        progress: search.progress && { ...search.progress, results: undefined },
      }),
    );
  } catch {
    return;
  }
}
