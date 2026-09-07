import { Badge, Box, Divider, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useParams } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { formatQuestObjective } from '../formatters';
import { NotFoundPage } from './NotFoundPage';
import { FormattedText } from '../components/FormattedText';

export function QuestPage() {
  const { id } = useParams();
  const { questById, lookups } = useDatabase();
  const quest = questById.get(Number(id));
  if (!quest) return <NotFoundPage />;

  const stageName = (stageId: number) => {
    const stage = lookups.stages.find((entry) => entry.game_id === stageId);
    return stage ? text(stage.names) : `ID ${stageId}`;
  };

  return (
    <Stack className="page-stack" gap="lg">
      <Box visibleFrom="sm">
        <Group gap="sm">
          <Badge variant="light">{quest.category}</Badge>
          <Title order={1} size="h3">{text(quest.names)}</Title>
          <Badge variant="light">難度 {quest.difficulty}</Badge>
        </Group>
      </Box>

      <section id="quest-basic">
        <Box mb="sm">
          <Text size="sm" c="dimmed">目的</Text>
          <FormattedText size="sm" style={{ whiteSpace: 'pre-line' }}>
                {quest.objective?.ja ? formatQuestObjective(quest.objective) : '目的の情報はありません'}
          </FormattedText>
        </Box>
        <FormattedText className="long-description" size="sm" style={{ whiteSpace: 'pre-line' }}>{text(quest.descriptions)}</FormattedText>
        <Divider my={{ base: 'sm', sm: 'md' }} />
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={{ base: 'xs', sm: 'sm' }}>
          <div><Text size="sm" c="dimmed">受注条件</Text><Text size="sm" fw={500}>{quest.order_rank > 0 ? `HR ${quest.order_rank}` : 'なし'}</Text></div>
          <div><Text size="sm" c="dimmed">フィールド</Text><Text size="sm" fw={500}>{quest.locations.map(stageName).join('、') || '不明'}</Text></div>
          <div><Text size="sm" c="dimmed">制限時間</Text><Text size="sm" fw={500}>{quest.time_limit} 分</Text></div>
          <div><Text size="sm" c="dimmed">報酬金</Text><Text size="sm" fw={500}>{quest.reward_money.toLocaleString('ja-JP')} z</Text></div>
          <div><Text size="sm" c="dimmed">HR ポイント</Text><Text size="sm" fw={500}>{quest.hunter_rank_points}</Text></div>
        </SimpleGrid>
      </section>
    </Stack>
  );
}
