import { text } from '../../data';
import type { Amulet, Skill } from '../../types';

export type AmuletGroup = {
  amulet_type: number;
  items: Amulet[];
};

export function amuletName(amulet: Amulet) {
  return text(amulet.names).replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/u, '');
}

export function groupAmulets(amulets: Amulet[]) {
  const groups = new Map<number, Amulet[]>();
  for (const amulet of amulets) groups.set(amulet.amulet_type, [...(groups.get(amulet.amulet_type) ?? []), amulet]);
  return [...groups.entries()]
    .map(([amulet_type, items]) => ({ amulet_type, items: items.sort((a, b) => a.level - b.level) }))
    .sort((a, b) => Number(a.amulet_type) - Number(b.amulet_type));
}

export function AmuletLevelMarks({ items }: { items: Amulet[] }) {
  const levels = new Set(items.map((item) => item.level));
  const levelLabel = [...levels].sort((a, b) => a - b).join('、');
  return (
    <span className="amulet-level-marks" role="img" aria-label={`存在するレベル: ${levelLabel}`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index + 1}
          className="amulet-level-mark"
          data-active={levels.has(index + 1) || undefined}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function formatAmuletSkills(items: Amulet[], skillById: Map<number, Skill>) {
  const names = new Set<string>();
  for (const item of items) {
    for (const skill of item.skills) {
      const definition = skillById.get(skill.skill_id);
      names.add(definition ? text(definition.names) : `ID ${skill.skill_id}`);
    }
    const effect = text(item.descriptions).match(/装備することで(.+?)が発動/u)?.[1] ?? '';
    for (const match of effect.matchAll(/([^と]+?)スキル/gu)) names.add(match[1]);
  }
  return [...names].join('、') || 'なし';
}
