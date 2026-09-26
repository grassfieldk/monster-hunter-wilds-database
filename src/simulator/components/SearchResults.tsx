import { ActionIcon, Badge, Divider, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { useMemo } from 'react';
import { SkillDescriptionTooltip } from '../../components/SkillDescriptionTooltip';
import { text } from '../../data';
import type { Decoration, Skill } from '../../types';
import { type Build, equipmentSlots, formatSlotLevels, type GearData, type SkillTarget, selectedGear } from '../model';
import type { SearchResult } from '../search';
import { SkillLevelMarks, skillSlotCount } from './SkillLevelMarks';

type Props = {
  results: SearchResult[];
  searchedTargets: SkillTarget[];
  data: GearData;
  skillById: Map<number, Skill>;
  availableLevels: Map<number, number[]>;
  unusableSkillIds: Set<number>;
  limitReached: boolean;
  searching: boolean;
  onEdit: (build: Build) => void;
};

const equipmentLabels = ['武器', '頭', '胴', '腕', '腰', '脚', '護石'];

export function SearchResults({
  results,
  searchedTargets,
  data,
  skillById,
  availableLevels,
  unusableSkillIds,
  limitReached,
  searching,
  onEdit,
}: Props) {
  const slotCount = skillSlotCount(availableLevels);
  const searchedIds = useMemo(() => new Set(searchedTargets.map((target) => target.id)), [searchedTargets]);
  const decorationById = useMemo(
    () => new Map<number, Decoration>(data.decorations.map((item) => [item.game_id, item])),
    [data],
  );
  const activeLevel = (id: number, level: number) =>
    availableLevels
      .get(id)
      ?.filter((value) => value <= level)
      .at(-1) ?? null;
  return (
    <>
      {results.length > 0 && (
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={600}>{searching ? '検索中の結果' : '検索結果'}</Text>
            <Badge variant="light" radius="sm">
              上位 {results.length} 件
            </Badge>
          </Group>
          {limitReached && (
            <Text size="xs" c="dimmed">
              200 件で探索を終了しました。順位は探索済みの候補内での比較です
            </Text>
          )}
          <Stack gap="xs">
            {results.map((result, index) => {
              const gear = selectedGear(result.build, data);
              const equipment = [gear.weapon, ...gear.armor, gear.amulet];
              const activeSkills = result.skills.filter(([id, level]) => activeLevel(id, level) !== null);
              return (
                <Stack key={index} gap="xs" py="sm">
                  <Group gap="xs">
                    <Badge variant="light">装備 {index + 1}</Badge>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      aria-label={`装備 ${index + 1} を編集`}
                      title="編集する"
                      onClick={() => onEdit(result.build)}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Group>
                  <Group gap="xs">
                    <Text size="sm">防御力 {result.defense}</Text>
                    <Text size="sm">耐性 {result.resistances.join(' / ')}</Text>
                    <Text size="sm">空きスロット {formatSlotLevels(result.freeSlots)}</Text>
                  </Group>
                  <Stack gap={0} className="simulator-result-equipment">
                    {equipment.map((item, slotIndex) => {
                      if (!item) return null;
                      const slot = equipmentSlots[slotIndex];
                      const slotLevels = 'slots' in item ? item.slots : [];
                      return (
                        <div key={slot} className="simulator-result-equipment-row">
                          <Text size="xs" c="dimmed">
                            {equipmentLabels[slotIndex]}
                          </Text>
                          <div className="simulator-result-equipment-detail">
                            <Text size="sm" fw={500} style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                              {text(item.names)}
                            </Text>
                            {slotLevels.some((level) => level > 0) && (
                              <Stack gap={2}>
                                {slotLevels.map((level, decorationIndex) => {
                                  if (level <= 0) return null;
                                  const decorationId = result.build.decorations[slot]?.[decorationIndex] ?? null;
                                  return (
                                    <Group key={decorationIndex} gap={4} wrap="nowrap" align="start">
                                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                                        （{level}）
                                      </Text>
                                      <Text
                                        size="xs"
                                        c={decorationId === null ? 'dimmed' : undefined}
                                        style={{ minWidth: 0, overflowWrap: 'anywhere' }}
                                      >
                                        {decorationId === null ? '空き' : text(decorationById.get(decorationId)?.names)}
                                      </Text>
                                    </Group>
                                  );
                                })}
                              </Stack>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </Stack>
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">
                      発動スキル
                    </Text>
                    {activeSkills.length ? (
                      <SimpleGrid cols={2} spacing="xs">
                        {activeSkills.map(([id, level]) => (
                          <Group
                            key={id}
                            gap={4}
                            wrap="nowrap"
                            justify="space-between"
                            className={unusableSkillIds.has(id) ? 'simulator-skill-unusable' : undefined}
                          >
                            <Text
                              size="xs"
                              fw={searchedIds.has(id) ? 700 : undefined}
                              c={searchedIds.has(id) && !unusableSkillIds.has(id) ? 'sand.2' : undefined}
                              style={{ minWidth: 0, overflowWrap: 'anywhere' }}
                            >
                              <SkillDescriptionTooltip skillId={id} level={activeLevel(id, level) ?? level}>
                                {text(skillById.get(id)?.names)}
                              </SkillDescriptionTooltip>
                            </Text>
                            <SkillLevelMarks
                              level={activeLevel(id, level) ?? 0}
                              maxLevel={availableLevels.get(id)?.at(-1) ?? level}
                              slotCount={slotCount}
                            />
                          </Group>
                        ))}
                      </SimpleGrid>
                    ) : (
                      <Text size="xs">なし</Text>
                    )}
                  </Stack>
                  <Text size="xs" c="dimmed">
                    指定外スキル評価 {result.utility}
                  </Text>
                  {index < results.length - 1 && <Divider />}
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      )}
    </>
  );
}
