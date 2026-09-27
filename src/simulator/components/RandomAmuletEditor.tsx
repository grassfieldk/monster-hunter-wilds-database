import { Button, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import type { Dispatch, SetStateAction } from 'react';
import { OptionPicker } from '../../components/OptionPicker';
import { type Build, defaultRandomAmuletId, type GearData } from '../model';

type Props = { build: Build; setBuild: Dispatch<SetStateAction<Build>>; data: GearData };

export function RandomAmuletEditor({ build, setBuild, data }: Props) {
  const { randomAmulets, skillNames } = data;
  const randomParts = build.amulet?.startsWith('random-amulet:') ? build.amulet.split(':') : null;
  const randomComboIndex = randomParts ? Number(randomParts[1]) : null;
  const randomCombo = randomComboIndex === null ? null : randomAmulets.combos[randomComboIndex];
  return (
    <Stack gap="xs">
      <Text size="sm">鑑定護石</Text>
      <Group gap="xs">
        <Button
          size="xs"
          variant="light"
          onClick={() =>
            setBuild((current) => ({
              ...current,
              amulet: defaultRandomAmuletId(randomAmulets, 0),
              decorations: { ...current.decorations, amulet: [] },
            }))
          }
        >
          鑑定護石を設定
        </Button>
      </Group>
      {randomCombo && randomParts && (
        <>
          <OptionPicker
            label="レア度・スロット"
            data={randomAmulets.combos.map((combo, index) => ({
              value: String(index),
              label: `レア ${combo.rarity}　${combo.slots.map((slot) => `${slot.type === -1638455296 ? '武器' : '防具'}（${slot.level}）`).join('・') || 'スロットなし'}　組 ${combo.groups.join('-')}`,
            }))}
            value={String(randomComboIndex)}
            onChange={(value) => {
              if (value !== null)
                setBuild((current) => ({
                  ...current,
                  amulet: defaultRandomAmuletId(randomAmulets, Number(value)),
                  decorations: { ...current.decorations, amulet: [] },
                }));
            }}
          />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
            {randomCombo.groups.map((group, index) =>
              group === 0 ? (
                <Stack key={index} gap={4}>
                  <Text size="sm">スキル {index + 1}</Text>
                  <Text size="sm" c="dimmed">
                    なし
                  </Text>
                </Stack>
              ) : (
                <OptionPicker
                  key={index}
                  label={`スキル ${index + 1}`}
                  data={randomAmulets.groups[group]
                    .filter(
                      (skill) =>
                        !randomParts
                          .slice(2)
                          .some((entry, at) => at !== index && Number(entry.split('.')[0]) === skill.skill_id),
                    )
                    .map((skill) => ({
                      value: `${skill.skill_id}.${skill.level}`,
                      label: `${skillNames[skill.skill_id]} Lv ${skill.level}`,
                    }))}
                  value={randomParts[index + 2]}
                  onChange={(value) => {
                    if (value)
                      setBuild((current) => {
                        const parts = current.amulet?.split(':') ?? [];
                        parts[index + 2] = value;
                        return { ...current, amulet: parts.join(':') };
                      });
                  }}
                />
              ),
            )}
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
}
