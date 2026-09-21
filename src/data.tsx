import { Center, Loader, Stack, Text } from '@mantine/core';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Amulet, Armor, ArmorSeries, ArmorUpgrade, ArmorUpgradeRecipe, Decoration, DecorationProbability, EquipmentRecipe, Item, ItemSource, ItemUse, Lookups, Monster, Quest, Skill, SourceInfo, Weapon, WeaponTree } from './types';

type Database = {
  items: Item[];
  monsters: Monster[];
  quests: Quest[];
  lookups: Lookups;
  itemUses: Record<string, ItemUse[]>;
  itemSources: Record<string, ItemSource[]>;
  armor: Armor[];
  amulets: Amulet[];
  weapons: Weapon[];
  decorations: Decoration[];
  skills: Skill[];
  armorSeries: ArmorSeries[];
  armorUpgrades: ArmorUpgrade[];
  armorUpgradeRecipes: ArmorUpgradeRecipe[];
  armorRecipes: EquipmentRecipe[];
  amuletRecipes: EquipmentRecipe[];
  weaponRecipes: EquipmentRecipe[];
  weaponTrees: WeaponTree[];
  decorationProbabilities: DecorationProbability[];
  kinsectRecipes: EquipmentRecipe[];
  source: SourceInfo;
  itemById: Map<number, Item>;
  monsterById: Map<number, Monster>;
  questById: Map<number, Quest>;
  skillById: Map<number, Skill>;
};

const DatabaseContext = createContext<Database | null>(null);

async function loadJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`${path} を読み込めませんでした`);
  return response.json() as Promise<T>;
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Omit<Database, 'itemById' | 'monsterById' | 'questById' | 'skillById'> | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    Promise.all([
      loadJson<Item[]>('/data/items.json', controller.signal),
      loadJson<Monster[]>('/data/monsters.json', controller.signal),
      loadJson<Quest[]>('/data/quests.json', controller.signal),
      loadJson<Lookups>('/data/lookups.json', controller.signal),
      loadJson<Record<string, ItemUse[]>>('/data/item-uses.json', controller.signal),
      loadJson<SourceInfo>('/data/source.json', controller.signal),
      loadJson<Record<string, ItemSource[]>>('/data/item-sources.json', controller.signal),
      loadJson<Armor[]>('/data/armor.json', controller.signal),
      loadJson<Amulet[]>('/data/amulets.json', controller.signal),
      loadJson<Weapon[]>('/data/weapons.json', controller.signal),
      loadJson<Decoration[]>('/data/decorations.json', controller.signal),
      loadJson<Skill[]>('/data/skills.json', controller.signal),
      loadJson<ArmorSeries[]>('/data/armor-series.json', controller.signal),
      loadJson<ArmorUpgrade[]>('/data/armor-upgrades.json', controller.signal),
      loadJson<ArmorUpgradeRecipe[]>('/data/armor-upgrade-recipes.json', controller.signal),
      loadJson<EquipmentRecipe[]>('/data/armor-recipes.json', controller.signal),
      loadJson<EquipmentRecipe[]>('/data/amulet-recipes.json', controller.signal),
      loadJson<EquipmentRecipe[]>('/data/weapon-recipes.json', controller.signal),
      loadJson<WeaponTree[]>('/data/weapon-trees.json', controller.signal),
      loadJson<DecorationProbability[]>('/data/decoration-probabilities.json', controller.signal),
      loadJson<EquipmentRecipe[]>('/data/kinsect-recipes.json', controller.signal),
    ]).then(([items, monsters, quests, lookups, itemUses, source, itemSources, armor, amulets, weapons, decorations, skills, armorSeries, armorUpgrades, armorUpgradeRecipes, armorRecipes, amuletRecipes, weaponRecipes, weaponTrees, decorationProbabilities, kinsectRecipes]) => {
      if (!cancelled) setData({ items, monsters, quests, lookups, itemUses, source, itemSources, armor, amulets, weapons, decorations, skills, armorSeries, armorUpgrades, armorUpgradeRecipes, armorRecipes, amuletRecipes, weaponRecipes, weaponTrees, decorationProbabilities, kinsectRecipes });
    }).catch((error: unknown) => {
      if (!cancelled && !(error instanceof DOMException && error.name === 'AbortError')) {
        setLoadError(error instanceof Error ? error : new Error('データの読み込みに失敗しました'));
      }
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const database = useMemo<Database | null>(() => {
    if (!data) return null;
    return {
      ...data,
      itemById: new Map(data.items.map((item) => [item.game_id, item])),
      monsterById: new Map(data.monsters.map((monster) => [monster.game_id, monster])),
      questById: new Map(data.quests.map((quest) => [quest.game_id, quest])),
      skillById: new Map(data.skills.map((skill) => [skill.game_id, skill])),
    };
  }, [data]);

  if (loadError) {
    return <Center mih="100dvh"><Stack align="center" gap="xs"><Text>データを読み込めませんでした</Text><Text size="sm" c="dimmed">ページを再読み込みしてください</Text></Stack></Center>;
  }

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
  const monsterName = text(monster.names);
  for (const source of [monster.features, monster.descriptions]) {
    const candidate = text(source).match(/≪([^≫]+)≫/u)?.[1];
    if (candidate && candidate !== monsterName && /[\u3400-\u9fff]/u.test(candidate)) return candidate;
  }
  return undefined;
}
