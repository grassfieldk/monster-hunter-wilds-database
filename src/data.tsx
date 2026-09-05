import { Center, Loader } from '@mantine/core';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Item, ItemSource, ItemUse, Lookups, Monster, SourceInfo } from './types';

type Database = {
  items: Item[];
  monsters: Monster[];
  lookups: Lookups;
  itemUses: Record<string, ItemUse[]>;
  itemSources: Record<string, ItemSource[]>;
  source: SourceInfo;
  itemById: Map<number, Item>;
  monsterById: Map<number, Monster>;
};

const DatabaseContext = createContext<Database | null>(null);

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} を読み込めませんでした`);
  return response.json() as Promise<T>;
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Omit<Database, 'itemById' | 'monsterById'> | null>(null);

  useEffect(() => {
    Promise.all([
      loadJson<Item[]>('/data/items.json'),
      loadJson<Monster[]>('/data/monsters.json'),
      loadJson<Lookups>('/data/lookups.json'),
      loadJson<Record<string, ItemUse[]>>('/data/item-uses.json'),
      loadJson<SourceInfo>('/data/source.json'),
      loadJson<Record<string, ItemSource[]>>('/data/item-sources.json'),
    ]).then(([items, monsters, lookups, itemUses, source, itemSources]) => {
      setData({ items, monsters, lookups, itemUses, source, itemSources });
    });
  }, []);

  const database = useMemo<Database | null>(() => {
    if (!data) return null;
    return {
      ...data,
      itemById: new Map(data.items.map((item) => [item.game_id, item])),
      monsterById: new Map(data.monsters.map((monster) => [monster.game_id, monster])),
    };
  }, [data]);

  if (!database) {
    return (
      <Center mih="100dvh">
        <Loader />
      </Center>
    );
  }

  return <DatabaseContext.Provider value={database}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const database = useContext(DatabaseContext);
  if (!database) throw new Error('DatabaseProvider が必要です');
  return database;
}

export function text(value?: Record<string, string>) {
  const selected = value?.ja || value?.en || '名称不明';
  const japanese = Boolean(value?.ja);
  return selected.replace(/\r?\n/g, (_, offset: number, source: string) => {
    const previous = source[offset - 1];
    if (japanese) return previous === '。' ? '\n' : '';
    return previous === '.' ? '\n' : ' ';
  });
}

export function monsterEpithet(monster: Monster) {
  const candidate = text(monster.features).match(/≪([^≫]+)≫/u)?.[1];
  if (!candidate || candidate === text(monster.names) || !/[\u3400-\u9fff]/u.test(candidate)) return undefined;
  return candidate;
}
