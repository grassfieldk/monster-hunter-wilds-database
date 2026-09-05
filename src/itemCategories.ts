export const itemCategoryKinds = [
  'consumable',
  'material',
  'bowgun-ammo',
  'bow-coating',
  'point',
  'tool',
  'mystery',
] as const;

export type ItemCategoryKind = (typeof itemCategoryKinds)[number];

export const itemCategoryLabels: Record<ItemCategoryKind, string> = {
  consumable: '消費',
  material: '素材',
  'bowgun-ammo': '弾薬',
  'bow-coating': 'ビン',
  point: '精算',
  tool: '道具',
  mystery: 'その他',
};
