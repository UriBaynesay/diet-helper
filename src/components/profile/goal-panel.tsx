"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Section, Field } from "@/components/profile/profile-form";
import { strings } from "@/lib/strings";

type GoalType = "lose" | "maintain" | "gain";
type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

type BmiResponse = {
  bmi: number;
  bmiCategory: BmiCategory;
  bmr: number;
  tdee: number;
  goalType: GoalType;
  targetKcal: number;
  flooredAtMinimum: boolean;
  targetProteinG: number;
  targetFatG: number;
  targetCarbsG: number;
  disclaimer: string;
};

export type CurrentGoal = {
  targetKcal: string;
  targetProteinG: string;
  targetCarbsG: string;
  targetFatG: string;
} | null;

const GOAL_TYPES: GoalType[] = ["lose", "maintain", "gain"];
const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  lose: strings.bmiScreen.goalTypeLose,
  maintain: strings.bmiScreen.goalTypeMaintain,
  gain: strings.bmiScreen.goalTypeGain,
};
const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  underweight: strings.bmiScreen.bmiCategoryUnderweight,
  normal: strings.bmiScreen.bmiCategoryNormal,
  overweight: strings.bmiScreen.bmiCategoryOverweight,
  obese: strings.bmiScreen.bmiCategoryObese,
};

export function GoalPanel({
  profileComplete,
  currentGoal,
}: {
  profileComplete: boolean;
  currentGoal: CurrentGoal;
}) {
  const router = useRouter();
  const [goalType, setGoalType] = useState<GoalType>("maintain");
  const [bmi, setBmi] = useState<BmiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetKcal, setTargetKcal] = useState("");
  const [targetProteinG, setTargetProteinG] = useState("");
  const [targetCarbsG, setTargetCarbsG] = useState("");
  const [targetFatG, setTargetFatG] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileComplete) return;
    startTransition(async () => {
      const res = await fetch(`/api/bmi?goalType=${goalType}`);
      if (!res.ok) {
        const { error: err } = await res.json();
        setError(err?.code ?? "error");
        setBmi(null);
        return;
      }
      const { data } = await res.json();
      setError(null);
      setBmi(data);
      setTargetKcal(Math.round(data.targetKcal).toString());
      setTargetProteinG(Math.round(data.targetProteinG).toString());
      setTargetCarbsG(Math.round(data.targetCarbsG).toString());
      setTargetFatG(Math.round(data.targetFatG).toString());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalType, profileComplete]);

  function handleSaveGoal() {
    startSaving(async () => {
      setSaved(false);
      setSaveError(null);
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalType,
          targetKcal: Number(targetKcal),
          targetProteinG: Number(targetProteinG),
          targetCarbsG: Number(targetCarbsG),
          targetFatG: Number(targetFatG),
          source: "calculated",
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setSaveError(strings.common.genericError);
      }
    });
  }

  if (!profileComplete) {
    return (
      <Section title={strings.bmiScreen.sectionTitle}>
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>{strings.profile.incompleteForBmi}</p>
      </Section>
    );
  }

  return (
    <Section title={strings.bmiScreen.sectionTitle}>
      {currentGoal && (
        <div className="rounded-xl p-3 text-sm" style={{ background: "var(--muted)" }}>
          <p className="font-semibold">{strings.bmiScreen.currentGoalTitle}</p>
          <p dir="ltr" style={{ color: "var(--ink-muted)" }}>
            {Math.round(Number(currentGoal.targetKcal))} kcal ·{" "}
            {Math.round(Number(currentGoal.targetProteinG))}P{" "}
            {Math.round(Number(currentGoal.targetCarbsG))}C{" "}
            {Math.round(Number(currentGoal.targetFatG))}F
          </p>
        </div>
      )}

      <Field label={strings.bmiScreen.goalTypeLabel}>
        <Select value={goalType} onValueChange={(v) => setGoalType(v as GoalType)}>
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue>{GOAL_TYPE_LABELS[goalType]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {GOAL_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {GOAL_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {error === "no_weight_log" && (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>{strings.profile.incompleteForBmi}</p>
      )}

      {bmi && !isPending && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <StatCard label={strings.bmiScreen.bmiLabel} value={bmi.bmi.toFixed(1)} sub={BMI_CATEGORY_LABELS[bmi.bmiCategory]} />
            <StatCard label={strings.bmiScreen.bmrLabel} value={Math.round(bmi.bmr).toString()} />
            <StatCard label={strings.bmiScreen.tdeeLabel} value={Math.round(bmi.tdee).toString()} />
          </div>

          {bmi.flooredAtMinimum && (
            <p
              className="rounded-xl p-2.5 text-sm"
              style={{ background: "var(--unverified-bg)", color: "var(--unverified-fg)" }}
            >
              {strings.bmiScreen.flooredWarning}
            </p>
          )}

          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{bmi.disclaimer}</p>

          <div className="flex flex-col gap-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <p className="text-[13px] font-bold" style={{ color: "var(--ink-muted)" }}>
              {strings.bmiScreen.orEditManually}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FieldNum label={strings.bmiScreen.targetKcalLabel} value={targetKcal} onChange={setTargetKcal} />
              <FieldNum
                label={strings.bmiScreen.targetProteinLabel}
                value={targetProteinG}
                onChange={setTargetProteinG}
              />
              <FieldNum
                label={strings.bmiScreen.targetCarbsLabel}
                value={targetCarbsG}
                onChange={setTargetCarbsG}
              />
              <FieldNum label={strings.bmiScreen.targetFatLabel} value={targetFatG} onChange={setTargetFatG} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSaveGoal}
              disabled={isSaving}
              className="h-12 rounded-2xl text-[15px] font-bold"
              style={{ background: "var(--accent-coral)" }}
            >
              {isSaving ? strings.common.saving : strings.bmiScreen.saveGoal}
            </Button>
            {saved && !isSaving && (
              <p className="text-center text-xs" style={{ color: "var(--ink-muted)" }}>{strings.bmiScreen.goalSaved}</p>
            )}
            {saveError && <p className="text-center text-xs text-destructive">{saveError}</p>}
          </div>
        </>
      )}
    </Section>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-2" style={{ background: "var(--muted)" }}>
      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{label}</p>
      <p dir="ltr" className="font-semibold">{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{sub}</p>}
    </div>
  );
}

function FieldNum({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Input dir="ltr" type="number" value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl" />
    </Field>
  );
}
