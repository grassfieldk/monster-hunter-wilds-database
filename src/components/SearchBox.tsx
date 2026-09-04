import { Badge, Group, Paper, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { text, useDatabase } from '../data';

type Result = {
  id: number;
  kind: 'monsters' | 'items';
  name: string;
  description: string;
};

export function SearchBox({ large = false }: { large?: boolean }) {
  const { items, monsters } = useDatabase();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase('ja');

  const results = useMemo<Result[]>(() => {
    if (!normalized) return [];
    return [
      ...monsters.map((monster) => ({
        id: monster.game_id,
        kind: 'monsters' as const,
        name: text(monster.names),
        description: text(monster.descriptions),
      })),
      ...items.map((item) => ({
        id: item.game_id,
        kind: 'items' as const,
        name: text(item.names),
        description: text(item.descriptions),
      })),
    ]
      .filter((entry) => entry.name.toLocaleLowerCase('ja').includes(normalized))
      .sort((a, b) => Number(!a.name.startsWith(query)) - Number(!b.name.startsWith(query)))
      .slice(0, 12);
  }, [items, monsters, normalized, query]);

  const open = (result: Result) => {
    setQuery('');
    navigate(`/${result.kind}/${result.id}`);
  };

  return (
    <Stack gap={4} pos="relative">
      <TextInput
        aria-label="モンスター名またはアイテム名"
        leftSection={<IconSearch size={18} />}
        placeholder="モンスター名またはアイテム名を入力"
        size={large ? 'lg' : 'sm'}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results[0]) open(results[0]);
        }}
      />
      {normalized && (
        <Paper withBorder shadow="sm" pos="absolute" top="100%" left={0} right={0} mt={4} p={4} style={{ zIndex: 20 }}>
          {results.length ? (
            <Stack gap={0}>
              {results.map((result) => (
                <UnstyledButton key={`${result.kind}-${result.id}`} p="sm" onClick={() => open(result)}>
                  <Group justify="space-between" wrap="nowrap">
                    <div>
                      <Text fw={500}>{result.name}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>{result.description}</Text>
                    </div>
                    <Badge variant="light">{result.kind === 'monsters' ? 'モンスター' : 'アイテム'}</Badge>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          ) : (
            <Text p="sm" c="dimmed">該当するデータがありません</Text>
          )}
        </Paper>
      )}
    </Stack>
  );
}
