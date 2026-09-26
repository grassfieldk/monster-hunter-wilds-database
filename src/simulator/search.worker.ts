import type { GearData, SkillTarget, SortMode } from './model';
import { searchBuilds } from './search';

self.onmessage = (
  event: MessageEvent<{
    data: GearData;
    targets: SkillTarget[];
    sort: SortMode;
    weaponType: string | null;
    weaponRequired: boolean;
    includeMeldingOnly: boolean;
    seriesTargets: SkillTarget[];
  }>,
) => {
  try {
    self.postMessage({
      results: searchBuilds(
        event.data.data,
        event.data.targets,
        event.data.sort,
        event.data.weaponType,
        (progress) => self.postMessage({ progress }),
        event.data.weaponRequired,
        event.data.includeMeldingOnly,
        event.data.seriesTargets,
      ),
    });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '検索に失敗しました' });
  }
};
