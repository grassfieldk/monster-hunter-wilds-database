import type { EquipmentSkill, Weapon } from '../types';

const ranged = new Set(['Bow', 'LightBowgun', 'HeavyBowgun']);
const bowAndGuns = new Set(['Bow', 'LightBowgun', 'HeavyBowgun']);
const guards = new Set(['LongSword', 'ShortSword', 'Lance', 'GunLance', 'ChargeAxe', 'HeavyBowgun']);
const sharpness = new Set(['匠', '業物', '剛刃研磨', '心眼', '鈍器使い', '達人芸', '砥石使用高速化']);
const bowOnly = new Set(['毒ビン追加', '麻痺ビン追加', '睡眠ビン追加', '爆破ビン追加', '減気ビン追加']);
const shots = new Set([
  '通常弾・通常矢強化',
  '貫通弾・竜の矢強化',
  '散弾・剛射強化',
  '弾導強化',
  '特殊射撃強化',
  'ファーストショット',
  'フォースショット',
]);
const guardsOnly = new Set(['ガード性能', 'ガード強化', '攻めの守勢']);
const elements = new Map([
  ['火属性攻撃強化', 1],
  ['水属性攻撃強化', 2],
  ['氷属性攻撃強化', 3],
  ['雷属性攻撃強化', 4],
  ['龍属性攻撃強化', 5],
  ['毒属性強化', 6],
  ['麻痺属性強化', 7],
  ['睡眠属性強化', 8],
  ['爆破属性強化', 9],
  ['毒ダメージ強化', 6],
]);
const priority = new Set([
  '攻撃',
  '見切り',
  '超会心',
  '弱点特効',
  '挑戦者',
  '連撃',
  '精霊の加護',
  '体術',
  'スタミナ急速回復',
  '回避性能',
  '回避距離ＵＰ',
  '業物',
  '達人芸',
]);
const specialized = new Set([
  '笛吹き名人',
  '高速変形',
  '砲弾装填',
  '砲術',
  '溜打強化',
  '速射強化',
  ...bowOnly,
  ...shots,
]);
const fieldSkills = new Set(['植生学', '地質学', '昆虫標本の達人', 'ハンター生活', 'クライマー']);

export function restrictedSkill(name: string): boolean {
  return (
    name === '笛吹き名人' ||
    name === '高速変形' ||
    name === '砲弾装填' ||
    name === '砲術' ||
    name === '溜打強化' ||
    name === '速射強化' ||
    sharpness.has(name) ||
    bowOnly.has(name) ||
    shots.has(name) ||
    guardsOnly.has(name) ||
    elements.has(name) ||
    name === '会心撃【属性】' ||
    name === '会心撃【特殊】'
  );
}

export function skillUsable(name: string, weapon: Weapon): boolean {
  const type = weapon.weapon_type;
  if (name === '笛吹き名人') return type === 'Whistle';
  if (name === '高速変形') return type === 'SlashAxe' || type === 'ChargeAxe';
  if (name === '砲弾装填') return type === 'GunLance' || type === 'ChargeAxe';
  if (name === '砲術')
    return type === 'GunLance' || type === 'ChargeAxe' || type === 'LightBowgun' || type === 'HeavyBowgun';
  if (name === '溜打強化') return type === 'Hammer';
  if (name === '速射強化') return type === 'LightBowgun';
  if (sharpness.has(name)) return !ranged.has(type);
  if (bowOnly.has(name)) return type === 'Bow';
  if (shots.has(name)) return bowAndGuns.has(type);
  if (guardsOnly.has(name)) return guards.has(type);
  const attributes = [
    weapon.attribute_value > 0 ? weapon.attribute : 0,
    weapon.sub_attribute_value > 0 ? weapon.sub_attribute : 0,
  ];
  const element = elements.get(name);
  if (element !== undefined) return attributes.includes(element);
  if (name === '会心撃【属性】') return attributes.some((value) => value >= 1 && value <= 5);
  if (name === '会心撃【特殊】') return attributes.some((value) => value >= 6 && value <= 9);
  return true;
}

export function skillUtility(name: string): number {
  if (fieldSkills.has(name)) return 0;
  if (specialized.has(name)) return 3;
  if (priority.has(name)) return 2;
  return 1;
}

export function utilityForSkills(
  skills: EquipmentSkill[],
  targetIds: Set<number>,
  names: Record<number, string>,
): number {
  return skills.reduce(
    (sum, skill) => sum + (targetIds.has(skill.skill_id) ? 0 : skill.level * skillUtility(names[skill.skill_id] ?? '')),
    0,
  );
}
