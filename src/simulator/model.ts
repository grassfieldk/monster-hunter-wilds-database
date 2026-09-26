import type { Amulet, Armor, Decoration, EquipmentSkill, Weapon } from '../types';

export type EquipmentSlot = 'weapon' | 'head' | 'chest' | 'arms' | 'waist' | 'legs' | 'amulet';
export const armorSlots: EquipmentSlot[] = ['head', 'chest', 'arms', 'waist', 'legs'];
export const equipmentSlots: EquipmentSlot[] = ['weapon', ...armorSlots, 'amulet'];
export function formatSlotLevels(levels: number[]): string {
  return levels.map((level) => `（${level}）`).join('') || 'なし';
}
export type Build = {
  weapon: string | null;
  weaponBonuses?: number[];
  head: string | null;
  chest: string | null;
  arms: string | null;
  waist: string | null;
  legs: string | null;
  amulet: string | null;
  decorations: Partial<Record<EquipmentSlot, (number | null)[]>>;
};
export type VirtualAmulet = Amulet & { slots: number[]; slotTypes: number[] };
export type VirtualWeapon = Weapon & { sourceWeaponId: string };
export function isVirtualWeapon(item: unknown): item is VirtualWeapon {
  return (
    typeof item === 'object' && item !== null && 'sourceWeaponId' in item && typeof item.sourceWeaponId === 'string'
  );
}
export function isVirtualAmulet(item: unknown): item is VirtualAmulet {
  return typeof item === 'object' && item !== null && 'slotTypes' in item && Array.isArray(item.slotTypes);
}
export type RandomAmuletRule = { rarity: number; groups: number[]; slots: { level: number; type: number }[] };
export type RandomAmuletData = { groups: Record<number, EquipmentSkill[]>; combos: RandomAmuletRule[] };
export type ArtianBonus = {
  id: number;
  name: string;
  normalMax: number;
  gogmaMax: number;
  attack: number[];
  affinity: number[];
  attribute: number[];
  sharpness: number[];
};
export type ArtianSkillData = {
  weaponIds: string[];
  skillPairs: { groupSkillId: number; seriesSkillId: number }[];
  bonuses: ArtianBonus[];
};
export type SkillTarget = { id: number; level: number };
export const maxSeriesSkillTargets = 3;
export type SortMode = 'slots' | 'defense';
export type GearData = {
  weapons: Weapon[];
  armor: Armor[];
  amulets: Amulet[];
  decorations: Decoration[];
  meldingOnlyDecorationIds?: number[];
  maxSkillLevels: Record<number, number>;
  skillNames: Record<number, string>;
  randomAmulets: RandomAmuletData;
  artianSkills: ArtianSkillData;
};
export type BuildSummary = {
  skills: Map<number, number>;
  defense: number;
  resistances: number[];
  freeSlots: number[];
  attack: number | null;
  affinity: number | null;
  attributeValue: number | null;
  sharpnessBonus: number;
};

export function emptyBuild(): Build {
  return { weapon: null, head: null, chest: null, arms: null, waist: null, legs: null, amulet: null, decorations: {} };
}

export function validBuild(value: unknown): value is Build {
  if (!value || typeof value !== 'object') return false;
  const build = value as Record<string, unknown>;
  if (!equipmentSlots.every((slot) => build[slot] === null || typeof build[slot] === 'string')) return false;
  if (!build.decorations || typeof build.decorations !== 'object' || Array.isArray(build.decorations)) return false;
  if (
    build.weaponBonuses !== undefined &&
    (!Array.isArray(build.weaponBonuses) ||
      build.weaponBonuses.length > 5 ||
      !build.weaponBonuses.every((id) => Number.isSafeInteger(id)))
  )
    return false;
  return Object.entries(build.decorations).every(
    ([slot, ids]) =>
      equipmentSlots.includes(slot as EquipmentSlot) &&
      Array.isArray(ids) &&
      ids.length <= 3 &&
      ids.every((id) => id === null || Number.isSafeInteger(id)),
  );
}

function virtualAmulet(id: string, data: GearData): VirtualAmulet | null {
  const parts = id.split(':');
  if (parts.length !== 5 || parts[0] !== 'random-amulet') return null;
  const combo = data.randomAmulets.combos[Number(parts[1])];
  if (!combo) return null;
  const skills = parts.slice(2).map((part, index) => {
    const match = part.match(/^(-?\d+)\.(\d+)$/u);
    if (!match) return null;
    const skill = { skill_id: Number(match[1]), level: Number(match[2]) };
    return data.randomAmulets.groups[combo.groups[index]]?.some(
      (option) => option.skill_id === skill.skill_id && option.level === skill.level,
    )
      ? skill
      : null;
  });
  if (skills.some((skill) => !skill) || new Set(skills.map((skill) => skill?.skill_id)).size !== skills.length)
    return null;
  const entries = skills as EquipmentSkill[];
  return {
    game_id: id,
    amulet_type: -1,
    level: 0,
    rarity: combo.rarity,
    price: 0,
    names: {
      ja: `鑑定護石 ${entries.map((skill) => `${data.skillNames[skill.skill_id] ?? skill.skill_id} Lv ${skill.level}`).join('・')}`,
    },
    descriptions: { ja: '' },
    skills: entries,
    slots: combo.slots.map((slot) => slot.level),
    slotTypes: combo.slots.map((slot) => slot.type),
  };
}

function virtualWeapon(id: string, weapons: Map<string, Weapon>, data: GearData): VirtualWeapon | null {
  if (!id.startsWith('artian:')) return null;
  const last = id.lastIndexOf(':');
  const sourceWeaponId = id.slice('artian:'.length, last);
  const pair = id.slice(last + 1).match(/^(-?\d+)\.(-?\d+)$/u);
  const weapon = weapons.get(sourceWeaponId);
  if (!pair || !weapon || !data.artianSkills.weaponIds.includes(sourceWeaponId)) return null;
  const groupSkillId = Number(pair[1]);
  const seriesSkillId = Number(pair[2]);
  if (
    !data.artianSkills.skillPairs.some(
      (entry) => entry.groupSkillId === groupSkillId && entry.seriesSkillId === seriesSkillId,
    )
  )
    return null;
  return {
    ...weapon,
    game_id: id,
    sourceWeaponId,
    names: { ja: `${weapon.names.ja}（${data.skillNames[groupSkillId]}・${data.skillNames[seriesSkillId]}）` },
    skills: [...weapon.skills, { skill_id: groupSkillId, level: 1 }, { skill_id: seriesSkillId, level: 1 }],
  };
}

export function selectedGear(build: Build, data: GearData) {
  const weapons = new Map(data.weapons.map((item) => [item.game_id, item]));
  const armor = new Map(data.armor.map((item) => [item.game_id, item]));
  const amulets = new Map(data.amulets.map((item) => [item.game_id, item]));
  return {
    weapon: virtualWeapon(build.weapon ?? '', weapons, data) ?? weapons.get(build.weapon ?? '') ?? null,
    armor: armorSlots.map((slot) => armor.get(build[slot] ?? '') ?? null),
    amulet: virtualAmulet(build.amulet ?? '', data) ?? amulets.get(build.amulet ?? '') ?? null,
  };
}

export function decorationTypeForSlot(slot: EquipmentSlot) {
  return slot === 'weapon' ? -1638455296 : 1842954880;
}

export function summarizeBuild(build: Build, data: GearData): BuildSummary {
  const selected = selectedGear(build, data);
  const skills = new Map<number, number>();
  const addSkills = (entries: EquipmentSkill[]) => {
    for (const entry of entries) skills.set(entry.skill_id, (skills.get(entry.skill_id) ?? 0) + entry.level);
  };
  const decorations = new Map(data.decorations.map((item) => [item.game_id, item]));
  const defense = (selected.weapon?.defense ?? 0) + selected.armor.reduce((sum, item) => sum + (item?.defense ?? 0), 0);
  const resistances = Array.from({ length: 5 }, (_, index) =>
    selected.armor.reduce((sum, item) => sum + (item?.resistances[index] ?? 0), 0),
  );
  const freeSlots: number[] = [];
  let attack = selected.weapon?.attack ?? null;
  let affinity = selected.weapon?.affinity ?? null;
  let attributeValue = selected.weapon?.attribute_value ?? null;
  let sharpnessBonus = 0;
  if (isVirtualWeapon(selected.weapon) && build.weaponBonuses?.length) {
    const typeIndex = [
      'LongSword',
      'ShortSword',
      'TwinSword',
      'Tachi',
      'Hammer',
      'Whistle',
      'Lance',
      'GunLance',
      'SlashAxe',
      'ChargeAxe',
      'Rod',
      'Bow',
      'HeavyBowgun',
      'LightBowgun',
    ].indexOf(selected.weapon.weapon_type);
    const applied = new Map<number, number>();
    for (const id of build.weaponBonuses) {
      const bonus = data.artianSkills.bonuses.find((entry) => entry.id === id);
      if (!bonus || typeIndex < 0 || (applied.get(id) ?? 0) >= bonus.gogmaMax) continue;
      applied.set(id, (applied.get(id) ?? 0) + 1);
      const at = typeIndex + 14;
      attack = (attack ?? 0) + (bonus.attack[at] ?? 0);
      affinity = (affinity ?? 0) + (bonus.affinity[at] ?? 0);
      attributeValue = (attributeValue ?? 0) + (bonus.attribute[at] ?? 0);
      sharpnessBonus += bonus.sharpness[at] ?? 0;
    }
  }
  for (const slot of equipmentSlots) {
    const item =
      slot === 'weapon'
        ? selected.weapon
        : slot === 'amulet'
          ? selected.amulet
          : selected.armor[armorSlots.indexOf(slot)];
    if (!item) continue;
    addSkills(item.skills);
    const levels = 'slots' in item ? item.slots : [];
    for (let index = 0; index < levels.length; index++) {
      if (levels[index] <= 0) continue;
      const deco = decorations.get(build.decorations[slot]?.[index] ?? NaN);
      const type = slot === 'amulet' && isVirtualAmulet(item) ? item.slotTypes[index] : decorationTypeForSlot(slot);
      if (deco && deco.type === type && deco.required_slot <= levels[index]) addSkills(deco.skills);
      else freeSlots.push(levels[index]);
    }
  }
  for (const [id, level] of skills) skills.set(id, Math.min(level, data.maxSkillLevels[id] ?? level));
  return {
    skills,
    defense,
    resistances,
    freeSlots: freeSlots.sort((a, b) => b - a),
    attack,
    affinity,
    attributeValue,
    sharpnessBonus,
  };
}
