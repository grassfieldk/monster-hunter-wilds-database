export const labels: Record<string, string> = {
  construct: '造竜種',
  'flying-wyvern': '飛竜種',
  'brute-wyvern': '獣竜種',
  'fanged-wyvern': '牙竜種',
  'leviathan': '海竜種',
  'temnoceran': '鋏角種',
  'carapaceon': '甲殻種',
  'fanged-beast': '牙獣種',
  'bird-wyvern': '鳥竜種',
  'elder-dragon': '古龍種',
  low: '下位',
  high: '上位',
  master: 'マスター',
  'target-reward': '標的報酬',
  carve: '剥取: 本体',
  'carve-severed': '剥取: 切断',
  'carve-rotten': '剥取: 変質',
  'carve-rotten-severed': '剥取: 変質切断',
  'wound-destroyed': '傷口破壊',
  'broken-part': '破壊',
  'monster-reward': 'モンスター報酬',
  fire: '火',
  water: '水',
  thunder: '雷',
  ice: '氷',
  dragon: '龍',
  poison: '毒',
  paralysis: '麻痺',
  sleep: '睡眠',
  blastblight: '爆破やられ',
  stun: '気絶',
  flash: '閃光',
  noise: '音',
  exhaust: '減気',
  slash: '斬',
  blunt: '打',
  pierce: '弾',
  consumable: '消費アイテム',
  material: '素材',
  ammo: '弾・ビン',
  account: '精算アイテム',
  special: '重要アイテム',
  'bowgun-ammo': 'ボウガン弾',
  'bow-coating': '弓ビン',
  point: '精算アイテム',
  tool: '道具',
  mystery: 'その他',
};

const weaponAttributeLabels: Record<number, string> = {
  1: '火',
  2: '水',
  3: '氷',
  4: '雷',
  5: '龍',
  6: '毒',
  7: '麻痺',
  8: '睡眠',
  9: '爆破',
};

export function label(value?: string) {
  if (!value || /^\?+$/u.test(value)) return '不明';
  return labels[value] ?? value;
}

export function weaponAttributeLabel(value: number) {
  return weaponAttributeLabels[value] ?? '属性値';
}
