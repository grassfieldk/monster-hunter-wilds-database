import { Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { SearchBox } from '../components/SearchBox';
import { useDatabase } from '../data';

export function HomePage() {
  const { source } = useDatabase();

  return (
    <Stack className="page-stack" gap="md" py={{ base: 'sm', sm: 48 }} maw={720} mx="auto">
      <SearchBox large />
      <SimpleGrid cols={2}>
        <Paper component={Link} to="/monsters" withBorder p="sm" ta="center">モンスター一覧</Paper>
        <Paper component={Link} to="/items" withBorder p="sm" ta="center">アイテム一覧</Paper>
      </SimpleGrid>
      <Text size="sm" c="dimmed" ta="center">
        最終更新日: {new Date(source.generatedAt).toLocaleDateString('ja-JP')}
      </Text>
    </Stack>
  );
}
