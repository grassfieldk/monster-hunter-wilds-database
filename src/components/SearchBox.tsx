import { Badge, Combobox, Group, Stack, Text, TextInput, useCombobox } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { FormattedText } from './FormattedText';

type Result = {
  id: string;
  kind: 'monsters' | 'items' | 'equipment' | 'skills';
  label: string;
  path: string;
  name: string;
  description: string;
  searchAliases: string[];
};

type SearchEntry = Result & {
  normalizedAliases: string[];
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
  const { items, monsters, weapons, armor, amulets, decorations, skills } = useDatabase();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const normalized = normalizeSearch(query.trim());
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.selectFirstOption(),
  });

  const searchableEntries = useMemo<SearchEntry[]>(() => {
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
        id: String(monster.game_id),
        kind: 'monsters' as const,
        label: 'モンスター',
        path: `/monsters/${monster.game_id}`,
        name: text(monster.names),
        description: text(monster.descriptions),
        searchAliases: [text(monster.names)],
      })),
      ...items.map((item) => ({
        id: String(item.game_id),
        kind: 'items' as const,
        label: 'アイテム',
        path: `/items/${item.game_id}`,
        name: text(item.names),
        description: text(item.descriptions),
        searchAliases: itemSearchAliases(text(item.names), itemMonsterNames.get(item.game_id) ?? []),
      })),
      ...weapons.map((weapon) => ({
        id: weapon.game_id,
        kind: 'equipment' as const,
        label: weapon.category,
        path: `/equipment/weapons/${encodeURIComponent(weapon.game_id)}`,
        name: text(weapon.names),
        description: text(weapon.descriptions),
        searchAliases: [text(weapon.names)],
      })),
      ...armor.map((item) => ({
        id: item.game_id,
        kind: 'equipment' as const,
        label: '防具',
        path: `/equipment/armor/${encodeURIComponent(item.game_id)}`,
        name: text(item.names),
        description: text(item.descriptions),
        searchAliases: [text(item.names)],
      })),
      ...amulets.map((item) => ({
        id: item.game_id,
        kind: 'equipment' as const,
        label: '護石',
        path: `/equipment/amulets/${encodeURIComponent(item.game_id)}`,
        name: text(item.names),
        description: text(item.descriptions),
        searchAliases: [text(item.names)],
      })),
      ...decorations.map((item) => ({
        id: String(item.game_id),
        kind: 'equipment' as const,
        label: '装飾品',
        path: `/equipment/decorations/${encodeURIComponent(String(item.game_id))}`,
        name: text(item.names),
        description: text(item.descriptions),
        searchAliases: [text(item.names)],
      })),
      ...skills.map((skill) => ({
        id: String(skill.game_id),
        kind: 'skills' as const,
        label: 'スキル',
        path: `/skills/${skill.game_id}`,
        name: text(skill.names),
        description: text(skill.descriptions),
        searchAliases: [text(skill.names)],
      })),
    ].map((entry) => ({
      ...entry,
      normalizedAliases: entry.searchAliases.map(normalizeSearch),
    }));
  }, [armor, amulets, decorations, items, monsters, skills, weapons]);

  const results = useMemo<Result[]>(() => {
    if (!normalized) return [];
    return searchableEntries
      .filter((entry) => entry.normalizedAliases.some((alias) => matchesSearch(normalized, alias)))
      .sort((a, b) => Number(!a.normalizedAliases.some((alias) => alias.startsWith(normalized))) - Number(!b.normalizedAliases.some((alias) => alias.startsWith(normalized))))
      .slice(0, 12);
  }, [normalized, searchableEntries]);

  const open = (result: Result) => {
    setQuery('');
    combobox.closeDropdown();
    navigate(result.path);
    onNavigate?.();
  };

  useEffect(() => {
    if (onNavigate) combobox.openDropdown();
  }, [combobox, onNavigate]);

  return (
    <Stack gap={4} pos="relative">
      <Combobox store={combobox} position={resultsPlacement} offset={0} withinPortal={false} onOptionSubmit={(value) => {
        const result = results.find((entry) => entry.path === value);
        if (result) open(result);
      }}>
        <Combobox.Target>
          <TextInput
            aria-label="モンスター名またはアイテム名"
            leftSection={<IconSearch size={18} />}
            size={large ? 'lg' : 'sm'}
            classNames={{ root: 'search-input-root', input: 'search-input-field' }}
            value={query}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (!combobox.dropdownOpened) combobox.openDropdown('keyboard');
                else combobox.selectNextOption();
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (!combobox.dropdownOpened) combobox.openDropdown('keyboard');
                else combobox.selectPreviousOption();
              } else if (event.key === 'Enter') {
                event.preventDefault();
                combobox.clickSelectedOption();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                combobox.closeDropdown('keyboard');
              }
            }}
            onFocus={() => combobox.openDropdown()}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setQuery(value);
              if (value.trim() || onNavigate) combobox.openDropdown();
              else combobox.closeDropdown();
            }}
          />
        </Combobox.Target>
        {(normalized || onNavigate) && (
          <Combobox.Dropdown
            className="search-results-panel"
            p={4}
          >
            <Combobox.Options className="search-results-options">
              {results.length ? results.map((result) => (
                <Combobox.Option key={result.path} value={result.path}>
                  <Group gap="xs" wrap="nowrap">
                    <Badge w={80} variant="light" style={{ flexShrink: 0 }}>{result.label}</Badge>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={500} lh={1.25} truncate>{result.name}</Text>
                      <FormattedText size="sm" c="dimmed" lh={1.25} lineClamp={1}>{result.description}</FormattedText>
                    </div>
                  </Group>
                </Combobox.Option>
              )) : normalized ? (
                <Combobox.Empty>該当するデータがありません</Combobox.Empty>
              ) : (
                <Combobox.Empty>名前を入力してください</Combobox.Empty>
              )}
            </Combobox.Options>
          </Combobox.Dropdown>
        )}
      </Combobox>
    </Stack>
  );
}
