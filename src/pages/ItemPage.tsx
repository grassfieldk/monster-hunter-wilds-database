import { Anchor, Badge, Box, Group, Stack, Table, Text, Title } from '@mantine/core';
import { Link, useLocation, useParams } from 'react-router-dom';
import { label } from '../labels';
import { text, useDatabase } from '../data';
import { NotFoundPage } from './NotFoundPage';
import { FormattedText } from '../components/FormattedText';

export function ItemPage() {
  const { id } = useParams();
  const { hash } = useLocation();
  const { itemById, monsters, itemUses, itemSources } = useDatabase();
  const item = itemById.get(Number(id));
  if (!item) return <NotFoundPage />;

  const monsterSources = monsters.flatMap((monster) =>
    monster.rewards
      .filter((reward) => reward.item_id === item.game_id)
      .map((reward, index) => ({ monster, reward, index })),
  );
  const uses = itemUses[String(item.game_id)] ?? [];
  const acquisitionSources = itemSources[String(item.game_id)] ?? [];
  const hasAcquisitionSource = acquisitionSources.length > 0 || item.recipes.length > 0 || monsterSources.length > 0;
  const activeSection = ['item-basic', 'item-sources', 'item-uses'].includes(hash.slice(1))
    ? hash.slice(1)
    : 'item-basic';

  return (
    <Stack className="page-stack" gap="lg">
      <Box visibleFrom="sm">
        <Group gap="sm">
          <Title order={1} size="h3">{text(item.names)}</Title>
          <Badge variant="light">RARE {item.rarity}</Badge>
        </Group>
        <Text c="dimmed" mt={4}>{label(item.kind)}</Text>
        <FormattedText className="long-description" size="sm" mt="sm" style={{ whiteSpace: 'pre-line' }}>{text(item.descriptions)}</FormattedText>
      </Box>

      {activeSection === 'item-basic' && <section id="item-basic">
        <Title order={2} size="h3" mb={{ base: 'sm', sm: 'md' }} className="section-title">基本情報</Title>
        <Box hiddenFrom="sm" mb="md">
          <FormattedText className="long-description" size="sm" style={{ whiteSpace: 'pre-line' }}>{text(item.descriptions)}</FormattedText>
        </Box>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th className="numeric-cell">所持上限</Table.Th>
              <Table.Th className="numeric-cell">購入価格</Table.Th>
              <Table.Th className="numeric-cell">売却価格</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td className="numeric-cell">{item.max_count}</Table.Td>
              <Table.Td className="numeric-cell">{item.buy_price ? `${item.buy_price.toLocaleString('ja-JP')} z` : '購入不可'}</Table.Td>
              <Table.Td className="numeric-cell">{item.sell_price.toLocaleString('ja-JP')} z</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </section>}

      {activeSection === 'item-sources' && <section id="item-sources">
        <Title order={2} size="h3" mb={{ base: 'sm', sm: 'md' }} className="section-title">入手方法</Title>
        {!item.recipes.length && <Text c="dimmed" mb="sm">調合では作成できません</Text>}
        {hasAcquisitionSource ? (
          <Table.ScrollContainer minWidth={640}>
            <Table>
              <Table.Thead><Table.Tr><Table.Th>入手先</Table.Th><Table.Th>ランク</Table.Th><Table.Th>方法</Table.Th><Table.Th className="numeric-cell">個数</Table.Th><Table.Th className="numeric-cell">確率</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>
                {acquisitionSources.map((source, index) => (
                  <Table.Tr key={`source-${index}`}>
                    <Table.Td>{source.location}</Table.Td>
                    <Table.Td>{source.rank ?? '-'}</Table.Td>
                    <Table.Td>
                      {source.method}
                      {source.condition && <Text size="sm" c="dimmed">{source.condition}</Text>}
                    </Table.Td>
                    <Table.Td className="numeric-cell">{source.amount ?? '-'}</Table.Td>
                    <Table.Td className="numeric-cell">{source.chance === undefined ? '-' : `${source.chance}%`}</Table.Td>
                  </Table.Tr>
                ))}
                {item.recipes.map((recipe, index) => (
                  <Table.Tr key={`recipe-${index}`}>
                    <Table.Td>調合</Table.Td>
                    <Table.Td>-</Table.Td>
                    <Table.Td>{recipe.inputs.map((inputId) => itemById.get(inputId)?.names.ja ?? `ID ${inputId}`).join(' + ')}</Table.Td>
                    <Table.Td className="numeric-cell">{recipe.amount}</Table.Td>
                    <Table.Td className="numeric-cell">-</Table.Td>
                  </Table.Tr>
                ))}
                {monsterSources.map(({ monster, reward, index }) => (
                  <Table.Tr key={`${monster.game_id}-${reward.kind}-${index}`}>
                    <Table.Td><Anchor component={Link} to={`/monsters/${monster.game_id}`}>{text(monster.names)}</Anchor></Table.Td>
                    <Table.Td>{label(reward.rank)}</Table.Td>
                    <Table.Td>{label(reward.kind)}</Table.Td>
                    <Table.Td className="numeric-cell">{reward.amount}</Table.Td>
                    <Table.Td className="numeric-cell">{reward.chance}%</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : <Text c="dimmed">入手先は未掲載です</Text>}
      </section>}

      {activeSection === 'item-uses' && <section id="item-uses">
        <Title order={2} size="h3" mb={{ base: 'sm', sm: 'md' }} className="section-title">使い道</Title>
        {uses.length ? (
          <Table.ScrollContainer minWidth={560}>
            <Table>
              <Table.Thead><Table.Tr><Table.Th>用途</Table.Th><Table.Th>作成対象</Table.Th><Table.Th className="numeric-cell">必要数</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>
                {uses.map((use, index) => (
                  <Table.Tr key={`${use.category}-${use.name}-${index}`}>
                    <Table.Td>{use.category}</Table.Td><Table.Td>{use.name}{use.detail ? ` ${use.detail}` : ''}</Table.Td><Table.Td className="numeric-cell">{use.amount}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : <Text c="dimmed">調合や装備生産での用途はありません</Text>}
      </section>}
    </Stack>
  );
}
