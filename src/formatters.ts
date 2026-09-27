import { text } from './data';
import type { EquipmentSkill, LocalizedText, Skill } from './types';

export function formatQuestObjective(value: LocalizedText | undefined): string {
  return (value?.ja ?? value?.en ?? '')
    .replace(/([^、\n]+)（歴戦の個体）/gu, '歴戦$1')
    .split('、')
    .map((objective) => {
      const counted = objective.match(/^(.+?)\s*(\d+)\s*(?:体|頭|匹)の(狩猟|討伐|捕獲|撃退)$/u);
      if (counted) return `${counted[3]}: ${counted[1]} x${counted[2]}`;

      const uncounted = objective.match(/^(.+?)の(狩猟|討伐|捕獲|撃退)$/u);
      if (uncounted) return `${uncounted[2]}: ${uncounted[1]}`;

      return objective;
    })
    .join('、');
}

export function formatEquipmentSkills(skills: EquipmentSkill[], skillById: Map<number, Skill>) {
  return (
    skills
      .map(({ skill_id, level }) => {
        const skill = skillById.get(skill_id);
        return `${skill ? text(skill.names) : `ID ${skill_id}`} Lv ${level}`;
      })
      .join('、') || 'なし'
  );
}
