export type LocalizedText = Record<string, string>;

export type ItemSource = {
  location: string;
  method: string;
  rank?: string;
  amount?: number;
  chance?: number;
  condition?: string;
};

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

export type Quest = {
  game_id: number;
  names: LocalizedText;
  descriptions: LocalizedText;
  category: QuestCategory;
  difficulty: number | null;
  locations: number[];
  location_names?: string[];
  time_limit: number | null;
  reward_money: number | null;
  hunter_rank_points: number | null;
  quest_type: number | null;
  order_rank: number | null;
  target_monsters: QuestTargetMonster[];
  objective: LocalizedText;
  clear_condition_type: number | null;
  source?: QuestSource;
};

export type QuestSource = {
  type: 'official-event-page';
  url: string;
  fetched_at: string;
  key: string;
};

export type QuestCategory = '任務' | 'フリー' | 'イベント' | '闘技大会' | 'その他';

export type QuestTargetMonster = {
  game_id: number;
  names: LocalizedText;
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
  dataOrigin: string;
  additionalSources?: { type: string; url: string; fetchedAt: string; count: number }[];
};
