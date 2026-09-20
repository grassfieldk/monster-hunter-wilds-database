import { useEffect } from 'react';

export const defaultDetailSections = {
  monster: 'monster-basic',
  item: 'item-sources',
  quest: 'quest-basic',
} as const;

export const detailSections = {
  monster: ['monster-basic', 'monster-rewards', 'monster-hitzones'],
  item: ['item-basic', 'item-sources', 'item-uses'],
  quest: ['quest-basic', 'quest-rewards'],
} as const;

type DetailSectionKind = keyof typeof defaultDetailSections;
const rememberedDetailSections: Record<DetailSectionKind, string> = { ...defaultDetailSections };

export function getRememberedDetailSection(kind: DetailSectionKind) {
  return rememberedDetailSections[kind];
}

export function rememberDetailSection(kind: DetailSectionKind, section: string) {
  rememberedDetailSections[kind] = section;
}

export function useDetailSection(kind: DetailSectionKind, section: string, sections: readonly string[]) {
  useEffect(() => {
    if (sections.includes(section)) rememberDetailSection(kind, section);
  }, [kind, section, sections]);

  return sections.includes(section) ? section : getRememberedDetailSection(kind);
}
