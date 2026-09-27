import loadHighs from 'highs';
import highsWasmUrl from 'highs/runtime?url';
import type { Amulet, Armor, Decoration, Weapon } from '../types';
import {
  armorSlots,
  decorationTypeForSlot,
  type EquipmentSlot,
  emptyBuild,
  type GearData,
  type SkillTarget,
  summarizeBuild,
} from './model';
import { skillUsable, utilityForSkillLevels } from './relevance';
import type { SearchResult } from './search';

type Item = Weapon | Armor | Amulet;
type GearVariable = { name: string; slot: EquipmentSlot; item: Item };
type DecoVariable = { name: string; item: Decoration };
type Term = [number, string];

function expression(terms: Term[]): string {
  return terms
    .filter(([coefficient]) => coefficient !== 0)
    .map(([coefficient, name], index) => `${index > 0 && coefficient > 0 ? '+ ' : ''}${coefficient} ${name}`)
    .join(' ');
}

function modelFor(
  data: GearData,
  targets: SkillTarget[],
  weapons: Weapon[],
  decorations: Decoration[],
  excluded: Set<string>,
  blocked: Set<string>[],
) {
  const targetIds = new Set(targets.map((target) => target.id));
  const gear: GearVariable[] = [];
  const addGear = (slot: EquipmentSlot, item: Item) => {
    if (excluded.has(item.game_id)) return;
    if (!('slots' in item) && !item.skills.some((skill) => targetIds.has(skill.skill_id))) return;
    gear.push({ name: `g${gear.length}`, slot, item });
  };
  for (const weapon of weapons) addGear('weapon', weapon);
  for (const armor of data.armor) addGear(armorSlots[armor.part], armor);
  for (const amulet of data.amulets) addGear('amulet', amulet);
  const decos = decorations
    .filter((deco) => deco.skills.some((skill) => targetIds.has(skill.skill_id)))
    .map((item, index) => ({ name: `d${index}`, item }));
  const rows: string[] = [];
  const addRow = (name: string, terms: Term[], operator: string, right: number) => {
    const left = expression(terms);
    if (!left) return right <= 0;
    rows.push(` ${name}: ${left} ${operator} ${right}`);
    return true;
  };
  for (const slot of ['weapon', ...armorSlots, 'amulet'] as EquipmentSlot[])
    addRow(
      `part_${slot}`,
      gear.filter((entry) => entry.slot === slot).map((entry) => [1, entry.name]),
      slot === 'weapon' ? '=' : '<=',
      1,
    );
  for (const target of targets) {
    const terms: Term[] = [];
    for (const entry of gear) {
      const gain = entry.item.skills
        .filter((skill) => skill.skill_id === target.id)
        .reduce((sum, skill) => sum + skill.level, 0);
      if (gain) terms.push([gain, entry.name]);
    }
    for (const entry of decos) {
      const gain = entry.item.skills
        .filter((skill) => skill.skill_id === target.id)
        .reduce((sum, skill) => sum + skill.level, 0);
      if (gain) terms.push([gain, entry.name]);
    }
    if (!terms.length) return null;
    addRow(`skill_${target.id < 0 ? `n${-target.id}` : target.id}`, terms, '>=', target.level);
  }
  for (const type of [decorationTypeForSlot('weapon'), decorationTypeForSlot('head')])
    for (let level = 1; level <= 3; level++) {
      const terms: Term[] = [];
      for (const entry of decos)
        if (entry.item.type === type && entry.item.required_slot >= level) terms.push([1, entry.name]);
      for (const entry of gear)
        if (decorationTypeForSlot(entry.slot) === type && 'slots' in entry.item) {
          const count = entry.item.slots.filter((slotLevel) => slotLevel >= level).length;
          if (count) terms.push([-count, entry.name]);
        }
      if (terms.length) addRow(`capacity_${type < 0 ? `n${-type}` : type}_${level}`, terms, '<=', 0);
    }
  for (const [index, names] of blocked.entries()) {
    if (!names.size) return null;
    addRow(
      `different_${index}`,
      gear.filter((entry) => entry.slot !== 'weapon').map((entry) => [names.has(entry.name) ? 1 : -1, entry.name]),
      '<=',
      names.size - 1,
    );
  }
  const objective = expression([
    ...gear.map((entry) => [1000, entry.name] as Term),
    ...decos.map((entry) => [1, entry.name] as Term),
  ]);
  const lp = [
    'Minimize',
    ` cost: ${objective}`,
    'Subject To',
    ...rows,
    'Bounds',
    ...decos.map((entry) => ` 0 <= ${entry.name} <= 18`),
    'Binaries',
    ...gear.map((entry) => ` ${entry.name}`),
    'Generals',
    ...decos.map((entry) => ` ${entry.name}`),
    'End',
  ].join('\n');
  return { lp, gear, decos };
}

function resultFromSolution(
  data: GearData,
  targets: SkillTarget[],
  gear: GearVariable[],
  decos: DecoVariable[],
  values: Record<string, { Primal: number }>,
): SearchResult | null {
  const build = emptyBuild();
  const selectedGear = gear.filter((entry) => values[entry.name]?.Primal > 0.5);
  for (const entry of selectedGear) build[entry.slot] = entry.item.game_id;
  const slots = selectedGear.flatMap((entry) =>
    'slots' in entry.item
      ? entry.item.slots.flatMap((level, index) =>
          level > 0 ? [{ slot: entry.slot, index, level, type: decorationTypeForSlot(entry.slot) }] : [],
        )
      : [],
  );
  const selectedDecos = decos.flatMap((entry) =>
    Array.from({ length: Math.round(values[entry.name]?.Primal ?? 0) }, () => entry.item),
  );
  selectedDecos.sort((a, b) => b.required_slot - a.required_slot);
  for (const deco of selectedDecos) {
    const index = slots.reduce(
      (best, slot, index) =>
        slot.type === deco.type && slot.level >= deco.required_slot && (best < 0 || slot.level < slots[best].level)
          ? index
          : best,
      -1,
    );
    if (index < 0) return null;
    const [slot] = slots.splice(index, 1);
    const placements = build.decorations[slot.slot] ?? [];
    placements[slot.index] = deco.game_id;
    build.decorations[slot.slot] = placements;
  }
  const summary = summarizeBuild(build, data);
  if (targets.some((target) => (summary.skills.get(target.id) ?? 0) < target.level)) return null;
  const targetIds = new Set(targets.map((target) => target.id));
  return {
    build,
    phase: selectedDecos.length ? 2 : build.amulet ? 1 : 0,
    defense: summary.defense,
    resistances: summary.resistances,
    freeSlots: summary.freeSlots,
    skills: [...summary.skills],
    utility: utilityForSkillLevels(summary.skills, targetIds, data.skillNames),
  };
}

export async function findConstraintBuilds(
  data: GearData,
  targets: SkillTarget[],
  weaponType: string | null,
  includeMeldingOnly: boolean,
  limit = 10,
  onResult?: (results: SearchResult[]) => void,
): Promise<SearchResult[]> {
  const excludedDecorations = includeMeldingOnly ? new Set<number>() : new Set(data.meldingOnlyDecorationIds ?? []);
  const artianIds = new Set(data.artianSkills.weaponIds);
  const types = [...new Set(data.weapons.map((weapon) => weapon.weapon_type))].filter(
    (type) => !weaponType || type === weaponType,
  );
  const highs = await loadHighs({ locateFile: () => highsWasmUrl });
  const results: SearchResult[] = [];
  for (const type of types) {
    const weapons = data.weapons.filter(
      (weapon) =>
        weapon.weapon_type === type &&
        !artianIds.has(weapon.game_id) &&
        targets.every((target) => skillUsable(data.skillNames[target.id] ?? '', weapon)),
    );
    if (!weapons.length) continue;
    const representative = weapons[0];
    const usableGear = {
      ...data,
      armor: data.armor.filter((item) =>
        item.skills.every((skill) => skillUsable(data.skillNames[skill.skill_id] ?? '', representative)),
      ),
      amulets: data.amulets.filter((item) =>
        item.skills.every((skill) => skillUsable(data.skillNames[skill.skill_id] ?? '', representative)),
      ),
    };
    const decorations = data.decorations.filter(
      (item) =>
        !excludedDecorations.has(item.game_id) &&
        item.skills.every((skill) => skillUsable(data.skillNames[skill.skill_id] ?? '', representative)),
    );
    const blocked: Set<string>[] = [];
    while (results.length < limit) {
      const model = modelFor(usableGear, targets, weapons, decorations, new Set(), blocked);
      if (!model) break;
      const solved = highs.solve(model.lp, { output_flag: false, time_limit: 10 });
      if (solved.Status !== 'Optimal') break;
      const selected = new Set(
        model.gear
          .filter((entry) => entry.slot !== 'weapon' && solved.Columns[entry.name]?.Primal > 0.5)
          .map((entry) => entry.name),
      );
      blocked.push(selected);
      const result = resultFromSolution(data, targets, model.gear, model.decos, solved.Columns);
      if (!result) continue;
      results.push(result);
      onResult?.([...results]);
    }
    if (results.length >= limit) break;
  }
  return results;
}
