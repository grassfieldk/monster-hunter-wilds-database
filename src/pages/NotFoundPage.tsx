import { Anchor, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Stack align="flex-start">
      <Title order={1} size="h3">ページが見つかりません</Title>
      <Text c="dimmed">指定されたデータは存在しません</Text>
      <Anchor component={Link} to="/">トップへ戻る</Anchor>
    </Stack>
  );
}
