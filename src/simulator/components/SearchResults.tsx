import { Badge, Button, Divider, Group, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { text } from '../../data';
import type { Decoration, Skill } from '../../types';
import { type Build, equipmentSlots, type GearData, selectedGear } from '../model';
import type { SearchResult } from '../search';

type Props = {
  results: SearchResult[];
  data: GearData;
  skillById: Map<number, Skill>;
  availableLevels: Map<number, number[]>;
  onEdit: (build: Build) => void;
};

export function SearchResults({ results, data, skillById, availableLevels, onEdit }: Props) {
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
            <Text fw={600}>検索結果</Text>
            <Badge variant="light" radius="sm">
              {results.length} 件
            </Badge>
          </Group>
          <Stack gap="xs">
            {results.map((result, index) => {
              const gear = selectedGear(result.build, data);
              return (
                <Stack key={index} gap="xs" py="sm">
                  <Group justify="space-between" align="start">
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Group gap="xs">
                        <Badge variant="light">{index + 1}</Badge>
                        <Text size="sm">
                          防御力 {result.defense}　耐性 {result.resistances.join('/')}　空きスロット{' '}
                          {result.freeSlots.join('・') || 'なし'}　指定外スキル評価 {result.utility}
                        </Text>
                      </Group>
                      <Text size="sm">
                        {[gear.weapon, ...gear.armor, gear.amulet]
                          .map((item) => (item ? text(item.names) : 'なし'))
                          .join(' / ')}
                      </Text>
                      <Text size="xs">
                        装飾品:{' '}
                        {equipmentSlots
                          .flatMap((slot) => result.build.decorations[slot] ?? [])
                          .filter((id): id is number => id !== null)
                          .map((id) => text(decorationById.get(id)?.names))
                          .join('・') || 'なし'}
                      </Text>
                      <Text size="xs">
                        発動スキル:{' '}
                        {result.skills
                          .flatMap(([id, level]) => {
                            const active = activeLevel(id, level);
                            return active ? [`${text(skillById.get(id)?.names)} Lv ${active}`] : [];
                          })
                          .join('・') || 'なし'}
                      </Text>
                    </Stack>
                    <Button size="xs" variant="light" onClick={() => onEdit(result.build)}>
                      編集する
                    </Button>
                  </Group>
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
