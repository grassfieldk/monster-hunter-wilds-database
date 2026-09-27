import { Tooltip } from '@mantine/core';
import type { ReactNode } from 'react';
import { text, useDatabase } from '../data';
import type { EquipmentSkill, Skill } from '../types';

export function SkillDescriptionTooltip({
  skillId,
  level,
  children,
  underline = true,
}: {
  skillId: number | undefined;
  level?: number;
  children: ReactNode;
  underline?: boolean;
}) {
  const { skillById, skillLevels } = useDatabase();
  const effect =
    level === undefined
      ? undefined
      : skillLevels
          .filter((entry) => entry.skill_id === skillId && entry.level <= level)
          .sort((a, b) => b.level - a.level)[0];
  const effectDescription = effect ? text(effect.descriptions) : '';
  const skillDescription = skillById.get(skillId ?? NaN)?.descriptions;
  const description =
    effectDescription && !effectDescription.startsWith('#Rejected#')
      ? effectDescription
      : skillDescription
        ? text(skillDescription)
        : '';
  if (!description || description.startsWith('#Rejected#')) return <>{children}</>;
  return (
    <Tooltip label={description} multiline maw={320} events={{ hover: true, focus: true, touch: true }}>
      <button
        type="button"
        style={{
          padding: 0,
          border: 0,
          background: 'none',
          color: 'inherit',
          font: 'inherit',
          textAlign: 'inherit',
          cursor: 'help',
          textDecoration: underline ? 'underline dotted' : 'none',
          textUnderlineOffset: underline ? 3 : undefined,
        }}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function EquipmentSkills({ skills, skillById }: { skills: EquipmentSkill[]; skillById: Map<number, Skill> }) {
  if (!skills.length) return 'なし';
  return skills.map((skill, index) => (
    <span key={`${skill.skill_id}:${index}`}>
      {index > 0 && '、'}
      <SkillDescriptionTooltip skillId={skill.skill_id} level={skill.level}>
        {text(skillById.get(skill.skill_id)?.names) || `ID ${skill.skill_id}`} Lv {skill.level}
      </SkillDescriptionTooltip>
    </span>
  ));
}
