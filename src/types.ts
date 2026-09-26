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

export type EquipmentSkill = { skill_id: number; level: number };

export type EquipmentMaterial = { item_id: number; amount: number };

export type EquipmentRecipe = {
  materials: EquipmentMaterial[];
  key_item_id: number;
  key_enemy_id: number;
  key_story_no: number;
  hunter_rank: number;
  time_rank?: number;
  previous_id?: number;
  weapon_id?: string;
  armor_id?: string;
  amulet_id?: string;
  amulet_type?: number;
  level?: number;
  kinsect_id?: string;
};

export type WeaponTree = { weapon_type: string; parent_id: string; child_id: string };

export type ArmorSeries = { game_id: number; names: LocalizedText; rarity: number; price: number; one_set: boolean };

export type ArmorUpgrade = { rarity: number; story_no: number; max_level: number; defense_increment: number; points: number; price: number; special: boolean };

export type ArmorUpgradeRecipe = { series_id: number; materials: EquipmentMaterial[] };

export type DecorationProbability = { accessory_id: number; probabilities: number[] };

export type Armor = {
  game_id: string;
  series_id: number;
  part: number;
  names: LocalizedText;
  descriptions: LocalizedText;
  rarity: number | null;
  price: number | null;
  defense: number;
  resistances: number[];
  slots: number[];
  skills: EquipmentSkill[];
};

export type Amulet = {
  game_id: string;
  amulet_type: number;
  level: number;
  names: LocalizedText;
  descriptions: LocalizedText;
  rarity: number;
  price: number;
  skills: EquipmentSkill[];
};

export type Weapon = {
  game_id: string;
  weapon_type: string;
  category: string;
  names: LocalizedText;
  descriptions: LocalizedText;
  rarity: number;
  price: number;
  attack: number;
  defense: number;
  affinity: number;
  attribute: number;
  attribute_value: number;
  sub_attribute: number;
  sub_attribute_value: number;
  slots: number[];
  sharpness: number[];
  handicraft: number[];
  skills: EquipmentSkill[];
  details: Record<string, unknown>;
};

export type Decoration = {
  game_id: number;
  names: LocalizedText;
  descriptions: LocalizedText;
  type: number;
  rarity: number;
  price: number;
  required_slot: number;
  skills: EquipmentSkill[];
};

export type Skill = {
  game_id: number;
  names: LocalizedText;
  descriptions: LocalizedText;
  type: number;
  category: number;
  icon: number;
};

export type SkillLevel = { skill_id: number; level: number; names: LocalizedText; descriptions: LocalizedText; values: number[]; unlocks: number[] };

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
  size: Record<string, number | null>;
  base_health: number | null;
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

export type QuestCategory = '任務' | 'フリー' | 'イベント' | '闘技大会' | '調査' | 'その他';

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
