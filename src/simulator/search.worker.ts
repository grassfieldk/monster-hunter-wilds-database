import type { GearData, SkillTarget, SortMode } from './model';
import { searchBuilds } from './search';

self.onmessage = (
  event: MessageEvent<{ data: GearData; targets: SkillTarget[]; sort: SortMode; weaponType: string | null }>,
) => {
  try {
    self.postMessage({
      results: searchBuilds(event.data.data, event.data.targets, event.data.sort, event.data.weaponType, (progress) =>
        self.postMessage({ progress }),
      ),
    });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '検索に失敗しました' });
  }
};
