import type { QuestCategory } from './types';

export const questCategoryOrder = ['任務', 'フリー', 'イベント', '闘技大会', 'その他'] as const;

export function getQuestCategories(quests: readonly { category: QuestCategory }[]) {
  const available = new Set(quests.map((quest) => quest.category));
  return questCategoryOrder.filter((category) => available.has(category));
}
