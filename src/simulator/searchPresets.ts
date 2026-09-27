import { maxSeriesSkillTargets, type SkillTarget, type SortMode } from './model';

const storageKey = 'simulator-search-presets-v1';
export const maxSearchPresets = 30;

export type SearchCriteria = {
  weaponTargets: SkillTarget[];
  armorTargets: SkillTarget[];
  seriesTargets: SkillTarget[];
  sort: SortMode;
  weaponType: string | null;
  includeMeldingOnly: boolean;
};

export type SearchPreset = {
  id: string;
  name: string;
  criteria: SearchCriteria;
};

export type SavePresetResult = { preset: SearchPreset } | { error: 'empty' | 'duplicate' | 'limit' | 'storage' };

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

function validCriteria(value: unknown): value is SearchCriteria {
  return (
    isRecord(value) &&
    validTargets(value.weaponTargets) &&
    validTargets(value.armorTargets) &&
    validTargets(value.seriesTargets) &&
    value.seriesTargets.length <= maxSeriesSkillTargets &&
    (value.sort === 'slots' || value.sort === 'defense') &&
    (value.weaponType === null || typeof value.weaponType === 'string') &&
    typeof value.includeMeldingOnly === 'boolean'
  );
}

function validPreset(value: unknown): value is SearchPreset {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    validCriteria(value.criteria)
  );
}

export function readSearchPresets(): SearchPreset[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const saved: unknown = JSON.parse(raw);
    if (!Array.isArray(saved)) return [];
    const presets = saved.filter(validPreset);
    const limited = presets.slice(-maxSearchPresets);
    if (limited.length < presets.length) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(limited));
      } catch {
        return limited;
      }
    }
    return limited;
  } catch {
    return [];
  }
}

export function saveSearchPreset(name: string, criteria: SearchCriteria): SavePresetResult {
  const normalizedName = name.trim();
  if (!normalizedName) return { error: 'empty' };
  const presets = readSearchPresets();
  if (presets.some((preset) => preset.name === normalizedName)) return { error: 'duplicate' };
  if (presets.length >= maxSearchPresets) return { error: 'limit' };
  const preset: SearchPreset = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    name: normalizedName,
    criteria,
  };
  try {
    localStorage.setItem(storageKey, JSON.stringify([...presets, preset]));
    return { preset };
  } catch {
    return { error: 'storage' };
  }
}

export function deleteSearchPreset(id: string): SearchPreset[] | null {
  const presets = readSearchPresets().filter((preset) => preset.id !== id);
  try {
    localStorage.setItem(storageKey, JSON.stringify(presets));
    return presets;
  } catch {
    return null;
  }
}
