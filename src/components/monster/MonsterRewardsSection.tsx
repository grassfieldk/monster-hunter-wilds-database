import { Anchor, Box, Table, Tabs, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { text } from '../../data';
import { label } from '../../labels';
import type { Item, Monster } from '../../types';

const rewardRanks = ['low', 'high', 'master'] as const;
export type RewardRank = (typeof rewardRanks)[number];
type Props = {
  monster: Monster;
  itemById: Map<number, Item>;
  partName: (part: string) => string;
  selectedRewardRank: RewardRank | null;
  onRewardRankChange: (rank: RewardRank) => void;
};

export function MonsterRewardsSection({ monster, itemById, partName, selectedRewardRank, onRewardRankChange }: Props) {
  const availableRewardRanks = new Set(monster.rewards.map((reward) => reward.rank));
  const activeRewardRank =
    selectedRewardRank && availableRewardRanks.has(selectedRewardRank)
      ? selectedRewardRank
      : ([...rewardRanks].reverse().find((rank) => availableRewardRanks.has(rank)) ?? rewardRanks[0]);
  return (
    <section id="monster-rewards" className="with-rank-tabs">
      <Tabs
        value={activeRewardRank}
        onChange={(value) => value && onRewardRankChange(value as RewardRank)}
        variant="default"
        inverted
      >
        <Box className="section-tabs rank-tabs">
          <Tabs.List grow>
            {rewardRanks.map((rank) => (
              <Tabs.Tab key={rank} value={rank} disabled={!availableRewardRanks.has(rank)}>
                {label(rank)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Box>
        <Tabs.Panel value={activeRewardRank}>
          {monster.rewards.some((reward) => reward.rank === activeRewardRank) ? (
            <Box className="responsive-table-container">
              <Table className="responsive-table responsive-table--intrinsic">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>入手方法</Table.Th>
                    <Table.Th>アイテム</Table.Th>
                    <Table.Th className="numeric-cell">確率</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {monster.rewards
                    .filter((reward) => reward.rank === activeRewardRank)
                    .map((reward, index) => {
                      const item = itemById.get(reward.item_id);
                      return (
                        <Table.Tr key={`${reward.rank}-${reward.kind}-${reward.item_id}-${index}`}>
                          <Table.Td>
                            {label(reward.kind)}
                            {reward.part ? `: ${partName(reward.part)}` : ''}
                          </Table.Td>
                          <Table.Td>
                            {item ? (
                              <>
                                <Anchor component={Link} to={`/items/${item.game_id}`}>
                                  {text(item.names)}
                                </Anchor>{' '}
                                x{reward.amount}
                              </>
                            ) : (
                              `ID ${reward.item_id} x${reward.amount}`
                            )}
                          </Table.Td>
                          <Table.Td className="numeric-cell">{reward.chance}%</Table.Td>
                        </Table.Tr>
                      );
                    })}
                </Table.Tbody>
              </Table>
            </Box>
          ) : (
            <Text size="sm" c="dimmed">
              このランクの入手情報はありません
            </Text>
          )}
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}
