import { Anchor, Group, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { EquipmentMaterial, EquipmentRecipe, Item } from '../types';
import { text } from '../data';

type ItemById = Map<number, Item>;

function MaterialLink({ itemId, itemById }: { itemId: number; itemById: ItemById }) {
  const item = itemById.get(itemId);
  return item ? <Anchor component={Link} to={`/items/${item.game_id}`}>{text(item.names)}</Anchor> : `ID ${itemId}`;
}

export function EquipmentMaterialTable({ materials, itemById }: { materials: EquipmentMaterial[]; itemById: ItemById }) {
  return (
    <Table className="responsive-table responsive-table--intrinsic">
      <Table.Thead><Table.Tr><Table.Th>素材</Table.Th><Table.Th className="numeric-cell">必要数</Table.Th></Table.Tr></Table.Thead>
      <Table.Tbody>
        {materials.map((material, index) => (
          <Table.Tr key={`${material.item_id}-${index}`}>
            <Table.Td><MaterialLink itemId={material.item_id} itemById={itemById} /></Table.Td>
            <Table.Td className="numeric-cell">{material.amount}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export function EquipmentMaterialGroups({ groups, itemById }: { groups: { key: string | number; label: ReactNode; materials: EquipmentMaterial[] }[]; itemById: ItemById }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      {groups.map((group) => (
        <Stack key={group.key} gap={4}>
          {typeof group.label === 'string' ? <Text size="sm" fw={600}>{group.label}</Text> : group.label}
          {group.materials.map((material, index) => (
            <Group key={`${material.item_id}-${index}`} justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
              <Text size="sm" style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}><MaterialLink itemId={material.item_id} itemById={itemById} /></Text>
              <Text size="sm" className="numeric-cell" style={{ flexShrink: 0 }}>x{material.amount}</Text>
            </Group>
          ))}
        </Stack>
      ))}
    </SimpleGrid>
  );
}

export function EquipmentRecipeSection({ recipes, itemById }: { recipes: EquipmentRecipe[]; itemById: ItemById }) {
  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>必要素材</Text>
      {recipes.length ? <EquipmentMaterialTable materials={recipes.flatMap((recipe) => recipe.materials)} itemById={itemById} /> : <Text size="sm" c="dimmed">生産レシピはありません</Text>}
    </Stack>
  );
}
