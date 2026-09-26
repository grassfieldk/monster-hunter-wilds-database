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
  type SkillTarget,
  type SortMode,
  summarizeBuild,
  type VirtualAmulet,
  type VirtualWeapon,
} from './model';
import { restrictedSkill, skillUsable, utilityForSkills } from './relevance';

type Gear = Weapon | Armor | Amulet | VirtualAmulet | VirtualWeapon;
type Slot = { owner: EquipmentSlot; index: number; level: number; type: number };
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
type Rank = { counts: number[]; defense: number; resistance: number; utility: number; id: string };
export type SearchResult = {
  build: Build;
  defense: number;
  resistances: number[];
  freeSlots: number[];
  skills: [number, number][];
  utility: number;
};
export type SearchProgress = { stage: 'preparing' | 'searching'; visited: number; found: number };

function compare(a: Rank, b: Rank, sort: SortMode): number {
  const differences =
    sort === 'slots'
      ? [...a.counts.map((value, index) => value - b.counts[index]), a.defense - b.defense, a.utility - b.utility]
      : [
          a.defense - b.defense,
          a.resistance - b.resistance,
          ...a.counts.map((value, index) => value - b.counts[index]),
          a.utility - b.utility,
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
  };
}

function candidate(item: Gear, owner: EquipmentSlot, targets: SkillTarget[], data: GearData): Candidate {
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
  return {
    item,
    slots,
    levels: targets.map((target) =>
      Math.min(
        target.level,
        item.skills.filter((skill) => skill.skill_id === target.id).reduce((sum, skill) => sum + skill.level, 0),
      ),
    ),
    counts: [3, 2, 1].map((level) => slots.filter((slot) => slot.level === level).length),
    defense: 'defense' in item ? item.defense : 0,
    resistance: 'resistances' in item ? item.resistances.reduce((sum, value) => sum + value, 0) : 0,
    utility: utilityForSkills(item.skills, new Set(targets.map((target) => target.id)), data.skillNames),
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

function* randomAmulets(data: GearData): Generator<VirtualAmulet> {
  for (const [comboIndex, combo] of data.randomAmulets.combos.entries()) {
    const [first, second, third] = combo.groups.map((group) => data.randomAmulets.groups[group] ?? []);
    for (const a of first)
      for (const b of second)
        for (const c of third) {
          const skills = [a, b, c];
          if (new Set(skills.map((skill) => skill.skill_id)).size !== 3) continue;
          yield {
            game_id: `random-amulet:${comboIndex}:${skills.map((skill) => `${skill.skill_id}.${skill.level}`).join(':')}`,
            amulet_type: -1,
            level: 0,
            rarity: combo.rarity,
            price: 0,
            names: {
              ja: `鑑定護石 ${skills.map((skill) => `${data.skillNames[skill.skill_id] ?? skill.skill_id} Lv ${skill.level}`).join('・')}`,
            },
            descriptions: { ja: '' },
            skills,
            slots: combo.slots.map((slot) => slot.level),
            slotTypes: combo.slots.map((slot) => slot.type),
          };
        }
  }
}

function* allAmulets(data: GearData): Generator<Gear> {
  yield* data.amulets;
  yield* randomAmulets(data);
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
): Candidate[] {
  const groups = new Map<string, Candidate[]>();
  let prepared = 0;
  for (const item of items) {
    prepared++;
    if (prepared % 100000 === 0) onProgress?.({ stage: 'preparing', visited: prepared, found: 0 });
    const entry = candidate(item, owner, targets, data);
    const allowed = item.skills.reduce((mask, skill) => mask & (skillMasks.get(skill.skill_id) ?? allMask), allMask);
    if (allowed === 0n) continue;
    entry.allowed = allowed;
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
    // 同じ検索条件と適性の候補では、指定外スキルの評価が高い 30 件を残す。
    if (
      group.length === 30 &&
      (entry.utility < group[29].utility ||
        (entry.utility === group[29].utility && item.game_id.localeCompare(group[29].item.game_id) >= 0))
    )
      continue;
    group.push(entry);
    group.sort((a, b) => b.utility - a.utility || a.item.game_id.localeCompare(b.item.game_id));
    if (group.length > 30) group.pop();
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
        if ((entry.allowed & (1n << BigInt(index))) === 0n || keptPerProfile[index] === 30) continue;
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
  decorations: Decoration[],
  weapon: Weapon,
  names: Record<number, string>,
) {
  const needed = targets.map((target, index) => Math.max(0, target.level - initial[index]));
  const options = slots.map((slot) =>
    decorations.filter(
      (deco) =>
        deco.type === slot.type &&
        deco.required_slot <= slot.level &&
        deco.skills.every((skill) => skillUsable(names[skill.skill_id] ?? '', weapon)) &&
        deco.skills.some((skill) => targets.some((target) => target.id === skill.skill_id)),
    ),
  );
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
      const next = deficit.map((value, at) =>
        Math.max(
          0,
          value -
            deco.skills
              .filter((skill) => skill.skill_id === targets[at].id)
              .reduce((sum, skill) => sum + skill.level, 0),
        ),
      );
      if (next.every((value, at) => value === deficit[at])) continue;
      const tail = solve(index + 1, next);
      const utility =
        (tail?.utility ?? 0) + utilityForSkills(deco.skills, new Set(targets.map((target) => target.id)), names);
      if (
        tail &&
        (!best ||
          compare(
            { counts: tail.free, defense: 0, resistance: 0, utility, id: '' },
            { counts: best.free, defense: 0, resistance: 0, utility: best.utility, id: '' },
            'slots',
          ) > 0)
      ) {
        best = { free: tail.free, ids: [deco.game_id, ...tail.ids], utility };
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
): SearchResult[] {
  if (!targets.length) return [];
  const profiles = [
    ...new Map(
      data.weapons.map((weapon) => [
        `${weapon.weapon_type}:${weapon.attribute_value > 0 ? weapon.attribute : 0}`,
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
  const bySlot = [
    makeCandidates(
      allWeapons(data, weaponType),
      'weapon',
      targets,
      data,
      skillMasks,
      allMask,
      profiles.length,
      onProgress,
    ),
  ];
  for (let index = 0; index < armorSlots.length; index++)
    bySlot.push(
      makeCandidates(
        data.armor.filter((item) => item.part === index),
        armorSlots[index],
        targets,
        data,
        skillMasks,
        allMask,
        profiles.length,
        onProgress,
      ),
    );
  bySlot.push(
    makeCandidates(allAmulets(data), 'amulet', targets, data, skillMasks, allMask, profiles.length, onProgress),
  );
  if (bySlot.some((entries) => !entries.length)) return [];
  const maxCounts = bySlot.map((entries) =>
    [0, 1, 2].map((index) => entries.reduce((max, entry) => Math.max(max, entry.counts[index]), 0)),
  );
  const maxDefense = bySlot.map((entries) => entries.reduce((max, entry) => Math.max(max, entry.defense), 0));
  const maxResistance = bySlot.map((entries) => entries.reduce((max, entry) => Math.max(max, entry.resistance), 0));
  const maxSkills = bySlot.map((entries) =>
    targets.map((_, index) => entries.reduce((max, entry) => Math.max(max, entry.levels[index]), 0)),
  );
  const suffixCounts = bySlot.map((_, depth) =>
    [0, 1, 2].map((index) => maxCounts.slice(depth).reduce((sum, counts) => sum + counts[index], 0)),
  );
  const suffixDefense = bySlot.map((_, depth) => maxDefense.slice(depth).reduce((sum, value) => sum + value, 0));
  const suffixResistance = bySlot.map((_, depth) => maxResistance.slice(depth).reduce((sum, value) => sum + value, 0));
  const suffixSkills = bySlot.map((_, depth) =>
    targets.map((_, index) => maxSkills.slice(depth).reduce((sum, levels) => sum + levels[index], 0)),
  );
  bySlot.forEach((entries) => {
    entries.sort((a, b) =>
      compare(
        { counts: b.counts, defense: b.defense, resistance: b.resistance, utility: b.utility, id: b.item.game_id },
        { counts: a.counts, defense: a.defense, resistance: a.resistance, utility: a.utility, id: a.item.game_id },
        sort,
      ),
    );
  });
  const results: SearchResult[] = [];
  const chosen: Candidate[] = [];
  let visited = 0;
  const visit = (depth: number, levels: number[], slots: Slot[], current: Rank) => {
    visited++;
    if (visited % 10000 === 0) onProgress?.({ stage: 'searching', visited, found: results.length });
    if (depth < bySlot.length) {
      const maxSlots = suffixCounts[depth].reduce((sum, value) => sum + value, 0) + slots.length;
      if (
        targets.some(
          (target, index) => levels[index] + suffixSkills[depth][index] + maxSlots * target.level < target.level,
        )
      )
        return;
      const upper: Rank = {
        counts: current.counts.map((value, index) => value + suffixCounts[depth][index]),
        defense: current.defense + suffixDefense[depth],
        resistance: current.resistance + suffixResistance[depth],
        utility: Number.POSITIVE_INFINITY,
        id: '',
      };
      if (results.length === 30 && compare(upper, rank(results[29]), sort) < 0) return;
    }
    if (depth === bySlot.length) {
      const placement = bestDecorations(
        slots,
        levels,
        targets,
        data.decorations,
        chosen[0].item as Weapon,
        data.skillNames,
      );
      if (!placement) return;
      const build = emptyBuild();
      chosen.forEach((entry, index) => {
        build[equipmentSlots[index]] = entry.item.game_id;
      });
      slots.forEach((slot, index) => {
        const ownerDecorations = build.decorations[slot.owner] ?? [];
        ownerDecorations[slot.index] = placement.ids[index];
        build.decorations[slot.owner] = ownerDecorations;
      });
      const summary = summarizeBuild(build, data);
      const result: SearchResult = {
        build,
        defense: summary.defense,
        resistances: summary.resistances,
        freeSlots: summary.freeSlots,
        skills: [...summary.skills],
        utility: current.utility + placement.utility,
      };
      results.push(result);
      results.sort((a, b) => compare(rank(b), rank(a), sort));
      if (results.length > 30) results.pop();
      return;
    }
    for (const entry of bySlot[depth]) {
      const weapon = (depth === 0 ? entry.item : chosen[0].item) as Weapon;
      if (!entry.item.skills.every((skill) => skillUsable(data.skillNames[skill.skill_id] ?? '', weapon))) continue;
      chosen.push(entry);
      visit(
        depth + 1,
        levels.map((value, index) => Math.min(targets[index].level, value + entry.levels[index])),
        [...slots, ...entry.slots],
        {
          counts: current.counts.map((value, index) => value + entry.counts[index]),
          defense: current.defense + entry.defense,
          resistance: current.resistance + entry.resistance,
          utility: current.utility + entry.utility,
          id: '',
        },
      );
      chosen.pop();
    }
  };
  visit(
    0,
    targets.map(() => 0),
    [],
    { counts: [0, 0, 0], defense: 0, resistance: 0, utility: 0, id: '' },
  );
  onProgress?.({ stage: 'searching', visited, found: results.length });
  return results;
}
