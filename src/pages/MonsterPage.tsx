import { Badge, Box, Group, Stack, Title } from '@mantine/core';
import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { MonsterEpithet } from '../components/MonsterEpithet';
import { MonsterBasicSection } from '../components/monster/MonsterBasicSection';
import { MonsterHitzonesSection } from '../components/monster/MonsterHitzonesSection';
import { MonsterRewardsSection, type RewardRank } from '../components/monster/MonsterRewardsSection';
import { monsterEpithet, text, useDatabase } from '../data';
import { label } from '../labels';
import { detailSections, useDetailSection } from '../sections';
import { NotFoundPage } from './NotFoundPage';

export function MonsterPage() {
  const { id } = useParams();
  const { hash } = useLocation();
  const { monsterById, itemById, lookups } = useDatabase();
  const [selectedRewardRank, setSelectedRewardRank] = useState<RewardRank | null>(null);
  const section = hash.slice(1);
  const sections = detailSections.monster;
  const activeSection = useDetailSection('monster', section, sections);
  const monster = monsterById.get(Number(id));
  if (!monster) return <NotFoundPage />;

  const monsterName = text(monster.names);
  const epithet = monsterEpithet(monster);
  const stageName = (stageId: number) => {
    const stage = lookups.stages.find((entry) => entry.game_id === stageId);
    return stage ? text(stage.names) : `ID ${stageId}`;
  };
  const partName = (part: string) => {
    const entry = lookups.partNames.find((candidate) => candidate.part === part);
    return entry ? text(entry.names) : label(part);
  };

  return (
    <Stack className="page-stack" gap="lg">
      <Box visibleFrom="sm">
        <Group gap="sm" wrap="wrap">
          <Title order={1} size="h3">
            {monsterName}
            {epithet && (
              <>
                {' '}
                <MonsterEpithet value={epithet} className="monster-epithet" />
              </>
            )}
          </Title>
          <Badge variant="light">{label(monster.species)}</Badge>
        </Group>
      </Box>

      {activeSection === 'monster-basic' && <MonsterBasicSection monster={monster} stageName={stageName} />}

      {activeSection === 'monster-rewards' && (
        <MonsterRewardsSection
          monster={monster}
          itemById={itemById}
          partName={partName}
          selectedRewardRank={selectedRewardRank}
          onRewardRankChange={setSelectedRewardRank}
        />
      )}

      {activeSection === 'monster-hitzones' && <MonsterHitzonesSection monster={monster} partName={partName} />}
    </Stack>
  );
}
