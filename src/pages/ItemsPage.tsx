import { Anchor, Pagination, Stack, Table, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { label } from '../labels';
import { FormattedText } from '../components/FormattedText';

const pageSize = 48;

export function ItemsPage() {
  const { items } = useDatabase();
  const [page, setPage] = useState(1);
  const sorted = [...items].sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja'));
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Stack className="page-stack" gap="md">
      <Title order={1} size="h3">アイテム</Title>
      <Text size="sm" c="dimmed">{items.length} 件</Text>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr><Table.Th>アイテム</Table.Th><Table.Th>分類</Table.Th><Table.Th>レア度</Table.Th><Table.Th visibleFrom="sm">説明</Table.Th></Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {visible.map((item) => (
            <Table.Tr key={item.game_id}>
              <Table.Td><Anchor component={Link} to={`/items/${item.game_id}`} fw={500}>{text(item.names)}</Anchor></Table.Td>
              <Table.Td><Text size="sm">{label(item.kind)}</Text></Table.Td>
              <Table.Td><Text size="sm">RARE {item.rarity}</Text></Table.Td>
              <Table.Td visibleFrom="sm"><FormattedText className="long-description" size="sm" lineClamp={1}>{text(item.descriptions)}</FormattedText></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Pagination total={Math.ceil(items.length / pageSize)} value={page} onChange={setPage} mx="auto" />
    </Stack>
  );
}
