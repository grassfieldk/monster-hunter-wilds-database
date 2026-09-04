import { Anchor, Badge, Group, Pagination, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
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
      <Title order={1} size="h2">アイテム</Title>
      <Text c="dimmed">{items.length} 件</Text>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {visible.map((item) => (
          <Paper key={item.game_id} withBorder p={{ base: 'sm', sm: 'md' }}>
            <Group justify="space-between" wrap="nowrap">
              <Anchor component={Link} to={`/items/${item.game_id}`} fw={500}>{text(item.names)}</Anchor>
              <Badge variant="light">RARE {item.rarity}</Badge>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>{label(item.kind)}</Text>
            <FormattedText size="sm" mt="xs" lineClamp={2}>{text(item.descriptions)}</FormattedText>
          </Paper>
        ))}
      </SimpleGrid>
      <Pagination total={Math.ceil(items.length / pageSize)} value={page} onChange={setPage} mx="auto" />
    </Stack>
  );
}
