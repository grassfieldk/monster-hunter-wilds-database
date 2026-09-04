import { Anchor, Badge, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { Link, useParams } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { label } from '../labels';
import { NotFoundPage } from './NotFoundPage';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper withBorder p={{ base: 'md', sm: 'lg' }}>
      <Title order={2} size="h3" mb="md">{title}</Title>
      {children}
    </Paper>
  );
}

export function MonsterPage() {
  const { id } = useParams();
  const { monsterById, itemById, lookups } = useDatabase();
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
    <Stack gap="lg">
      <div>
        <Group gap="sm">
          <Title order={1}>{text(monster.names)}</Title>
          <Badge variant="light" size="lg">{label(monster.species)}</Badge>
        </Group>
        <Text mt="sm" style={{ whiteSpace: 'pre-line' }}>{text(monster.descriptions)}</Text>
      </div>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Section title="特徴">
          <Text style={{ whiteSpace: 'pre-line' }}>{text(monster.features)}</Text>
        </Section>
        <Section title="攻略の要点">
          <Text style={{ whiteSpace: 'pre-line' }}>{text(monster.tips)}</Text>
        </Section>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Section title="基本情報">
          <Table>
            <Table.Tbody>
              <Table.Tr><Table.Th>基礎体力</Table.Th><Table.Td>{monster.base_health.toLocaleString('ja-JP')}</Table.Td></Table.Tr>
              <Table.Tr><Table.Th>基準サイズ</Table.Th><Table.Td>{monster.size.base?.toFixed(2) ?? '不明'}</Table.Td></Table.Tr>
              <Table.Tr><Table.Th>最小金冠</Table.Th><Table.Td>{monster.size.mini?.toFixed(2) ?? '不明'}</Table.Td></Table.Tr>
              <Table.Tr><Table.Th>最大金冠</Table.Th><Table.Td>{monster.size.gold?.toFixed(2) ?? '不明'}</Table.Td></Table.Tr>
              <Table.Tr><Table.Th>出現場所</Table.Th><Table.Td>{monster.locations.map(stageName).join('、') || '不明'}</Table.Td></Table.Tr>
            </Table.Tbody>
          </Table>
        </Section>
        <Section title="弱点と耐性">
          <Stack gap="sm">
            <div>
              <Text fw={500} mb={6}>有効</Text>
              <Group gap="xs">
                {monster.weaknesses.map((weakness, index) => {
                  const name = weakness.element ?? weakness.status ?? weakness.effect;
                  return <Badge key={`${name}-${index}`} variant="light">{label(name)} {weakness.level ? '★'.repeat(weakness.level) : ''}</Badge>;
                })}
              </Group>
            </div>
            <div>
              <Text fw={500} mb={6}>無効</Text>
              <Group gap="xs">
                {monster.resistances.map((resistance, index) => {
                  const name = resistance.element ?? resistance.status ?? resistance.effect;
                  return <Badge key={`${name}-${index}`} color="gray" variant="light">{label(name)}</Badge>;
                })}
              </Group>
            </div>
          </Stack>
        </Section>
      </SimpleGrid>

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
