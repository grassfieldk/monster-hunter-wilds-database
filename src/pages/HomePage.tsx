import { Anchor, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { SearchBox } from '../components/SearchBox';
import { useDatabase } from '../data';

export function HomePage() {
  const { items, monsters, source } = useDatabase();

  return (
    <Stack className="page-stack" gap="md" py={{ base: 'sm', sm: 48 }}>
      <Stack gap="md" maw={720} mx="auto" w="100%" ta="center">
        <Title order={1} size="h3">モンスターとアイテムを検索</Title>
        <Text c="dimmed">名前を入力すると、入手方法、素材の使い道、弱点、報酬などをまとめて確認できます</Text>
        <SearchBox large />
      </Stack>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Paper withBorder p={{ base: 'md', sm: 'lg' }}>
          <Title order={2} size="h3">モンスター</Title>
          <Text c="dimmed" mt="xs">{monsters.length} 体の弱点、肉質、出現場所、入手素材を掲載</Text>
          <Anchor component={Link} to="/monsters" mt="md" display="inline-block">一覧を見る</Anchor>
        </Paper>
        <Paper withBorder p={{ base: 'md', sm: 'lg' }}>
          <Title order={2} size="h3">アイテム</Title>
          <Text c="dimmed" mt="xs">{items.length} 件の入手方法、調合、装備生産での使い道を掲載</Text>
          <Anchor component={Link} to="/items" mt="md" display="inline-block">一覧を見る</Anchor>
        </Paper>
      </SimpleGrid>
      <Text size="sm" c="dimmed" ta="center">
        ゲームファイル由来データ 更新日時: {new Date(source.generatedAt).toLocaleString('ja-JP')}
      </Text>
    </Stack>
  );
}
