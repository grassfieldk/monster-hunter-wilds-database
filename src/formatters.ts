import { text } from './data';
import type { EquipmentSkill, LocalizedText, Skill } from './types';

export function formatQuestObjective(value: LocalizedText | undefined): string {
  return (value?.ja ?? value?.en ?? '').replace(/([^、\n]+)（歴戦の個体）/gu, '歴戦$1');
}

export function formatEquipmentSkills(skills: EquipmentSkill[], skillById: Map<number, Skill>) {
  return skills.map(({ skill_id, level }) => {
    const skill = skillById.get(skill_id);
    return `${skill ? text(skill.names) : `ID ${skill_id}`} Lv ${level}`;
  }).join('、') || 'なし';
}
