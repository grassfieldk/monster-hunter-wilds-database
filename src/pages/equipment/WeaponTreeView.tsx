import type { TreeNodeData } from '@mantine/core';
import { Anchor, Group, getTreeExpandedState, Text, Tree, useTree } from '@mantine/core';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { text } from '../../data';
import type { Weapon } from '../../types';

export function WeaponTreeView({
  currentId,
  weapons,
  weaponTrees,
}: {
  currentId: string;
  weapons: Weapon[];
  weaponTrees: { parent_id: string; child_id: string }[];
}) {
  const treeData = useMemo<TreeNodeData[]>(() => {
    const weaponById = new Map(weapons.map((weapon) => [weapon.game_id, weapon]));
    const childrenById = new Map<string, string[]>();
    const parentsById = new Map<string, string[]>();
    for (const edge of weaponTrees) {
      childrenById.set(edge.parent_id, [...(childrenById.get(edge.parent_id) ?? []), edge.child_id]);
      parentsById.set(edge.child_id, [...(parentsById.get(edge.child_id) ?? []), edge.parent_id]);
    }
    const roots = new Set<string>();
    const findRoots = (weaponId: string, path: Set<string>) => {
      if (path.has(weaponId)) return;
      const nextPath = new Set(path).add(weaponId);
      const parents = parentsById.get(weaponId) ?? [];
      if (!parents.length) {
        roots.add(weaponId);
        return;
      }
      parents.forEach((parentId) => {
        findRoots(parentId, nextPath);
      });
    };
    findRoots(currentId, new Set());
    const buildNode = (weaponId: string, path: Set<string>): TreeNodeData | null => {
      const weapon = weaponById.get(weaponId);
      if (!weapon || path.has(weaponId)) return null;
      const nextPath = new Set(path).add(weaponId);
      return {
        value: weapon.game_id,
        label: text(weapon.names),
        children: (childrenById.get(weaponId) ?? [])
          .map((childId) => buildNode(childId, nextPath))
          .filter((node): node is TreeNodeData => node !== null),
      };
    };
    return [...roots]
      .map((rootId) => buildNode(rootId, new Set()))
      .filter((node): node is TreeNodeData => node !== null);
  }, [currentId, weapons, weaponTrees]);
  const tree = useTree({ initialExpandedState: getTreeExpandedState(treeData, '*') });

  return (
    <Tree
      data={treeData}
      tree={tree}
      levelOffset="md"
      expandOnClick={false}
      expandOnSpace={false}
      renderNode={({ node, elementProps }) => (
        <Group gap={4} wrap="nowrap" {...elementProps}>
          {node.value === currentId ? (
            <Text className="equipment-tree-label" fw={600}>
              {node.label}
            </Text>
          ) : (
            <Anchor
              className="equipment-tree-label"
              component={Link}
              to={`/equipment/weapons/${encodeURIComponent(node.value)}`}
            >
              {node.label}
            </Anchor>
          )}
        </Group>
      )}
    />
  );
}
