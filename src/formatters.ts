import type { LocalizedText } from './types';

export function formatQuestObjective(value: LocalizedText | undefined): string {
  return (value?.ja ?? value?.en ?? '').replace(/([^、\n]+)（歴戦の個体）/gu, '歴戦$1');
}
