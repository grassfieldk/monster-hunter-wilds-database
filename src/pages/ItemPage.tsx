import { Anchor, Badge, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { Link, useParams } from 'react-router-dom';
import { label } from '../labels';
import { text, useDatabase } from '../data';
import { NotFoundPage } from './NotFoundPage';
import { FormattedText } from '../components/FormattedText';

export function ItemPage() {
  const { id } = useParams();
  const { itemById, monsters, itemUses } = useDatabase();
  const item = itemById.get(Number(id));
  if (!item) return <NotFoundPage />;

  const monsterSources = monsters.flatMap((monster) =>
    monster.rewards
      .filter((reward) => reward.item_id === item.game_id)
      .map((reward, index) => ({ monster, reward, index })),
  );
  const uses = itemUses[String(item.game_id)] ?? [];

  return (
    <Stack className="page-stack" gap="md">
      <div>
        <Group gap="sm">
          <Title order={1} size="h3">{text(item.names)}</Title>
          <Badge variant="light">RARE {item.rarity}</Badge>
        </Group>
        <Text c="dimmed" mt={4}>{label(item.kind)}</Text>
        <FormattedText className="long-description" size="sm" mt="sm" style={{ whiteSpace: 'pre-line' }}>{text(item.descriptions)}</FormattedText>
      </div>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper withBorder p={{ base: 'sm', sm: 'lg' }}>
          <Title order={2} size="h3" mb={{ base: 'sm', sm: 'md' }}>基本情報</Title>
          <Table>
            <Table.Tbody>
              <Table.Tr><Table.Th>所持上限</Table.Th><Table.Td>{item.max_count}</Table.Td></Table.Tr>
              <Table.Tr><Table.Th>購入価格</Table.Th><Table.Td>{item.buy_price ? `${item.buy_price.toLocaleString('ja-JP')} z` : '購入不可'}</Table.Td></Table.Tr>
              <Table.Tr><Table.Th>売却価格</Table.Th><Table.Td>{item.sell_price.toLocaleString('ja-JP')} z</Table.Td></Table.Tr>
            </Table.Tbody>
          </Table>
        </Paper>
        <Paper withBorder p={{ base: 'sm', sm: 'lg' }}>
          <Title order={2} size="h3" mb={{ base: 'sm', sm: 'md' }}>調合</Title>
          {item.recipes.length ? (
            <Stack>
              {item.recipes.map((recipe, index) => (
                <Group key={index} gap="xs">
                  {recipe.inputs.map((inputId, inputIndex) => {
                    const input = itemById.get(inputId);
                    return (
                      <Group key={`${inputId}-${inputIndex}`} gap="xs">
                        {inputIndex > 0 && <Text>+</Text>}
                        {input ? <Anchor component={Link} to={`/items/${inputId}`}>{text(input.names)}</Anchor> : <Text>ID {inputId}</Text>}
                      </Group>
                    );
                  })}
                  <Text>→ {text(item.names)} {recipe.amount} 個</Text>
                </Group>
              ))}
            </Stack>
          ) : <Text c="dimmed">調合では作成できません</Text>}
        </Paper>
      </SimpleGrid>

      <Paper withBorder p={{ base: 'sm', sm: 'lg' }}>
        <Title order={2} size="h3" mb={{ base: 'sm', sm: 'md' }}>入手方法</Title>
        {monsterSources.length ? (
          <Table.ScrollContainer minWidth={640}>
            <Table>
              <Table.Thead><Table.Tr><Table.Th>モンスター</Table.Th><Table.Th>ランク</Table.Th><Table.Th>方法</Table.Th><Table.Th>個数</Table.Th><Table.Th>確率</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>
                {monsterSources.map(({ monster, reward, index }) => (
                  <Table.Tr key={`${monster.game_id}-${reward.kind}-${index}`}>
                    <Table.Td><Anchor component={Link} to={`/monsters/${monster.game_id}`}>{text(monster.names)}</Anchor></Table.Td>
                    <Table.Td>{label(reward.rank)}</Table.Td>
                    <Table.Td>{label(reward.kind)}</Table.Td>
                    <Table.Td>{reward.amount}</Table.Td>
                    <Table.Td>{reward.chance}%</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : <Text c="dimmed">大型モンスターからの入手情報はありません</Text>}
      </Paper>

      <Paper withBorder p={{ base: 'sm', sm: 'lg' }}>
        <Title order={2} size="h3" mb={{ base: 'sm', sm: 'md' }}>使い道</Title>
        {uses.length ? (
          <Table.ScrollContainer minWidth={560}>
            <Table>
              <Table.Thead><Table.Tr><Table.Th>用途</Table.Th><Table.Th>作成対象</Table.Th><Table.Th>必要数</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>
                {uses.map((use, index) => (
                  <Table.Tr key={`${use.category}-${use.name}-${index}`}>
                    <Table.Td>{use.category}</Table.Td><Table.Td>{use.name}{use.detail ? ` ${use.detail}` : ''}</Table.Td><Table.Td>{use.amount}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : <Text c="dimmed">調合や装備生産での用途はありません</Text>}
      </Paper>
    </Stack>
  );
}
