const SIZE = 120;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * SVG progress ring for the Today screen's kcal summary, per the UI
 * redesign handoff (120x120, stroke-width 12, progress capped visually at
 * 100% even if consumed exceeds target — the ring itself never overflows
 * past a full circle).
 */
export function CalorieRing({
  consumed,
  target,
  unitLabel,
}: {
  consumed: number;
  target: number | null;
  unitLabel: string;
}) {
  const pct = target && target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const offset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--accent-coral)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          // Ring starts at 12 o'clock and fills clockwise regardless of
          // document direction — rotating the SVG itself (not relying on
          // CSS transforms that could interact with dir="rtl") keeps this
          // consistent.
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span dir="ltr" className="font-display text-[26px] font-extrabold leading-none">
          {Math.round(consumed)}
        </span>
        {target !== null && (
          <span dir="ltr" className="text-[11.5px]" style={{ color: "var(--ink-muted)" }}>
            / {Math.round(target)} {unitLabel}
          </span>
        )}
      </div>
    </div>
  );
}
