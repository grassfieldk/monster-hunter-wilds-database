export function MonsterEpithet({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return null;
  const reading = value.match(/^(.+?)（(.+?)）$/u);
  return reading ? (
    <ruby className={className}>
      {reading[1]}
      <rt>{reading[2]}</rt>
    </ruby>
  ) : (
    <span className={className}>{value}</span>
  );
}
