import { Anchor, Box, Group, Stack, Table, Text } from '@mantine/core';
import { Fragment, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { label } from '../labels';
import type { Item, ItemSource } from '../types';

type SourceRow = ItemSource & { monsterId?: number; part?: string; material?: string };

const sourceNames: Record<string, string> = {
  '標的報酬': 'ターゲット報酬',
  '剥取: 本体': '本体',
  '剥取: 切断': '切断部位',
  '剥取: 変質': '変質部位',
  '剥取: 変質切断': '変質切断部位',
  '破壊': '部位破壊',
};

const sourceOrder = [
  '購入', '採取', '素材採集依頼',
  '剥ぎ取り',
  '破壊', '報酬',
  '交換・おすそわけ', '錬金', '精錬', '焚き火焼き',
  '支給品', '常備アイテム',
];

function sourceGroup(method: string) {
  if (method.startsWith('剥取: ')) return '剥ぎ取り';
  if (method === '傷口破壊' || method === '破壊') return '破壊';
  if (['モンスター報酬', 'クエスト報酬', 'ミッション報酬', '標的報酬', '追加報酬'].includes(method)) return '報酬';
  if (method.startsWith('採取: ')) return '採取';
  if (method.startsWith('もちもの交換: ') || method.endsWith('と交換') || method === '交換' || method === 'おすそわけ') return '交換・おすそわけ';
  if (method.endsWith('を焼く')) return '焚き火焼き';
  return method;
}

function points(source: ItemSource) {
  return source.condition?.match(/^(\d+) ポイント(?:\s*\/|$)/u)?.[1];
}

export function ItemSources({ item }: { item: Item }) {
  const { itemSources, itemById, monsters, lookups } = useDatabase();
  const supportedMethods = useMemo(() => {
    const methods = new Set<string>();
    const categoryItems = new Set<number>();
    for (const candidate of itemById.values()) {
      if (candidate.kind !== item.kind) continue;
      categoryItems.add(candidate.game_id);
      if (candidate.recipes.length) methods.add('調合');
      for (const source of itemSources[String(candidate.game_id)] ?? []) {
        methods.add(sourceGroup(source.method));
      }
    }
    for (const monster of monsters) {
      for (const reward of monster.rewards) {
        if (categoryItems.has(reward.item_id)) methods.add(sourceGroup(label(reward.kind)));
      }
    }
    return methods;
  }, [item.kind, itemById, itemSources, monsters]);
  const orderedMethods = [...sourceOrder, ...[...supportedMethods].filter((method) => method !== '調合' && !sourceOrder.includes(method))];
  const groups = new Map<string, SourceRow[]>(orderedMethods.filter((method) => supportedMethods.has(method)).map((method) => [method, []]));
  const add = (group: string, row: SourceRow) => {
    const rows = groups.get(group) ?? [];
    rows.push(row);
    groups.set(group, rows);
  };
  for (const source of itemSources[String(item.game_id)] ?? []) {
    const group = sourceGroup(source.method);
    const material = source.method.startsWith('もちもの交換: ') || source.method.endsWith('と交換')
      ? source.method.replace(/^もちもの交換: /u, '').replace(/と交換$/u, '')
      : group === '焚き火焼き' ? source.method.replace(/を焼く$/u, '') : undefined;
    add(group, { ...source, material, method: material && group === '交換・おすそわけ' ? 'もちもの交換' : source.method });
  }
  for (const monster of monsters) {
    for (const reward of monster.rewards.filter((entry) => entry.item_id === item.game_id)) {
      const part = reward.part && lookups.partNames.find((entry) => entry.part === reward.part);
      add(sourceGroup(label(reward.kind)), {
        location: text(monster.names), monsterId: monster.game_id,
        method: label(reward.kind), rank: label(reward.rank),
        amount: reward.amount, chance: reward.chance,
        part: reward.part ? (part ? text(part.names) : label(reward.part)) : undefined,
      });
    }
  }
  const rewardOrder = ['モンスター報酬', 'クエスト報酬', 'ミッション報酬', '標的報酬', '追加報酬'];
  groups.get('報酬')?.sort((a, b) => rewardOrder.indexOf(a.method) - rewardOrder.indexOf(b.method));
  const itemLink = (id: number) => {
    const material = itemById.get(id);
    return material ? <Anchor component={Link} to={`/items/${id}`}>{text(material.names)}</Anchor> : `ID ${id}`;
  };
  const materialLink = (value: string) => {
    const match = value.match(/^(.*?) (\d+) 個$/u);
    const name = match?.[1] ?? value;
    const material = [...itemById.values()].find((entry) => text(entry.names) === name);
    return <>{material ? itemLink(material.game_id) : name}{match && ` x${match[2]}`}</>;
  };

  return <Stack gap="lg">
    {supportedMethods.has('調合') && <section>
      <Text fw={500} mb="xs">調合</Text>
      {item.recipes.length ? <Stack gap={4}>
        {item.recipes.map((recipe, index) => <Group key={index} justify="space-between" wrap="nowrap" gap="sm">
          <Box>{recipe.inputs.map((id, inputIndex) => <Fragment key={`${id}-${inputIndex}`}>{inputIndex > 0 && ' + '}{itemLink(id)}</Fragment>)}</Box>
          <Text size="sm" style={{ whiteSpace: 'nowrap' }}>→ {recipe.amount} 個</Text>
        </Group>)}
      </Stack> : <Text size="sm" c="dimmed">入手方法はありません</Text>}
    </section>}
    {[...groups].map(([group, rows]) => {
      if (!rows.length) return <section key={group}>
        <Text fw={500} mb="xs">{group}</Text>
        <Text size="sm" c="dimmed">入手方法はありません</Text>
      </section>;
      const locationTitle = group === '購入' ? '購入先'
        : group === '採取' ? '採取場所'
        : group === '報酬' || group === '交換・おすそわけ' ? '入手先'
        : rows.some((row) => row.monsterId !== undefined) || group === 'モンスター報酬' ? 'モンスター' : '入手先';
      const location = (row: SourceRow) => <>
        {row.monsterId !== undefined ? <Anchor component={Link} to={`/monsters/${row.monsterId}`}>{row.location}</Anchor> : row.location}
        {points(row) && <Text component="span" size="sm" c="dimmed">（{points(row)}pt）</Text>}
      </>;
      const columns: { title: string; numeric?: boolean; render: (row: SourceRow) => ReactNode }[] = [
        { title: locationTitle, render: location },
      ];
      if (['剥ぎ取り', '破壊', '報酬', '交換・おすそわけ'].includes(group)) columns.push({ title: '種類', render: (row) => sourceNames[row.method] ?? row.method });
      if (rows.some((row) => row.material !== undefined)) columns.push({ title: group === '焚き火焼き' ? '焼く素材' : '渡す素材', render: (row) => row.material ? materialLink(row.material) : row.method === 'おすそわけ' ? '不要' : '不明' });
      if (group === '購入' && rows.some((row) => !points(row))) columns.push({ title: '価格', numeric: true, render: (row) => points(row) ? '—' : item.buy_price > 0 ? `${item.buy_price.toLocaleString('ja-JP')} z` : '不明' });
      if (rows.some((row) => row.part !== undefined)) columns.push({ title: '部位', render: (row) => row.part ?? '不明' });
      if (rows.some((row) => row.amount !== undefined)) columns.push({ title: '個数', numeric: true, render: (row) => row.amount ?? '不明' });
      if (rows.some((row) => row.chance !== undefined)) columns.push({ title: '確率', numeric: true, render: (row) => row.chance === undefined ? '不明' : `${row.chance}%` });
      if (rows.some((row) => row.rank !== undefined)) columns.push({ title: 'ランク', render: (row) => row.rank ?? '不明' });
      return <section key={group}>
        <Text fw={500} mb="xs">{group}</Text>
        {columns.length === 1 ? <Stack gap={4}>{rows.map((row, index) => <Text size="sm" key={index}>{location(row)}</Text>)}</Stack> :
          <Box className="responsive-table-container">
            <Table className="responsive-table">
              <Table.Thead><Table.Tr>{columns.map((column) => <Table.Th key={column.title} className={column.numeric ? 'numeric-cell' : undefined}>{column.title}</Table.Th>)}</Table.Tr></Table.Thead>
              <Table.Tbody>{rows.map((row, index) => <Table.Tr key={index}>{columns.map((column) => <Table.Td key={column.title} className={column.numeric ? 'numeric-cell' : undefined}>{column.render(row)}</Table.Td>)}</Table.Tr>)}</Table.Tbody>
            </Table>
          </Box>}
      </section>;
    })}
    {!supportedMethods.size && <Text size="sm" c="dimmed">入手方法はありません</Text>}
  </Stack>;
}
