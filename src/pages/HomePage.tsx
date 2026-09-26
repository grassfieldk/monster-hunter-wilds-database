import { Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { SearchBox } from '../components/SearchBox';
import { useDatabase } from '../data';

export function HomePage() {
  const { source } = useDatabase();

  return (
    <Stack className="page-stack" gap="md" py={{ base: 'sm', sm: 48 }} maw={720} mx="auto">
      <SearchBox large />
      <SimpleGrid cols={{ base: 1, sm: 4 }}>
        <Paper component={Link} to="/monsters" withBorder p="sm" ta="center">
          モンスター一覧
        </Paper>
        <Paper component={Link} to="/items" withBorder p="sm" ta="center">
          アイテム一覧
        </Paper>
        <Paper component={Link} to="/quests" withBorder p="sm" ta="center">
          クエスト一覧
        </Paper>
        <Paper component={Link} to="/equipment" withBorder p="sm" ta="center">
          装備一覧
        </Paper>
        <Paper component={Link} to="/simulator" withBorder p="sm" ta="center">
          装備シミュレータ
        </Paper>
      </SimpleGrid>
      <Text size="sm" c="dimmed" ta="center">
        最終更新日: {new Date(source.generatedAt).toLocaleDateString('ja-JP')}
      </Text>
    </Stack>
  );
}
