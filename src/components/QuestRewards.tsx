import { Anchor, Box, Table, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { text, useDatabase } from '../data';
import type { ItemSource, Quest } from '../types';

type RewardRow = ItemSource & { itemId: number; method: string };

const rewardMethods = new Set(['クエスト報酬', 'ミッション報酬', '追加報酬']);
const methodOrder = ['クエスト報酬', 'ミッション報酬', '追加報酬'];

export function QuestRewards({ quest }: { quest: Quest }) {
  const { itemSources, itemById } = useDatabase();
  const questName = text(quest.names);
  const rows: RewardRow[] = [];
  for (const [itemId, sources] of Object.entries(itemSources)) {
    for (const source of sources) {
      if (source.location !== questName || !rewardMethods.has(source.method)) continue;
      rows.push({ ...source, itemId: Number(itemId), method: source.method });
    }
  }
  rows.sort((a, b) => methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method) || text(itemById.get(a.itemId)?.names).localeCompare(text(itemById.get(b.itemId)?.names), 'ja'));

  if (!rows.length) return <Text size="sm" c="dimmed">報酬アイテムはありません</Text>;

  return (
    <Box className="responsive-table-container">
      <Table className="responsive-table responsive-table--intrinsic">
        <Table.Thead>
          <Table.Tr><Table.Th>報酬アイテム</Table.Th><Table.Th className="numeric-cell">個数</Table.Th><Table.Th className="numeric-cell">確率</Table.Th><Table.Th>方法</Table.Th></Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, index) => {
            const item = itemById.get(row.itemId);
            return <Table.Tr key={`${row.itemId}-${row.method}-${row.amount}-${row.chance}-${index}`}>
              <Table.Td>{item ? <Anchor component={Link} to={`/items/${item.game_id}`}>{text(item.names)}</Anchor> : `ID ${row.itemId}`}</Table.Td>
              <Table.Td className="numeric-cell">{row.amount ?? '不明'}</Table.Td>
              <Table.Td className="numeric-cell">{row.chance === undefined ? '不明' : `${row.chance}%`}</Table.Td>
              <Table.Td>{row.method}</Table.Td>
            </Table.Tr>;
          })}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
