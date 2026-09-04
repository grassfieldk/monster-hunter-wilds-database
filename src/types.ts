export type LocalizedText = Record<string, string>;

export type ItemRecipe = {
  amount: number;
  inputs: number[];
};

export type Item = {
  game_id: number;
  names: LocalizedText;
  descriptions: LocalizedText;
  kind: string;
  rarity: number;
  max_count: number;
  sell_price: number;
  buy_price: number;
  recipes: ItemRecipe[];
  out_box: boolean;
};

export type MonsterWeakness = {
  kind: 'element' | 'status' | 'effect';
  element?: string;
  status?: string;
  effect?: string;
  level?: number;
  condition?: string | null;
};

export type MonsterReward = {
  rank: string;
  kind: string;
  item_id: number;
  amount: number;
  chance: number;
  part?: string;
};

export type MonsterPart = {
  part: string;
  base_health: number | null;
  kinsect_essence: string;
  multipliers: Record<string, number>;
};

export type Monster = {
  game_id: number;
  species: string;
  names: LocalizedText;
  descriptions: LocalizedText;
  features: LocalizedText;
  tips: LocalizedText;
  variants: unknown[];
  size: Record<string, number>;
  base_health: number;
  locations: number[];
  weaknesses: MonsterWeakness[];
  resistances: MonsterWeakness[];
  rewards: MonsterReward[];
  parts: MonsterPart[];
};

export type NamedLookup = {
  game_id?: number;
  id?: number | string;
  kind?: string;
  part?: string;
  names: LocalizedText;
};

export type ItemUse = {
  category: string;
  name: string;
  detail?: string;
  amount: number;
};

export type Lookups = {
  stages: NamedLookup[];
  species: NamedLookup[];
  partNames: NamedLookup[];
};

export type SourceInfo = {
  generatedAt: string;
  gameFiles: string[];
  sourceProject: string;
  sourceRevision: string;
};
