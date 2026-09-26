import { Select, Stack, Text } from '@mantine/core';
import type { Dispatch, SetStateAction } from 'react';
import type { Weapon } from '../../types';
import { type Build, type GearData, isVirtualWeapon, type VirtualWeapon } from '../model';

type Props = {
  build: Build;
  setBuild: Dispatch<SetStateAction<Build>>;
  data: GearData;
  weapon: Weapon | VirtualWeapon | null;
};

export function ArtianSkillEditor({ build, setBuild, data, weapon }: Props) {
  const { artianSkills, skillNames } = data;
  const equipped = { weapon };
  const selectedArtianId = isVirtualWeapon(equipped.weapon) ? equipped.weapon.sourceWeaponId : equipped.weapon?.game_id;
  return (
    <>
      {selectedArtianId && artianSkills.weaponIds.includes(selectedArtianId) && (
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            アーティアスキル
          </Text>
          <Select
            searchable
            placeholder="スキルの組み合わせを選択"
            data={artianSkills.skillPairs.map((pair) => ({
              value: `${pair.groupSkillId}.${pair.seriesSkillId}`,
              label: `${skillNames[pair.groupSkillId]}・${skillNames[pair.seriesSkillId]}`,
            }))}
            value={isVirtualWeapon(equipped.weapon) ? build.weapon?.slice(build.weapon.lastIndexOf(':') + 1) : null}
            onChange={(value) =>
              setBuild((current) => ({
                ...current,
                weapon: value ? `artian:${selectedArtianId}:${value}` : selectedArtianId,
                weaponBonuses: [],
                decorations: { ...current.decorations, weapon: [] },
              }))
            }
          />
        </Stack>
      )}
    </>
  );
}
