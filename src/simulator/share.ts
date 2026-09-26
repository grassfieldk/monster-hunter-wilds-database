import { type Build, emptyBuild, equipmentSlots, validBuild } from './model';

export function readSharedBuild(value: string | null): Build {
  if (!value) return emptyBuild();
  try {
    const parsed: unknown = JSON.parse(value);
    return validBuild(parsed)
      ? (Object.fromEntries([
          ...equipmentSlots.map((slot) => [slot, parsed[slot]]),
          ['decorations', parsed.decorations],
          ['weaponBonuses', parsed.weaponBonuses ?? []],
        ]) as Build)
      : emptyBuild();
  } catch {
    return emptyBuild();
  }
}
