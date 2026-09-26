import { Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';
import { text } from '../data';
import { formatQuestObjective } from '../formatters';
import type { Monster, Quest } from '../types';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

export function createMonsterNameMap(monsters: Iterable<Monster>) {
  const names = new Map<string, number>();
  for (const monster of monsters) {
    const name = text(monster.names);
    if (name === '名称不明') continue;
    names.set(name, monster.game_id);
    names.set(formatQuestObjective(monster.names), monster.game_id);
  }
  return names;
}

export function QuestObjective({
  quest,
  monsters,
  monsterNames,
  breakOnComma = false,
}: {
  quest: Quest;
  monsters: Map<number, Monster>;
  monsterNames?: Map<string, number>;
  breakOnComma?: boolean;
}) {
  const objective = formatQuestObjective(quest.objective);
  if (!objective) return '目的の情報はありません';

  const names = new Map(monsterNames ?? createMonsterNameMap(monsters.values()));
  for (const target of quest.target_monsters) {
    if (!monsters.has(target.game_id)) continue;
    const name = text(target.names);
    names.set(name, target.game_id);
    names.set(formatQuestObjective(target.names), target.game_id);
  }
  const alternatives = [...names.keys()].filter(Boolean).sort((a, b) => b.length - a.length);
  const value = breakOnComma ? objective.replace(/、/gu, '\n') : objective;
  if (!alternatives.length) return value;

  const pattern = new RegExp(`(${alternatives.map(escapeRegExp).join('|')})`, 'gu');
  return value.split(pattern).map((segment, index) => {
    const monsterId = names.get(segment);
    return monsterId === undefined ? (
      segment
    ) : (
      <Anchor key={index} component={Link} to={`/monsters/${monsterId}`}>
        {segment}
      </Anchor>
    );
  });
}
