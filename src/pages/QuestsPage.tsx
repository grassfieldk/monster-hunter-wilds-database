import { Anchor, Box, Stack, Table, Text } from '@mantine/core';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { OptionPicker } from '../components/OptionPicker';
import { createMonsterNameMap, QuestObjective } from '../components/QuestObjective';
import { text, useDatabase } from '../data';
import { getQuestCategories } from '../questCategories';

export function QuestsPage() {
  const { quests, monsterById } = useDatabase();
  const [searchParams, setSearchParams] = useSearchParams();
  const sorted = useMemo(
    () => quests.filter((quest) => quest.category !== '調査').sort((a, b) => a.game_id - b.game_id),
    [quests],
  );
  const questCategories = getQuestCategories(sorted);
  const requestedCategory = searchParams.get('category');
  const activeCategory =
    questCategories.find((category) => category === requestedCategory) ?? questCategories[0] ?? null;
  const monsterTabs = useMemo(() => {
    const names = new Set(
      sorted.flatMap((quest) =>
        quest.target_monsters.map((target) => text(target.names).replace(/（歴戦の個体）|（歴戦王）/gu, '')),
      ),
    );
    return [...names].sort((a, b) => a.localeCompare(b, 'ja'));
  }, [sorted]);
  const requestedMonster = searchParams.get('monster');
  const activeMonster = monsterTabs.includes(requestedMonster ?? '') ? requestedMonster : null;
  const visibleQuests = useMemo(
    () =>
      sorted.filter((quest) => {
        if (activeCategory !== null && quest.category !== activeCategory) return false;
        if (!activeMonster) return true;
        const targets = quest.target_monsters.map((target) =>
          text(target.names).replace(/（歴戦の個体）|（歴戦王）/gu, ''),
        );
        if (targets.length > 0) return targets.includes(activeMonster);
        return quest.objective.ja?.replace(/（歴戦の個体）|（歴戦王）/gu, '').includes(activeMonster) ?? false;
      }),
    [activeCategory, activeMonster, sorted],
  );
  const monsterNames = useMemo(() => createMonsterNameMap(monsterById.values()), [monsterById]);
  const setMonster = (value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'all') next.set('monster', value);
    else next.delete('monster');
    setSearchParams(next);
  };

  return (
    <Stack className="page-stack" gap="md">
      <Box className="section-tabs rank-tabs">
        <OptionPicker
          ariaLabel="対象モンスター"
          data={[{ value: 'all', label: 'すべて' }, ...monsterTabs.map((name) => ({ value: name, label: name }))]}
          value={activeMonster ?? 'all'}
          size="sm"
          className="weapon-type-select-root"
          buttonClassName="weapon-type-select"
          onChange={setMonster}
        />
      </Box>
      <Box className="responsive-table-container">
        <Table className="responsive-table responsive-table--intrinsic" striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>難度</Table.Th>
              <Table.Th>クエスト</Table.Th>
              <Table.Th className="numeric-cell">報酬</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleQuests.map((quest) => (
              <Table.Tr key={quest.game_id}>
                <Table.Td className="centered-cell">{quest.difficulty ?? '不明'}</Table.Td>
                <Table.Td>
                  <Box>
                    <Anchor component={Link} to={`/quests/${quest.game_id}`} display="block" fw={700}>
                      {text(quest.names)}
                    </Anchor>
                    <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>
                      <QuestObjective quest={quest} monsters={monsterById} monsterNames={monsterNames} breakOnComma />
                    </Text>
                  </Box>
                </Table.Td>
                <Table.Td className="numeric-cell">
                  <Stack gap={0} align="flex-end">
                    <Text size="sm">
                      {quest.hunter_rank_points === null
                        ? '不明'
                        : `${quest.hunter_rank_points.toLocaleString('ja-JP')}HRP`}
                    </Text>
                    <Text size="sm">
                      {quest.reward_money === null ? '不明' : `${quest.reward_money.toLocaleString('ja-JP')}z`}
                    </Text>
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
    </Stack>
  );
}
