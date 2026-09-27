export function parseMonsterEpithet(source = '') {
  const value = source.match(/≪([^≫]+)≫/u)?.[1];
  if (!value) return null;
  const match = value.match(/^(.+?)[（(]([ぁ-ゖァ-ヶー]+)[）)]$/u);
  return {
    value,
    name: (match?.[1] ?? value).trim(),
    reading: match
      ? match[2].replace(/[ァ-ヶ]/gu, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60))
      : null,
  };
}
