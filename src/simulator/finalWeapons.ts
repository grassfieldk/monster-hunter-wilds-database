import type { Weapon, WeaponTree } from '../types';

export function finalWeapons(weapons: Weapon[], trees: WeaponTree[]): Weapon[] {
  const parents = new Set(trees.map((edge) => edge.parent_id));
  const linked = new Set(trees.flatMap((edge) => [edge.parent_id, edge.child_id]));
  return weapons.filter((weapon) => !parents.has(weapon.game_id) && (linked.has(weapon.game_id) || weapon.rarity >= 8));
}
