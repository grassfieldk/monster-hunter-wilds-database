export const defaultDetailSections = {
  monster: 'monster-basic',
  item: 'item-sources',
  quest: 'quest-basic',
} as const;

type DetailSectionKind = keyof typeof defaultDetailSections;
const rememberedDetailSections: Record<DetailSectionKind, string> = { ...defaultDetailSections };

export function getRememberedDetailSection(kind: DetailSectionKind) {
  return rememberedDetailSections[kind];
}

export function rememberDetailSection(kind: DetailSectionKind, section: string) {
  rememberedDetailSections[kind] = section;
}
