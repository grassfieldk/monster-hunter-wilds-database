import { Anchor, Box, Stack, Table, Tabs, Text } from '@mantine/core';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { formatQuestObjective } from '../formatters';

export function QuestsPage() {
  const { quests } = useDatabase();
  const sorted = quests.filter((quest) => quest.category !== '調査').sort((a, b) => (a.difficulty ?? Number.MAX_SAFE_INTEGER) - (b.difficulty ?? Number.MAX_SAFE_INTEGER) || text(a.names).localeCompare(text(b.names), 'ja'));
  const categoryOrder = ['任務', 'フリー', 'イベント', '闘技大会', 'その他'] as const;
  const availableCategories = new Set(sorted.map((quest) => quest.category));
  const questCategories = categoryOrder.filter((category) => availableCategories.has(category));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const activeCategory = selectedCategory ?? questCategories[0] ?? null;
  const visibleQuests = activeCategory === null ? sorted : sorted.filter((quest) => quest.category === activeCategory);

  return (
    <Stack className="page-stack" gap="md">
      <Tabs value={activeCategory} onChange={setSelectedCategory}>
        <Tabs.List>
          {questCategories.map((category) => (
            <Tabs.Tab key={category} value={category}>{category}</Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      <Box className="responsive-table-container">
        <Table className="responsive-table responsive-table--intrinsic" striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>難度</Table.Th>
              <Table.Th className="numeric-cell">HR</Table.Th>
              <Table.Th>クエスト名</Table.Th>
              <Table.Th className="numeric-cell">報酬</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleQuests.map((quest) => (
              <Table.Tr key={quest.game_id}>
                <Table.Td className="centered-cell">{quest.difficulty ?? '不明'}</Table.Td>
                <Table.Td className="numeric-cell centered-cell">{quest.order_rank !== null && quest.order_rank > 0 ? quest.order_rank.toLocaleString('ja-JP') : quest.order_rank === null ? '不明' : 'なし'}</Table.Td>
                <Table.Td>
                  <Box>
                    <Anchor component={Link} to={`/quests/${quest.game_id}`} fw={500} display="block">{text(quest.names)}</Anchor>
                    <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>
                      {formatQuestObjective(quest.objective).replace(/、/gu, '\n')}
                    </Text>
                  </Box>
                </Table.Td>
                <Table.Td className="numeric-cell">
                  {quest.hunter_rank_points === null ? '不明' : `${quest.hunter_rank_points.toLocaleString('ja-JP')}HRP`} / {quest.reward_money === null ? '不明' : `${quest.reward_money.toLocaleString('ja-JP')}z`}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
    </Stack>
  );
}
