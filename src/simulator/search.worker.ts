import { findConstraintBuilds } from './constraintSearch';
import type { GearData, SkillTarget, SortMode } from './model';
import { compareSearchResults, type SearchResult, searchBuilds } from './search';

self.onmessage = async (
  event: MessageEvent<{
    data: GearData;
    targets: SkillTarget[];
    sort: SortMode;
    weaponType: string | null;
    weaponRequired: boolean;
    includeMeldingOnly: boolean;
    seriesTargets: SkillTarget[];
    includeArtian: boolean;
  }>,
) => {
  try {
    if (event.data.targets.length >= 10 && !event.data.seriesTargets.length) {
      let results: SearchResult[] = [];
      try {
        results = await findConstraintBuilds(
          event.data.data,
          event.data.targets,
          event.data.weaponType,
          event.data.includeMeldingOnly,
          10,
          (found) =>
            self.postMessage({
              progress: {
                stage: 'searching',
                visited: found.length,
                found: found.length,
                lowerBound: true,
                results: [...found].sort((a, b) => compareSearchResults(a, b, event.data.sort)),
              },
            }),
        );
      } catch {
        results = [];
      }
      if (results.length) {
        self.postMessage({ results: results.sort((a, b) => compareSearchResults(a, b, event.data.sort)) });
        return;
      }
    }
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
        false,
        event.data.includeArtian,
      ),
    });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '検索に失敗しました' });
  }
};
