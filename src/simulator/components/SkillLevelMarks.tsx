type Props = { level: number; maxLevel: number; slotCount: number };

export function skillSlotCount(availableLevels: Map<number, number[]>) {
  return Math.max(0, ...[...availableLevels.values()].map((levels) => levels.at(-1) ?? 0));
}

export function SkillLevelMarks({ level, maxLevel, slotCount }: Props) {
  const maximum = Math.max(0, maxLevel);
  const filled = Math.min(Math.max(0, level), maximum);
  const boxCount = Math.max(maximum, slotCount);
  return (
    <span role="img" aria-label={`レベル ${filled} / ${maximum}`} className="simulator-skill-level-marks">
      {boxCount > 0 && (
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${boxCount * 10 + 1.5} 14`}
          width={boxCount * 8 + 1.2}
          height={11}
        >
          {Array.from({ length: filled }, (_, index) => (
            <rect
              key={`filled-${index}`}
              x={index * 10 + 1.5}
              y="1.75"
              width="8.5"
              height="10.5"
              fill="var(--mantine-primary-color-filled)"
            />
          ))}
          {maximum > 0 && (
            <g fill="none" stroke="var(--mantine-color-dimmed)" strokeWidth="1.5">
              <rect x="0.75" y="1" width={maximum * 10} height="12" />
              {Array.from({ length: maximum - 1 }, (_, index) => (
                <line
                  key={`divider-${index}`}
                  x1={index * 10 + 10.75}
                  y1="1"
                  x2={index * 10 + 10.75}
                  y2="13"
                />
              ))}
            </g>
          )}
        </svg>
      )}
    </span>
  );
}
