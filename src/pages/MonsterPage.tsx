import { ActionIcon, Anchor, Badge, Divider, Group, Modal, SimpleGrid, Stack, Table, Tabs, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { label } from '../labels';
import { NotFoundPage } from './NotFoundPage';
import { FormattedText } from '../components/FormattedText';

const rewardRanks = ['low', 'high', 'master'] as const;
type RewardRank = (typeof rewardRanks)[number];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <Title order={2} size="h4" mb="sm" className="section-title">{title}</Title>
      {children}
    </section>
  );
}

export function MonsterPage() {
  const { id } = useParams();
  const { monsterById, itemById, lookups } = useDatabase();
  const [infoOpened, setInfoOpened] = useState(false);
  const [selectedRewardRank, setSelectedRewardRank] = useState<RewardRank | null>(null);
  const monster = monsterById.get(Number(id));
  if (!monster) return <NotFoundPage />;

  const monsterName = text(monster.names);
  const epithet = text(monster.features).match(/≪([^≫]+)≫/u)?.[1];
  const epithetReading = epithet?.match(/^(.+?)（(.+?)）$/u);
  const availableRewardRanks = new Set(monster.rewards.map((reward) => reward.rank));
  const activeRewardRank = selectedRewardRank && availableRewardRanks.has(selectedRewardRank)
    ? selectedRewardRank
    : rewardRanks.find((rank) => availableRewardRanks.has(rank)) ?? rewardRanks[0];

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
      <div>
        <Group gap="sm" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="wrap">
            <Title order={1} size="h3">
              {monsterName}
              {epithet && (
                <>
                  {' '}
                  {epithetReading ? (
                    <ruby className="monster-epithet">
                      {epithetReading[1]}
                      <rt>{epithetReading[2]}</rt>
                    </ruby>
                  ) : <span className="monster-epithet">{epithet}</span>}
                </>
              )}
            </Title>
            <Badge variant="light">{label(monster.species)}</Badge>
          </Group>
          <ActionIcon variant="light" size="sm" aria-label="説明を表示" onClick={() => setInfoOpened(true)}>
            ?
          </ActionIcon>
        </Group>
      </div>

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

      <Modal
        opened={infoOpened}
        onClose={() => setInfoOpened(false)}
        title="モンスター情報"
        centered
      >
        <Stack gap="md">
          <div>
            <Text fw={500} size="sm" mb={4}>説明</Text>
            <FormattedText className="long-description" size="sm" style={{ whiteSpace: 'pre-line' }}>{text(monster.descriptions)}</FormattedText>
          </div>
          <div>
            <Text fw={500} size="sm" mb={4}>特徴</Text>
            <FormattedText className="long-description" size="sm" style={{ whiteSpace: 'pre-line' }}>{text(monster.features)}</FormattedText>
          </div>
          <div>
            <Text fw={500} size="sm" mb={4}>攻略の要点</Text>
            <FormattedText className="long-description" size="sm" style={{ whiteSpace: 'pre-line' }}>{text(monster.tips)}</FormattedText>
          </div>
        </Stack>
      </Modal>

      <Section title="入手できるアイテム">
        <Tabs value={activeRewardRank} onChange={(value) => value && setSelectedRewardRank(value as RewardRank)}>
          <Tabs.List grow>
            {rewardRanks.map((rank) => (
              <Tabs.Tab key={rank} value={rank} disabled={!availableRewardRanks.has(rank)}>{label(rank)}</Tabs.Tab>
            ))}
          </Tabs.List>
          <Tabs.Panel value={activeRewardRank} pt="sm">
            {monster.rewards.some((reward) => reward.rank === activeRewardRank) ? (
              <Table.ScrollContainer minWidth={520}>
                <Table layout="fixed">
                  <colgroup>
                    <col style={{ width: '42%' }} />
                    <col style={{ width: '46%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>
                  <Table.Thead><Table.Tr><Table.Th>入手方法</Table.Th><Table.Th>アイテム</Table.Th><Table.Th className="numeric-cell">確率</Table.Th></Table.Tr></Table.Thead>
                  <Table.Tbody>
                    {monster.rewards.filter((reward) => reward.rank === activeRewardRank).map((reward, index) => {
                      const item = itemById.get(reward.item_id);
                      return (
                        <Table.Tr key={`${reward.rank}-${reward.kind}-${reward.item_id}-${index}`}>
                          <Table.Td>{label(reward.kind)}{reward.part ? `: ${partName(reward.part)}` : ''}</Table.Td>
                          <Table.Td>{item ? <><Anchor component={Link} to={`/items/${item.game_id}`}>{text(item.names)}</Anchor> x{reward.amount}</> : `ID ${reward.item_id} x${reward.amount}`}</Table.Td>
                          <Table.Td className="numeric-cell">{reward.chance}%</Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            ) : <Text size="sm" c="dimmed">このランクの入手情報はありません</Text>}
          </Tabs.Panel>
        </Tabs>
      </Section>

      <Section title="部位と肉質">
        <Table.ScrollContainer minWidth={576}>
          <Table layout="fixed" style={{ width: 576 }}>
            <colgroup>
              <col style={{ width: 128 }} />
              <col style={{ width: 64 }} />
              <col span={8} style={{ width: 48 }} />
            </colgroup>
            <Table.Thead><Table.Tr><Table.Th>部位</Table.Th><Table.Th className="numeric-cell">耐久値</Table.Th><Table.Th className="numeric-cell">斬</Table.Th><Table.Th className="numeric-cell">打</Table.Th><Table.Th className="numeric-cell">弾</Table.Th><Table.Th className="numeric-cell">火</Table.Th><Table.Th className="numeric-cell">水</Table.Th><Table.Th className="numeric-cell">雷</Table.Th><Table.Th className="numeric-cell">氷</Table.Th><Table.Th className="numeric-cell">龍</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
              {monster.parts.map((part, index) => (
                <Table.Tr key={`${part.part}-${index}`}>
                  <Table.Td>{partName(part.part)}</Table.Td>
                  <Table.Td className="numeric-cell">{part.base_health ?? '不明'}</Table.Td>
                  {['slash', 'blunt', 'pierce', 'fire', 'water', 'thunder', 'ice', 'dragon'].map((kind) => (
                    <Table.Td key={kind} className="numeric-cell">{Math.round((part.multipliers[kind] ?? 0) * 100)}</Table.Td>
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
