import { Button, Group, Stack, Text } from '@mantine/core';
import type { Dispatch, SetStateAction } from 'react';
import { OptionPicker } from '../../components/OptionPicker';
import type { Weapon } from '../../types';
import { type Build, type GearData, isVirtualWeapon, type VirtualWeapon } from '../model';

type Props = {
  build: Build;
  setBuild: Dispatch<SetStateAction<Build>>;
  data: GearData;
  weapon: Weapon | VirtualWeapon | null;
};

export function ArtianBonusEditor({ build, setBuild, data, weapon }: Props) {
  const { artianSkills } = data;
  const equipped = { weapon };
  return (
    <>
      {isVirtualWeapon(equipped.weapon) && (
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            アーティア武器の復元強化
          </Text>
          {(build.weaponBonuses ?? []).map((id, index) => (
            <Group key={index} gap="xs" wrap="wrap">
              <OptionPicker
                ariaLabel={`復元強化 ${index + 1}`}
                value={String(id)}
                data={artianSkills.bonuses
                  .filter(
                    (bonus) =>
                      bonus.gogmaMax > 0 &&
                      (bonus.id === id ||
                        (build.weaponBonuses ?? []).filter((value) => value === bonus.id).length < bonus.gogmaMax),
                  )
                  .map((bonus) => ({ value: String(bonus.id), label: bonus.name }))}
                onChange={(value) =>
                  setBuild((current) => ({
                    ...current,
                    weaponBonuses: (current.weaponBonuses ?? []).map((entry, at) =>
                      at === index ? Number(value) : entry,
                    ),
                  }))
                }
                style={{ flex: '1 1 12rem', minWidth: 0 }}
              />
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() =>
                  setBuild((current) => ({
                    ...current,
                    weaponBonuses: (current.weaponBonuses ?? []).filter((_, at) => at !== index),
                  }))
                }
              >
                削除
              </Button>
            </Group>
          ))}
          {(build.weaponBonuses?.length ?? 0) < 5 && (
            <Button
              size="xs"
              variant="light"
              onClick={() =>
                setBuild((current) => ({
                  ...current,
                  weaponBonuses: [
                    ...(current.weaponBonuses ?? []),
                    artianSkills.bonuses.find(
                      (bonus) => bonus.gogmaMax > (current.weaponBonuses ?? []).filter((id) => id === bonus.id).length,
                    )?.id ?? 9,
                  ],
                }))
              }
            >
              強化を追加
            </Button>
          )}
        </Stack>
      )}
    </>
  );
}
