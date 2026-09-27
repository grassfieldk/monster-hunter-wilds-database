export const categories = [
  { key: 'weapons', label: '武器' },
  { key: 'armor', label: '防具' },
  { key: 'amulets', label: '護石' },
  { key: 'decorations', label: '装飾品' },
] as const;

export const armorParts = ['頭', '胴', '腕', '腰', '脚'];

export function compareIds(a: number | string, b: number | string) {
  const left = Number(typeof a === 'number' ? a : a.split(':').at(-1));
  const right = Number(typeof b === 'number' ? b : b.split(':').at(-1));
  if (Number.isFinite(left) && Number.isFinite(right) && left !== right) return left - right;
  return String(a).localeCompare(String(b), 'ja', { numeric: true });
}
