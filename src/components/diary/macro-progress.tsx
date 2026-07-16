import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";

function formatAmount(value: number, unit: string) {
  const rounded = Math.round(value);
  return (
    <span dir="ltr" className="tabular-nums">
      {rounded} {unit}
    </span>
  );
}

export function MacroProgress({
  label,
  consumed,
  target,
  unit,
}: {
  label: string;
  consumed: number;
  target: number | null;
  unit: string;
}) {
  const pct = target && target > 0 ? Math.min(100, (consumed / target) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {formatAmount(consumed, unit)}
          {target !== null && (
            <>
              {" "}/ {formatAmount(target, unit)}
            </>
          )}
        </span>
      </div>
      <Progress value={target !== null ? pct : 0}>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
    </div>
  );
}
