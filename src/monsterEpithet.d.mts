export type ParsedMonsterEpithet = { value: string; name: string; reading: string | null };

export function parseMonsterEpithet(source?: string): ParsedMonsterEpithet | null;
