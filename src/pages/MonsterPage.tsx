import { Anchor, Badge, Button, Divider, Group, Modal, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { label } from '../labels';
import { NotFoundPage } from './NotFoundPage';
import { FormattedText } from '../components/FormattedText';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper withBorder p={{ base: 'sm', sm: 'lg' }}>
      <Title order={2} size="h4" mb={{ base: 'xs', sm: 'sm' }}>{title}</Title>
      {children}
    </Paper>
  );
}

export function MonsterPage() {
  const { id } = useParams();
  const { monsterById, itemById, lookups } = useDatabase();
  const [detailType, setDetailType] = useState<'features' | 'tips' | null>(null);
  const monster = monsterById.get(Number(id));
  if (!monster) return <NotFoundPage />;

  const stageName = (stageId: number) => {
    const stage = lookups.stages.find((entry) => entry.game_id === stageId);
    return stage ? text(stage.names) : `ID ${stageId}`;
  };
  const partName = (part: string) => {
    const entry = lookups.partNames.find((candidate) => candidate.part === part);
    return entry ? text(entry.names) : label(part);
  };

  return (
    <Stack className="page-stack" gap="md">
      <div>
        <Group gap="sm">
          <Title order={1} size="h3">{text(monster.names)}</Title>
          <Badge variant="light">{label(monster.species)}</Badge>
        </Group>
        <FormattedText className="long-description" size="sm" mt="xs" style={{ whiteSpace: 'pre-line' }}>{text(monster.descriptions)}</FormattedText>
      </div>

      <SimpleGrid visibleFrom="sm" cols={{ sm: 2 }}>
        <Section title="特徴">
          <FormattedText className="long-description" size="sm" style={{ whiteSpace: 'pre-line' }}>{text(monster.features)}</FormattedText>
        </Section>
        <Section title="攻略の要点">
          <FormattedText className="long-description" size="sm" style={{ whiteSpace: 'pre-line' }}>{text(monster.tips)}</FormattedText>
        </Section>
      </SimpleGrid>

      <Section title="基本情報">
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={{ base: 'xs', sm: 'sm' }}>
          <div><Text size="sm" c="dimmed">基礎体力</Text><Text size="sm" fw={500}>{monster.base_health.toLocaleString('ja-JP')}</Text></div>
          <div><Text size="sm" c="dimmed">基準サイズ</Text><Text size="sm" fw={500}>{monster.size.base?.toFixed(2) ?? '不明'}</Text></div>
          <div><Text size="sm" c="dimmed">最小金冠</Text><Text size="sm" fw={500}>{monster.size.mini?.toFixed(2) ?? '不明'}</Text></div>
          <div><Text size="sm" c="dimmed">最大金冠</Text><Text size="sm" fw={500}>{monster.size.gold?.toFixed(2) ?? '不明'}</Text></div>
        </SimpleGrid>
        <Divider my={{ base: 'sm', sm: 'md' }} />
        <Stack gap="xs">
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Text size="sm" fw={500} w={64} flex="0 0 auto">出現場所</Text>
            <Text size="sm">{monster.locations.map(stageName).join('、') || '不明'}</Text>
          </Group>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Text size="sm" fw={500} w={64} flex="0 0 auto">弱点</Text>
            <Group gap={4}>{monster.weaknesses.length ? monster.weaknesses.map((weakness, index) => {
              const name = weakness.element ?? weakness.status ?? weakness.effect;
              return <Badge key={`${name}-${index}`} size="sm" variant="light">{label(name)} {weakness.level ? '★'.repeat(weakness.level) : ''}</Badge>;
            }) : <Text size="sm">不明</Text>}</Group>
          </Group>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Text size="sm" fw={500} w={64} flex="0 0 auto">耐性</Text>
            <Group gap={4}>{monster.resistances.length ? monster.resistances.map((resistance, index) => {
              const name = resistance.element ?? resistance.status ?? resistance.effect;
              return <Badge key={`${name}-${index}`} size="sm" color="gray" variant="light">{label(name)}</Badge>;
            }) : <Text size="sm">不明</Text>}</Group>
          </Group>
        </Stack>
      </Section>

      <SimpleGrid hiddenFrom="sm" cols={2} spacing="xs">
        <Button variant="light" size="sm" onClick={() => setDetailType('features')}>特徴</Button>
        <Button variant="light" size="sm" onClick={() => setDetailType('tips')}>攻略の要点</Button>
      </SimpleGrid>
      <Modal
        opened={detailType !== null}
        onClose={() => setDetailType(null)}
        title={detailType === 'features' ? '特徴' : '攻略の要点'}
        centered
      >
        <FormattedText className="long-description" size="sm" style={{ whiteSpace: 'pre-line' }}>
          {detailType === 'features' ? text(monster.features) : text(monster.tips)}
        </FormattedText>
      </Modal>

      <Section title="入手できるアイテム">
        <Table.ScrollContainer minWidth={700}>
          <Table className="responsive-table">
            <Table.Thead><Table.Tr><Table.Th>ランク</Table.Th><Table.Th>入手方法</Table.Th><Table.Th>アイテム</Table.Th><Table.Th>個数</Table.Th><Table.Th>確率</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
              {monster.rewards.map((reward, index) => {
                const item = itemById.get(reward.item_id);
                return (
                  <Table.Tr key={`${reward.rank}-${reward.kind}-${reward.item_id}-${index}`}>
                    <Table.Td>{label(reward.rank)}</Table.Td>
                    <Table.Td>{label(reward.kind)}{reward.part ? `: ${partName(reward.part)}` : ''}</Table.Td>
                    <Table.Td>{item ? <Anchor component={Link} to={`/items/${item.game_id}`}>{text(item.names)}</Anchor> : `ID ${reward.item_id}`}</Table.Td>
                    <Table.Td>{reward.amount}</Table.Td>
                    <Table.Td>{reward.chance}%</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Section>

      <Section title="部位と肉質">
        <Table.ScrollContainer minWidth={760}>
          <Table className="responsive-table">
            <Table.Thead><Table.Tr><Table.Th>部位</Table.Th><Table.Th>耐久値</Table.Th><Table.Th>斬</Table.Th><Table.Th>打</Table.Th><Table.Th>弾</Table.Th><Table.Th>火</Table.Th><Table.Th>水</Table.Th><Table.Th>雷</Table.Th><Table.Th>氷</Table.Th><Table.Th>龍</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
              {monster.parts.map((part, index) => (
                <Table.Tr key={`${part.part}-${index}`}>
                  <Table.Td>{partName(part.part)}</Table.Td>
                  <Table.Td>{part.base_health ?? '不明'}</Table.Td>
                  {['slash', 'blunt', 'pierce', 'fire', 'water', 'thunder', 'ice', 'dragon'].map((kind) => (
                    <Table.Td key={kind}>{Math.round((part.multipliers[kind] ?? 0) * 100)}</Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Section>
    </Stack>
  );
}
