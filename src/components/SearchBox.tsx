import { Badge, Group, Paper, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { FormattedText } from './FormattedText';

type Result = {
  id: number;
  kind: 'monsters' | 'items';
  name: string;
  description: string;
  searchAliases: string[];
};

function normalizeSearch(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\u30a1-\u30f6]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60))
    .toLocaleLowerCase('ja');
}

function matchesSearch(query: string, candidate: string) {
  if (candidate.includes(query)) return true;
  let queryIndex = 0;
  for (const character of candidate) {
    if (character === query[queryIndex]) queryIndex += 1;
    if (queryIndex === query.length) return true;
  }
  return false;
}

function itemSearchAliases(itemName: string, monsterNames: string[]) {
  const aliases = [itemName];
  const separatorIndex = itemName.indexOf('の');
  const suffix = separatorIndex >= 0 ? itemName.slice(separatorIndex) : itemName;
  for (const monsterName of monsterNames) {
    aliases.push(monsterName, `${monsterName}${suffix}`);
  }
  return aliases;
}

export function SearchBox({ large = false, onNavigate, resultsPlacement = 'bottom' }: { large?: boolean; onNavigate?: () => void; resultsPlacement?: 'top' | 'bottom' }) {
  const { items, monsters } = useDatabase();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const normalized = normalizeSearch(query.trim());

  const results = useMemo<Result[]>(() => {
    if (!normalized) return [];
    const itemMonsterNames = new Map<number, string[]>();
    for (const monster of monsters) {
      const monsterName = text(monster.names);
      for (const reward of monster.rewards) {
        const names = itemMonsterNames.get(reward.item_id) ?? [];
        if (!names.includes(monsterName)) names.push(monsterName);
        itemMonsterNames.set(reward.item_id, names);
      }
    }
    return [
      ...monsters.map((monster) => ({
        id: monster.game_id,
        kind: 'monsters' as const,
        name: text(monster.names),
        description: text(monster.descriptions),
        searchAliases: [text(monster.names)],
      })),
      ...items.map((item) => ({
        id: item.game_id,
        kind: 'items' as const,
        name: text(item.names),
        description: text(item.descriptions),
        searchAliases: itemSearchAliases(text(item.names), itemMonsterNames.get(item.game_id) ?? []),
      })),
    ]
      .filter((entry) => entry.searchAliases.some((alias) => matchesSearch(normalized, normalizeSearch(alias))))
      .sort((a, b) => Number(!a.searchAliases.some((alias) => normalizeSearch(alias).startsWith(normalized))) - Number(!b.searchAliases.some((alias) => normalizeSearch(alias).startsWith(normalized))))
      .slice(0, 12);
  }, [items, monsters, normalized, query]);

  const open = (result: Result) => {
    setQuery('');
    navigate(`/${result.kind}/${result.id}`);
    onNavigate?.();
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
        <Paper
          withBorder
          shadow="sm"
          pos="absolute"
          left={0}
          right={0}
          p={4}
          style={{
            zIndex: 20,
            ...(resultsPlacement === 'top'
              ? { bottom: '100%', marginBottom: 4 }
              : { top: '100%', marginTop: 4 }),
          }}
        >
          {results.length ? (
            <Stack gap={0}>
              {results.map((result) => (
                <UnstyledButton key={`${result.kind}-${result.id}`} p="sm" onClick={() => open(result)}>
                  <Group justify="space-between" wrap="nowrap">
                    <div>
                      <Text fw={500}>{result.name}</Text>
                      <FormattedText size="sm" c="dimmed" lineClamp={1}>{result.description}</FormattedText>
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
