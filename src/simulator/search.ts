import type { Amulet, Armor, Decoration, Weapon } from '../types';
import {
  armorSlots,
  type Build,
  decorationTypeForSlot,
  type EquipmentSlot,
  emptyBuild,
  equipmentSlots,
  type GearData,
  isVirtualAmulet,
  maxSeriesSkillTargets,
  type SkillTarget,
  type SortMode,
  summarizeBuild,
  type VirtualAmulet,
  type VirtualWeapon,
} from './model';
import { restrictedSkill, skillUsable, skillUtility, utilityForSkills } from './relevance';

type Gear = Weapon | Armor | Amulet | VirtualAmulet | VirtualWeapon;
type Slot = { owner: EquipmentSlot; index: number; level: number; type: number };
type DecorationOption = { id: number; gains: number[]; utility: number };
type Candidate = {
  item: Gear;
  levels: number[];
  slots: Slot[];
  counts: number[];
  defense: number;
  resistance: number;
  utility: number;
  allowed: bigint;
  baseKey: string;
};
type Rank = {
  counts: number[];
  defense: number;
  resistance: number;
  utility: number;
  id: string;
  used?: number;
  phase?: number;
};
type SearchNode = {
  depth: number;
  selected: { entry: Candidate; slot: EquipmentSlot }[];
  levels: number[];
  potential: number[];
  slots: Slot[];
  counts: number[];
  defense: number;
  resistance: number;
  allowed: bigint;
  utility: number;
  priority: Rank;
  result?: SearchResult;
};

class MaxHeap<T> {
  private items: T[] = [];

  constructor(private higher: (left: T, right: T) => boolean) {}

  get size() {
    return this.items.length;
  }

  push(value: T) {
    const items = this.items;
    let index = items.length;
    items.push(value);
    while (index > 0) {
      const parent = (index - 1) >>> 1;
      if (!this.higher(value, items[parent])) break;
      items[index] = items[parent];
      index = parent;
    }
    items[index] = value;
  }

  pop(): T | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (!items.length || last === undefined) return top;
    let index = 0;
    while (index * 2 + 1 < items.length) {
      let child = index * 2 + 1;
      if (child + 1 < items.length && this.higher(items[child + 1], items[child])) child++;
      if (!this.higher(items[child], last)) break;
      items[index] = items[child];
      index = child;
    }
    items[index] = last;
    return top;
  }
}
export type SearchResult = {
  build: Build;
  phase?: number;
  defense: number;
  resistances: number[];
  freeSlots: number[];
  skills: [number, number][];
  utility: number;
};
export type SearchProgress = {
  stage: 'preparing' | 'searching';
  visited: number;
  found: number;
  results?: SearchResult[];
  limitReached?: boolean;
};

const resultLimit = 10;
const hitLimit = 200;
const priorityQueueBranchLimit = 20000;

function compare(a: Rank, b: Rank, sort: SortMode): number {
  const differences =
    sort === 'slots'
      ? [
          (b.phase ?? 0) - (a.phase ?? 0),
          (b.used ?? 0) - (a.used ?? 0),
          ...a.counts.map((value, index) => value - b.counts[index]),
          a.defense - b.defense,
          a.utility === b.utility ? 0 : a.utility - b.utility,
        ]
      : [
          (b.phase ?? 0) - (a.phase ?? 0),
          (b.used ?? 0) - (a.used ?? 0),
          a.defense - b.defense,
          a.resistance - b.resistance,
          ...a.counts.map((value, index) => value - b.counts[index]),
          a.utility === b.utility ? 0 : a.utility - b.utility,
        ];
  return differences.find((value) => value !== 0) ?? b.id.localeCompare(a.id);
}

function rank(result: SearchResult): Rank {
  return {
    counts: [3, 2, 1].map((level) => result.freeSlots.filter((slot) => slot === level).length),
    defense: result.defense,
    resistance: result.resistances.reduce((sum, value) => sum + value, 0),
    utility: result.utility,
    id: equipmentSlots.map((slot) => result.build[slot]).join('|'),
    used: equipmentSlots.filter((slot) => result.build[slot] !== null).length,
    phase: result.phase,
  };
}

function candidate(item: Gear, owner: EquipmentSlot, targets: SkillTarget[]): Candidate {
  const slots: Slot[] =
    'slots' in item
      ? item.slots.flatMap((level, index) =>
          level > 0
            ? [
                {
                  owner,
                  index,
                  level,
                  type:
                    owner === 'amulet' && isVirtualAmulet(item) ? item.slotTypes[index] : decorationTypeForSlot(owner),
                },
              ]
            : [],
        )
      : [];
  const skillLevels = new Map<number, number>();
  for (const skill of item.skills)
    skillLevels.set(skill.skill_id, (skillLevels.get(skill.skill_id) ?? 0) + skill.level);
  return {
    item,
    slots,
    levels: targets.map((target) => Math.min(target.level, skillLevels.get(target.id) ?? 0)),
    counts: [3, 2, 1].map((level) => slots.filter((slot) => slot.level === level).length),
    defense: 'defense' in item ? item.defense : 0,
    resistance: 'resistances' in item ? item.resistances.reduce((sum, value) => sum + value, 0) : 0,
    utility: 0,
    allowed: 0n,
    baseKey: '',
  };
}

function* artianWeapons(data: GearData): Generator<VirtualWeapon> {
  const weapons = new Map(data.weapons.map((weapon) => [weapon.game_id, weapon]));
  for (const id of data.artianSkills.weaponIds) {
    const weapon = weapons.get(id);
    if (!weapon) continue;
    for (const pair of data.artianSkills.skillPairs)
      yield {
        ...weapon,
        game_id: `artian:${id}:${pair.groupSkillId}.${pair.seriesSkillId}`,
        sourceWeaponId: id,
        names: {
          ja: `${weapon.names.ja}（${data.skillNames[pair.groupSkillId]}・${data.skillNames[pair.seriesSkillId]}）`,
        },
        skills: [
          ...weapon.skills,
          { skill_id: pair.groupSkillId, level: 1 },
          { skill_id: pair.seriesSkillId, level: 1 },
        ],
      };
  }
}

function selectRandomAmulets(
  data: GearData,
  targets: SkillTarget[],
  skillMasks: Map<number, bigint>,
  allMask: bigint,
  onExamined?: (count: number) => void,
): { items: VirtualAmulet[]; examined: number } {
  type Pick = {
    skills: [Amulet['skills'][number], Amulet['skills'][number], Amulet['skills'][number]];
    id: string;
    utility: number;
  };
  const picks = new Map<string, Pick[]>();
  const targetIds = new Set(targets.map((target) => target.id));
  const groupEntries = new Map<
    number,
    { skill: Amulet['skills'][number]; mask: bigint; utility: number; levels: number[] }[]
  >();
  for (const [group, skills] of Object.entries(data.randomAmulets.groups))
    groupEntries.set(
      Number(group),
      skills.map((skill) => ({
        skill,
        mask: skillMasks.get(skill.skill_id) ?? allMask,
        utility: targetIds.has(skill.skill_id) ? 0 : skill.level * skillUtility(data.skillNames[skill.skill_id] ?? ''),
        levels: targets.map((target) => (skill.skill_id === target.id ? skill.level : 0)),
      })),
    );
  let examined = 0;
  for (const [comboIndex, combo] of data.randomAmulets.combos.entries()) {
    const [first, second, third] = combo.groups.map((group) => groupEntries.get(group) ?? []);
    for (const a of first)
      for (const b of second)
        for (const c of third) {
          examined++;
          if (examined % 100000 === 0) onExamined?.(examined);
          if (
            a.skill.skill_id === b.skill.skill_id ||
            a.skill.skill_id === c.skill.skill_id ||
            b.skill.skill_id === c.skill.skill_id
          )
            continue;
          const allowed = a.mask & b.mask & c.mask;
          if (allowed === 0n) continue;
          const levels = targets.map((target, index) =>
            Math.min(target.level, a.levels[index] + b.levels[index] + c.levels[index]),
          );
          const key = `${comboIndex}:${levels.join(',')}:${allowed.toString(16)}`;
          const group = picks.get(key) ?? [];
          const utility = a.utility + b.utility + c.utility;
          if (group.length === hitLimit && utility < group[hitLimit - 1].utility) continue;
          const skills: Pick['skills'] = [a.skill, b.skill, c.skill];
          const id = `random-amulet:${comboIndex}:${skills.map((skill) => `${skill.skill_id}.${skill.level}`).join(':')}`;
          if (group.length === hitLimit && utility === group[hitLimit - 1].utility && id >= group[hitLimit - 1].id)
            continue;
          let low = 0;
          let high = group.length;
          while (low < high) {
            const middle = (low + high) >>> 1;
            if (utility > group[middle].utility || (utility === group[middle].utility && id < group[middle].id))
              high = middle;
            else low = middle + 1;
          }
          group.splice(low, 0, { skills, id, utility });
          if (group.length > hitLimit) group.pop();
          picks.set(key, group);
        }
  }
  const items: VirtualAmulet[] = [];
  for (const group of picks.values())
    for (const pick of group) {
      const combo = data.randomAmulets.combos[Number(pick.id.split(':')[1])];
      items.push({
        game_id: pick.id,
        amulet_type: -1,
        level: 0,
        rarity: combo.rarity,
        price: 0,
        names: {
          ja: `鑑定護石 ${pick.skills.map((skill) => `${data.skillNames[skill.skill_id] ?? skill.skill_id} Lv ${skill.level}`).join('・')}`,
        },
        descriptions: { ja: '' },
        skills: pick.skills,
        slots: combo.slots.map((slot) => slot.level),
        slotTypes: combo.slots.map((slot) => slot.type),
      });
    }
  return { items, examined };
}

function* allWeapons(data: GearData, weaponType: string | null): Generator<Gear> {
  for (const weapon of data.weapons)
    if (!data.artianSkills.weaponIds.includes(weapon.game_id) && (!weaponType || weapon.weapon_type === weaponType))
      yield weapon;
  for (const weapon of artianWeapons(data)) if (!weaponType || weapon.weapon_type === weaponType) yield weapon;
}

function makeCandidates(
  items: Iterable<Gear>,
  owner: EquipmentSlot,
  targets: SkillTarget[],
  data: GearData,
  skillMasks: Map<number, bigint>,
  allMask: bigint,
  profileCount: number,
  onProgress?: (progress: SearchProgress) => void,
  isUseful?: (entry: Candidate) => boolean,
): Candidate[] {
  const groups = new Map<string, Candidate[]>();
  const targetIds = new Set(targets.map((target) => target.id));
  let prepared = 0;
  for (const item of items) {
    prepared++;
    if (prepared % 100000 === 0) onProgress?.({ stage: 'preparing', visited: prepared, found: 0 });
    const entry = candidate(item, owner, targets);
    if (isUseful && !isUseful(entry)) continue;
    const allowed = item.skills.reduce((mask, skill) => mask & (skillMasks.get(skill.skill_id) ?? allMask), allMask);
    if (allowed === 0n) continue;
    entry.allowed = allowed;
    entry.utility = utilityForSkills(item.skills, targetIds, data.skillNames);
    const weaponProperties =
      owner === 'weapon' && 'weapon_type' in item
        ? [item.weapon_type, item.attribute, item.attribute_value > 0, item.sub_attribute, item.sub_attribute_value > 0]
        : [];
    entry.baseKey = JSON.stringify([
      entry.levels,
      entry.slots.map((slot) => [slot.level, slot.type]),
      entry.defense,
      entry.resistance,
      weaponProperties,
    ]);
    const key = `${entry.baseKey}:${allowed.toString(16)}`;
    const group = groups.get(key) ?? [];
    // 同じ検索条件と適性の候補では、指定外スキルの評価が高い候補を残す。
    if (
      group.length === hitLimit &&
      (entry.utility < group[hitLimit - 1].utility ||
        (entry.utility === group[hitLimit - 1].utility &&
          item.game_id.localeCompare(group[hitLimit - 1].item.game_id) >= 0))
    )
      continue;
    let low = 0;
    let high = group.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      const other = group[middle];
      if (entry.utility > other.utility || (entry.utility === other.utility && item.game_id < other.item.game_id))
        high = middle;
      else low = middle + 1;
    }
    group.splice(low, 0, entry);
    if (group.length > hitLimit) group.pop();
    groups.set(key, group);
  }
  const byBase = new Map<string, Candidate[]>();
  for (const entry of [...groups.values()].flat()) {
    const list = byBase.get(entry.baseKey) ?? [];
    list.push(entry);
    byBase.set(entry.baseKey, list);
  }
  const selected: Candidate[] = [];
  for (const entries of byBase.values()) {
    entries.sort((a, b) => b.utility - a.utility || a.item.game_id.localeCompare(b.item.game_id));
    const keptPerProfile = Array.from({ length: profileCount }, () => 0);
    for (const entry of entries) {
      let useful = false;
      for (let index = 0; index < profileCount; index++) {
        if ((entry.allowed & (1n << BigInt(index))) === 0n || keptPerProfile[index] === hitLimit) continue;
        keptPerProfile[index]++;
        useful = true;
      }
      if (useful) selected.push(entry);
    }
  }
  onProgress?.({ stage: 'preparing', visited: prepared, found: selected.length });
  return selected;
}

function bestDecorations(
  slots: Slot[],
  initial: number[],
  targets: SkillTarget[],
  weapon: Weapon,
  optionsFor: (slot: Slot, weapon: Weapon) => DecorationOption[],
) {
  const needed = targets.map((target, index) => Math.max(0, target.level - initial[index]));
  if (needed.every((value) => value === 0))
    return {
      free: [3, 2, 1].map((level) => slots.filter((slot) => slot.level === level).length),
      ids: slots.map(() => null),
      utility: 0,
    };
  const options = slots.map((slot) => optionsFor(slot, weapon));
  const memo = new Map<string, { free: number[]; ids: (number | null)[]; utility: number } | null>();
  const solve = (
    index: number,
    deficit: number[],
  ): { free: number[]; ids: (number | null)[]; utility: number } | null => {
    if (index === slots.length)
      return deficit.every((value) => value === 0) ? { free: [0, 0, 0], ids: [], utility: 0 } : null;
    const key = `${index}:${deficit.join(',')}`;
    if (memo.has(key)) return memo.get(key) ?? null;
    const slot = slots[index];
    const skip = solve(index + 1, deficit);
    let best = skip
      ? {
          free: skip.free.map((value, at) => value + (slot.level === 3 - at ? 1 : 0)),
          ids: [null, ...skip.ids],
          utility: skip.utility,
        }
      : null;
    for (const deco of options[index]) {
      const next = deficit.map((value, at) => Math.max(0, value - deco.gains[at]));
      if (next.every((value, at) => value === deficit[at])) continue;
      const tail = solve(index + 1, next);
      const utility = (tail?.utility ?? 0) + deco.utility;
      if (
        tail &&
        (!best ||
          compare(
            { counts: tail.free, defense: 0, resistance: 0, utility, id: '' },
            { counts: best.free, defense: 0, resistance: 0, utility: best.utility, id: '' },
            'slots',
          ) > 0)
      ) {
        best = { free: tail.free, ids: [deco.id, ...tail.ids], utility };
      }
    }
    memo.set(key, best);
    return best;
  };
  return solve(0, needed);
}

export function searchBuilds(
  data: GearData,
  targets: SkillTarget[],
  sort: SortMode,
  weaponType: string | null = null,
  onProgress?: (progress: SearchProgress) => void,
  weaponRequired = false,
  includeMeldingOnly = false,
  seriesTargets: SkillTarget[] = [],
  stopAfterFirst = false,
): SearchResult[] {
  if (!targets.length) return [];
  const seriesRequirements = seriesTargets.slice(0, maxSeriesSkillTargets);
  if (seriesRequirements.length && !stopAfterFirst) {
    const seriesResults = searchBuilds(
      data,
      seriesRequirements,
      sort,
      weaponType,
      undefined,
      weaponRequired,
      includeMeldingOnly,
      [],
      true,
    );
    if (!seriesResults.length) {
      onProgress?.({ stage: 'searching', visited: 0, found: 0, results: [] });
      return [];
    }
  }
  const excludedDecorations = includeMeldingOnly ? null : new Set(data.meldingOnlyDecorationIds ?? []);
  const decorations = excludedDecorations
    ? data.decorations.filter((deco) => !excludedDecorations.has(deco.game_id))
    : data.decorations;
  const targetIds = new Set(targets.map((target) => target.id));
  const decorationsByType = new Map<number, Decoration[]>();
  for (const deco of decorations) {
    const list = decorationsByType.get(deco.type) ?? [];
    list.push(deco);
    decorationsByType.set(deco.type, list);
  }
  const decorationOptions = new Map<string, DecorationOption[]>();
  const optionsFor = (slot: Slot, weapon: Weapon): DecorationOption[] => {
    const profile = `${weapon.weapon_type}:${weapon.attribute_value > 0 ? weapon.attribute : 0}:${weapon.sub_attribute_value > 0 ? weapon.sub_attribute : 0}`;
    const key = `${profile}:${slot.type}:${slot.level}`;
    const cached = decorationOptions.get(key);
    if (cached) return cached;
    const options = (decorationsByType.get(slot.type) ?? [])
      .filter(
        (deco) =>
          deco.required_slot <= slot.level &&
          deco.skills.some((skill) => targetIds.has(skill.skill_id)) &&
          deco.skills.every((skill) => skillUsable(data.skillNames[skill.skill_id] ?? '', weapon)),
      )
      .map((deco) => ({
        id: deco.game_id,
        gains: targets.map((target) =>
          deco.skills.filter((skill) => skill.skill_id === target.id).reduce((sum, skill) => sum + skill.level, 0),
        ),
        utility: utilityForSkills(deco.skills, targetIds, data.skillNames),
      }));
    decorationOptions.set(key, options);
    return options;
  };
  const profiles = [
    ...new Map(
      data.weapons.map((weapon) => [
        `${weapon.weapon_type}:${weapon.attribute_value > 0 ? weapon.attribute : 0}:${weapon.sub_attribute_value > 0 ? weapon.sub_attribute : 0}`,
        weapon,
      ]),
    ).values(),
  ];
  const allMask = (1n << BigInt(profiles.length)) - 1n;
  const skillMasks = new Map<number, bigint>();
  for (const [idText, name] of Object.entries(data.skillNames)) {
    if (!restrictedSkill(name)) continue;
    let mask = 0n;
    profiles.forEach((weapon, index) => {
      if (skillUsable(name, weapon)) mask |= 1n << BigInt(index);
    });
    skillMasks.set(Number(idText), mask);
  }
  const requiresWeapon = weaponRequired || targets.some((target) => restrictedSkill(data.skillNames[target.id] ?? ''));
  const decorationGain = new Map<string, number>();
  const gainForSlot = (type: number, level: number, targetId: number) => {
    const key = `${type}:${level}:${targetId}`;
    const cached = decorationGain.get(key);
    if (cached !== undefined) return cached;
    const gain = decorations.reduce(
      (best, deco) =>
        deco.type === type && deco.required_slot <= level
          ? Math.max(
              best,
              deco.skills.filter((skill) => skill.skill_id === targetId).reduce((sum, skill) => sum + skill.level, 0),
            )
          : best,
      0,
    );
    decorationGain.set(key, gain);
    return gain;
  };
  const potentialFor = (item: Gear, owner: EquipmentSlot) => {
    const slots = 'slots' in item ? item.slots : [];
    return targets.map((target) =>
      Math.min(
        target.level,
        item.skills.filter((skill) => skill.skill_id === target.id).reduce((sum, skill) => sum + skill.level, 0) +
          slots.reduce(
            (sum, level, index) =>
              sum +
              (level > 0
                ? gainForSlot(
                    owner === 'amulet' && isVirtualAmulet(item) ? item.slotTypes[index] : decorationTypeForSlot(owner),
                    level,
                    target.id,
                  )
                : 0),
            0,
          ),
      ),
    );
  };
  const artianWeaponIds = new Set(data.artianSkills.weaponIds);
  const directPotentialBySlot = new Map<EquipmentSlot, number[]>();
  const decoratedPotentialBySlot = new Map<EquipmentSlot, number[]>();
  const randomAmuletPotential = targets.map(() => 0);
  for (const slot of equipmentSlots) {
    const directMaxima = targets.map(() => 0);
    const decoratedMaxima = targets.map(() => 0);
    const items: Gear[] =
      slot === 'weapon'
        ? data.weapons.filter((item) => !weaponType || item.weapon_type === weaponType)
        : slot === 'amulet'
          ? data.amulets
          : data.armor.filter((item) => item.part === armorSlots.indexOf(slot));
    for (const item of items) {
      const decoratedValues = potentialFor(item, slot);
      for (let index = 0; index < targets.length; index++) {
        const directValue = item.skills
          .filter((skill) => skill.skill_id === targets[index].id)
          .reduce((sum, skill) => sum + skill.level, 0);
        const pairGain =
          slot === 'weapon' && artianWeaponIds.has(item.game_id)
            ? Math.max(
                0,
                ...data.artianSkills.skillPairs.map(
                  (pair) =>
                    Number(pair.groupSkillId === targets[index].id) + Number(pair.seriesSkillId === targets[index].id),
                ),
              )
            : 0;
        directMaxima[index] = Math.max(directMaxima[index], Math.min(targets[index].level, directValue + pairGain));
        decoratedMaxima[index] = Math.max(
          decoratedMaxima[index],
          Math.min(targets[index].level, decoratedValues[index] + pairGain),
        );
      }
    }
    if (slot === 'amulet') {
      for (const combo of data.randomAmulets.combos) {
        for (let index = 0; index < targets.length; index++) {
          const target = targets[index];
          const direct = combo.groups.reduce(
            (sum, group) =>
              sum +
              Math.max(
                0,
                ...(data.randomAmulets.groups[group] ?? [])
                  .filter((skill) => skill.skill_id === target.id)
                  .map((skill) => skill.level),
              ),
            0,
          );
          const slots = combo.slots.reduce((sum, entry) => sum + gainForSlot(entry.type, entry.level, target.id), 0);
          randomAmuletPotential[index] = Math.max(randomAmuletPotential[index], Math.min(target.level, direct + slots));
        }
      }
    }
    directPotentialBySlot.set(slot, directMaxima);
    decoratedPotentialBySlot.set(slot, decoratedMaxima);
  }
  let preparedTotal = 0;
  const candidates = new Map<string, Candidate[]>();
  let selectedRandomAmulets: ReturnType<typeof selectRandomAmulets> | null = null;
  const candidatesFor = (slot: EquipmentSlot, phase: number) => {
    const withDecorations = phase >= 2;
    const key = `${slot}:${withDecorations}:${phase === 3 && slot === 'amulet'}`;
    const cached = candidates.get(key);
    if (cached) return cached;
    if (slot === 'amulet' && phase === 3 && !selectedRandomAmulets)
      selectedRandomAmulets = selectRandomAmulets(data, targets, skillMasks, allMask, (count) =>
        onProgress?.({ stage: 'preparing', visited: preparedTotal + count, found }),
      );
    const selectedAmulets = slot === 'amulet' && phase === 3 ? selectedRandomAmulets : null;
    const items: Iterable<Gear> =
      slot === 'weapon'
        ? allWeapons(data, weaponType)
        : slot === 'amulet'
          ? (selectedAmulets?.items ?? data.amulets)
          : data.armor.filter((item) => item.part === armorSlots.indexOf(slot));
    let prepared = 0;
    const entries = makeCandidates(
      items,
      slot,
      targets,
      data,
      skillMasks,
      allMask,
      profiles.length,
      (progress) => {
        prepared = progress.visited;
        onProgress?.({
          stage: 'preparing',
          visited: preparedTotal + (selectedAmulets?.examined ?? 0) + prepared,
          found,
        });
      },
      (entry) =>
        (slot === 'weapon' && requiresWeapon) ||
        targets.some(
          (target, index) =>
            entry.levels[index] +
              (withDecorations
                ? entry.slots.reduce(
                    (sum, entrySlot) => sum + gainForSlot(entrySlot.type, entrySlot.level, target.id),
                    0,
                  )
                : 0) >
            0,
        ),
    );
    preparedTotal += (selectedAmulets?.examined ?? 0) + prepared;
    entries.sort((a, b) =>
      compare(
        { counts: b.counts, defense: b.defense, resistance: b.resistance, utility: b.utility, id: b.item.game_id },
        { counts: a.counts, defense: a.defense, resistance: a.resistance, utility: a.utility, id: a.item.game_id },
        sort,
      ),
    );
    candidates.set(key, entries);
    return entries;
  };
  const results: SearchResult[] = [];
  let visited = 0;
  let found = 0;
  let lastResultReport = 0;
  const foundLimit = stopAfterFirst ? 1 : hitLimit;
  const canMeetDirectly = (searchSlots: EquipmentSlot[], phase: number) => {
    let states = new Map<string, number[]>([[targets.map(() => 0).join(','), targets.map(() => 0)]]);
    for (const slot of searchSlots) {
      const vectors = [
        ...new Map(candidatesFor(slot, phase).map((entry) => [entry.levels.join(','), entry.levels])).values(),
      ];
      const next = new Map(states);
      for (const levels of states.values())
        for (const vector of vectors) {
          const combined = levels.map((value, index) => Math.min(targets[index].level, value + vector[index]));
          next.set(combined.join(','), combined);
        }
      states = next;
      if (states.size > 50000) return true;
    }
    return states.has(targets.map((target) => target.level).join(','));
  };
  const reportResults = (force = false) => {
    if (!onProgress) return;
    const now = Date.now();
    if (!force && now - lastResultReport < 100) return;
    onProgress({
      stage: 'searching',
      visited: preparedTotal + visited,
      found,
      results: [...results],
      limitReached: found >= hitLimit,
    });
    lastResultReport = now;
  };
  const complete = (node: SearchNode, phase: number): SearchResult | null => {
    if ((phase === 1 || phase === 3) && !node.selected.some(({ slot }) => slot === 'amulet')) return null;
    const equippedWeapon = (node.selected.find(({ slot }) => slot === 'weapon')?.entry.item as Weapon) ?? null;
    const possibleWeapons = equippedWeapon
      ? [equippedWeapon]
      : profiles.filter(
          (weapon, index) =>
            (!weaponType || weapon.weapon_type === weaponType) && (node.allowed & (1n << BigInt(index))) !== 0n,
        );
    let placement: ReturnType<typeof bestDecorations> = null;
    for (const weapon of possibleWeapons) {
      if (
        equippedWeapon &&
        !node.selected.every(({ entry }) =>
          entry.item.skills.every((skill) => skillUsable(data.skillNames[skill.skill_id] ?? '', weapon)),
        )
      )
        continue;
      const option =
        phase < 2
          ? node.levels.every((value, index) => value >= targets[index].level)
            ? {
                free: [3, 2, 1].map((level) => node.slots.filter((slot) => slot.level === level).length),
                ids: node.slots.map(() => null),
                utility: 0,
              }
            : null
          : bestDecorations(node.slots, node.levels, targets, weapon, optionsFor);
      if (
        option &&
        (!placement ||
          compare(
            { counts: option.free, defense: 0, resistance: 0, utility: option.utility, id: '' },
            { counts: placement.free, defense: 0, resistance: 0, utility: placement.utility, id: '' },
            'slots',
          ) > 0)
      )
        placement = option;
    }
    if (!placement) return null;
    if (phase === 2 && !placement.ids.some((id) => id !== null)) return null;
    const build = emptyBuild();
    node.selected.forEach(({ entry, slot }) => {
      build[slot] = entry.item.game_id;
    });
    node.slots.forEach((slot, index) => {
      const ownerDecorations = build.decorations[slot.owner] ?? [];
      ownerDecorations[slot.index] = placement.ids[index];
      build.decorations[slot.owner] = ownerDecorations;
    });
    const summary = summarizeBuild(build, data);
    return {
      build,
      phase,
      defense: summary.defense,
      resistances: summary.resistances,
      freeSlots: summary.freeSlots,
      skills: [...summary.skills],
      utility: node.utility + placement.utility,
    };
  };
  const searchCount = (
    requiredCount: number,
    phase: number,
    searchSlots: EquipmentSlot[],
    potentialBySlot: Map<EquipmentSlot, number[]>,
  ) => {
    const entriesBySlot = new Map(searchSlots.map((slot) => [slot, candidatesFor(slot, phase)]));
    const candidatePotential = new Map<Candidate, number[]>();
    const potentialVectors = searchSlots.map((slot) => [
      ...new Map(
        (entriesBySlot.get(slot) ?? []).map((entry) => {
          const vector = targets.map((target, index) =>
            Math.min(
              target.level,
              entry.levels[index] +
                (phase >= 2
                  ? entry.slots.reduce(
                      (sum, itemSlot) => sum + gainForSlot(itemSlot.type, itemSlot.level, target.id),
                      0,
                    )
                  : 0),
            ),
          );
          candidatePotential.set(entry, vector);
          return [vector.join(','), vector] as const;
        }),
      ).values(),
    ]);
    const coverage = (() => {
      const zero = targets.map(() => 0);
      const suffix: number[][][][] = Array.from({ length: searchSlots.length + 1 }, () => []);
      suffix[searchSlots.length][0] = [zero];
      for (let depth = searchSlots.length - 1; depth >= 0; depth--) {
        for (let count = 0; count <= requiredCount; count++) {
          const states = new Map<string, number[]>();
          for (const vector of suffix[depth + 1][count] ?? []) states.set(vector.join(','), vector);
          if (count > 0)
            for (const tail of suffix[depth + 1][count - 1] ?? [])
              for (const item of potentialVectors[depth]) {
                const vector = tail.map((value, index) => Math.min(targets[index].level, value + item[index]));
                states.set(vector.join(','), vector);
                if (states.size > 50000) return null;
              }
          suffix[depth][count] = [...states.values()];
        }
      }
      return suffix;
    })();
    const strides: number[] = [];
    let stateCount = 1;
    for (const target of targets) {
      strides.push(stateCount);
      stateCount *= target.level + 1;
    }
    const coverageMasks =
      coverage && stateCount <= 100000
        ? coverage.map((row) =>
            row.map((vectors) => {
              if (!vectors) return null;
              const mask = new Uint8Array(stateCount);
              for (const vector of vectors)
                mask[vector.reduce((sum, value, index) => sum + value * strides[index], 0)] = 1;
              for (let dimension = 0; dimension < targets.length; dimension++)
                for (let index = stateCount - 1; index >= 0; index--)
                  if (
                    Math.floor(index / strides[dimension]) % (targets[dimension].level + 1) <
                      targets[dimension].level &&
                    mask[index + strides[dimension]]
                  )
                    mask[index] = 1;
              return mask;
            }),
          )
        : null;
    const coverageMemo = new Map<string, boolean>();
    const canCover = (depth: number, count: number, deficit: number[]) => {
      if (!coverage) return true;
      const mask = coverageMasks?.[depth]?.[count];
      if (mask) return mask[deficit.reduce((sum, value, index) => sum + value * strides[index], 0)] === 1;
      const key = `${depth}:${count}:${deficit.join(',')}`;
      let possible = coverageMemo.get(key);
      if (possible === undefined) {
        possible = (coverage[depth][count] ?? []).some((vector) =>
          vector.every((value, index) => value >= deficit[index]),
        );
        coverageMemo.set(key, possible);
      }
      return possible;
    };
    if (
      !canCover(
        0,
        requiredCount,
        targets.map((target) => target.level),
      )
    )
      return;
    const maxima = new Map(
      searchSlots.map((slot) => {
        const entries = entriesBySlot.get(slot) ?? [];
        const maximum = { counts: [0, 0, 0], defense: 0, resistance: 0, utility: 0 };
        for (const entry of entries) {
          for (let index = 0; index < maximum.counts.length; index++)
            maximum.counts[index] = Math.max(maximum.counts[index], entry.counts[index]);
          maximum.defense = Math.max(maximum.defense, entry.defense);
          maximum.resistance = Math.max(maximum.resistance, entry.resistance);
          maximum.utility = Math.max(maximum.utility, entry.utility);
        }
        return [slot, maximum] as const;
      }),
    );
    const topRemaining = (depth: number, count: number, get: (slot: EquipmentSlot) => number) =>
      searchSlots
        .slice(depth)
        .map(get)
        .sort((a, b) => b - a)
        .slice(0, count)
        .reduce((sum, value) => sum + value, 0);
    const upper = Array.from({ length: searchSlots.length + 1 }, (_, depth) =>
      Array.from({ length: requiredCount + 1 }, (_, count) => ({
        levels: targets.map((_, index) =>
          topRemaining(depth, count, (slot) => potentialBySlot.get(slot)?.[index] ?? 0),
        ),
        counts: [0, 1, 2].map((index) => topRemaining(depth, count, (slot) => maxima.get(slot)?.counts[index] ?? 0)),
        defense: topRemaining(depth, count, (slot) => maxima.get(slot)?.defense ?? 0),
        resistance: topRemaining(depth, count, (slot) => maxima.get(slot)?.resistance ?? 0),
        utility: topRemaining(depth, count, (slot) => maxima.get(slot)?.utility ?? 0),
      })),
    );
    const estimatedBranches = searchSlots
      .map((slot) => (entriesBySlot.get(slot)?.length ?? 0) + 1)
      .sort((a, b) => b - a)
      .slice(0, requiredCount)
      .reduce((product, count) => product * count, 1);
    const bestFirst = estimatedBranches <= priorityQueueBranchLimit;
    const heap = new MaxHeap<SearchNode>((left, right) => compare(left.priority, right.priority, sort) > 0);
    const stack: SearchNode[] = [];
    const enqueue = (node: SearchNode) => {
      if (bestFirst) heap.push(node);
      else stack.push(node);
    };
    const add = (node: Omit<SearchNode, 'priority'>): SearchNode | null => {
      const remainingCount = requiredCount - node.selected.length;
      if (remainingCount < 0 || searchSlots.length - node.depth < remainingCount) return null;
      const bound = upper[node.depth][remainingCount];
      if (targets.some((target, index) => node.potential[index] + bound.levels[index] < target.level)) return null;
      const deficit = targets.map((target, index) => Math.max(0, target.level - node.potential[index]));
      if (!canCover(node.depth, remainingCount, deficit)) return null;
      const priority: Rank = {
        phase,
        used: requiredCount,
        counts: node.counts.map((value, index) => value + bound.counts[index]),
        defense: node.defense + bound.defense,
        resistance: node.resistance + bound.resistance,
        utility: bestFirst ? Number.POSITIVE_INFINITY : node.utility + bound.utility,
        id: '',
      };
      return { ...node, priority };
    };
    const root = add({
      depth: 0,
      selected: [],
      levels: targets.map(() => 0),
      potential: targets.map(() => 0),
      slots: [],
      counts: [0, 0, 0],
      defense: 0,
      resistance: 0,
      allowed: allMask,
      utility: 0,
    });
    if (root) enqueue(root);
    while ((bestFirst ? heap.size : stack.length) && found < foundLimit) {
      const node = bestFirst ? heap.pop() : stack.pop();
      if (!node) break;
      visited++;
      if (visited % 10000 === 0) reportResults(true);
      if (node.result) {
        results.push(node.result);
        found++;
        results.sort((a, b) => compare(rank(b), rank(a), sort));
        if (results.length > resultLimit) results.pop();
        reportResults(results.length === 1);
        continue;
      }
      if (node.selected.length === requiredCount) {
        const result = complete(node, phase);
        if (result) enqueue({ ...node, priority: rank(result), result });
        continue;
      }
      if (node.depth >= searchSlots.length) continue;
      const slot = searchSlots[node.depth];
      const children: SearchNode[] = [];
      if ((slot !== 'weapon' || !requiresWeapon) && (slot !== 'amulet' || (phase !== 1 && phase !== 3))) {
        const child = add({ ...node, depth: node.depth + 1 });
        if (child) children.push(child);
      }
      const entries = entriesBySlot.get(slot) ?? [];
      for (const entry of entries) {
        const allowed = node.allowed & entry.allowed;
        if (allowed === 0n) continue;
        const child = add({
          depth: node.depth + 1,
          selected: [...node.selected, { entry, slot }],
          levels: node.levels.map((value, index) => Math.min(targets[index].level, value + entry.levels[index])),
          potential: node.potential.map((value, index) =>
            Math.min(targets[index].level, value + (candidatePotential.get(entry)?.[index] ?? 0)),
          ),
          slots: [...node.slots, ...entry.slots],
          counts: node.counts.map((value, index) => value + entry.counts[index]),
          defense: node.defense + entry.defense,
          resistance: node.resistance + entry.resistance,
          allowed,
          utility: node.utility + entry.utility,
        });
        if (child) children.push(child);
      }
      if (!bestFirst) children.sort((left, right) => compare(left.priority, right.priority, sort));
      for (const child of children) enqueue(child);
    }
  };
  for (let phase = 0; phase <= 3 && found < foundLimit; phase++) {
    const potentialBySlot = new Map(phase < 2 ? directPotentialBySlot : decoratedPotentialBySlot);
    if (phase === 3) potentialBySlot.set('amulet', randomAmuletPotential);
    const searchSlots = equipmentSlots.filter(
      (slot) =>
        (slot !== 'amulet' || phase !== 0) &&
        ((slot === 'weapon' && requiresWeapon) || potentialBySlot.get(slot)?.some((value) => value > 0)),
    );
    if (!searchSlots.length || ((phase === 1 || phase === 3) && !searchSlots.includes('amulet'))) continue;
    if (phase === 1 || phase === 3) {
      searchSlots.splice(searchSlots.indexOf('amulet'), 1);
      searchSlots.splice(requiresWeapon ? 1 : 0, 0, 'amulet');
    }
    if (phase < 2 && !canMeetDirectly(searchSlots, phase)) continue;
    for (let requiredCount = 1; requiredCount <= searchSlots.length && found < foundLimit; requiredCount++)
      searchCount(requiredCount, phase, searchSlots, potentialBySlot);
  }
  reportResults(true);
  return results;
}
