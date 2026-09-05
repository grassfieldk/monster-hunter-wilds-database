import { Anchor, Stack, Table, Text } from '@mantine/core';
import { Link, useLocation } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { FormattedText } from '../components/FormattedText';
import { itemCategoryKinds, ItemCategoryKind } from '../itemCategories';

export function ItemsPage() {
  const { items } = useDatabase();
  const { search } = useLocation();
  const requestedKind = new URLSearchParams(search).get('kind');
  const availableKinds = itemCategoryKinds.filter((kind) => items.some((item) => item.kind === kind));
  const activeKind = availableKinds.includes(requestedKind as ItemCategoryKind)
    ? requestedKind as ItemCategoryKind
    : availableKinds[0];
  const sorted = [...items].sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja'));
  const filtered = activeKind ? sorted.filter((item) => item.kind === activeKind) : sorted;

  return (
    <Stack className="page-stack" gap="md">
      <section id="items-category">
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr><Table.Th>アイテム</Table.Th><Table.Th>レア度</Table.Th><Table.Th className="numeric-cell">購入価格</Table.Th><Table.Th className="numeric-cell">売却価格</Table.Th><Table.Th visibleFrom="sm">説明</Table.Th></Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((item) => (
              <Table.Tr key={item.game_id}>
                <Table.Td><Anchor component={Link} to={`/items/${item.game_id}`} fw={500}>{text(item.names)}</Anchor></Table.Td>
                <Table.Td><Text size="sm">{item.rarity}</Text></Table.Td>
                <Table.Td className="numeric-cell">{item.buy_price ? `${item.buy_price.toLocaleString('ja-JP')} z` : '購入不可'}</Table.Td>
                <Table.Td className="numeric-cell">{item.sell_price.toLocaleString('ja-JP')} z</Table.Td>
                <Table.Td visibleFrom="sm"><FormattedText className="long-description" size="sm" lineClamp={1}>{text(item.descriptions)}</FormattedText></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </section>
    </Stack>
  );
}
