export const categories = [
  { key: 'weapons', label: '武器' },
  { key: 'armor', label: '防具' },
  { key: 'amulets', label: '護石' },
  { key: 'decorations', label: '装飾品' },
] as const;

export const armorParts = ['頭', '胴', '腕', '腰', '脚'];

export function compareIds(a: number | string, b: number | string) {
  return Number(a) - Number(b);
}
