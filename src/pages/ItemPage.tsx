import { Badge, Box, Group, Stack, Table, Text, Title } from '@mantine/core';
import { useLocation, useParams } from 'react-router-dom';
import { label } from '../labels';
import { defaultDetailSections } from '../sections';
import { text, useDatabase } from '../data';
import { NotFoundPage } from './NotFoundPage';
import { FormattedText } from '../components/FormattedText';

import { ItemSources } from '../components/ItemSources';

export function ItemPage() {
  const { id } = useParams();
  const { hash } = useLocation();
  const { itemById, itemUses } = useDatabase();
  const item = itemById.get(Number(id));
  if (!item) return <NotFoundPage />;

  const uses = itemUses[String(item.game_id)] ?? [];
  const activeSection = ['item-basic', 'item-sources', 'item-uses'].includes(hash.slice(1))
    ? hash.slice(1)
    : defaultDetailSections.item;

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
        <Box hiddenFrom="sm" mb="md">
          <FormattedText className="long-description" size="sm" style={{ whiteSpace: 'pre-line' }}>{text(item.descriptions)}</FormattedText>
        </Box>
        <Box className="responsive-table-container">
          <Table className="responsive-table responsive-table--intrinsic">
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
        </Box>
      </section>}

      {activeSection === 'item-sources' && <section id="item-sources">
        <ItemSources item={item} />
      </section>}

      {activeSection === 'item-uses' && <section id="item-uses">
        {uses.length ? (
          <Box className="responsive-table-container">
            <Table className="responsive-table responsive-table--intrinsic">
              <Table.Thead><Table.Tr><Table.Th>用途</Table.Th><Table.Th>作成対象</Table.Th><Table.Th className="numeric-cell">必要数</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>
                {uses.map((use, index) => (
                  <Table.Tr key={`${use.category}-${use.name}-${index}`}>
                    <Table.Td>{use.category}</Table.Td><Table.Td>{use.name}{use.detail ? ` ${use.detail}` : ''}</Table.Td><Table.Td className="numeric-cell">{use.amount}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        ) : <Text c="dimmed">調合や装備生産での用途はありません</Text>}
      </section>}
    </Stack>
  );
}
