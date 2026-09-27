import type { Armor, Weapon, WeaponTree } from '../types';
import { finalWeapons } from './finalWeapons';
import type { GearData } from './model';

export function searchableWeapons(weapons: Weapon[], weaponTrees: WeaponTree[]): Weapon[] {
  return finalWeapons(weapons, weaponTrees).filter((weapon) => weapon.rarity >= 5);
}

export function searchableArmor(armor: Armor[]): Armor[] {
  return armor.filter((item) => item.rarity !== null && item.rarity >= 11 && item.rarity <= 14);
}

export function searchableGear(data: GearData): GearData {
  return {
    ...data,
    weapons: searchableWeapons(data.weapons, data.weaponTrees),
    armor: searchableArmor(data.armor),
  };
}
