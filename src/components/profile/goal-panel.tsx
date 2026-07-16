"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <Card>
        <CardHeader>
          <CardTitle>{strings.bmiScreen.sectionTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{strings.profile.incompleteForBmi}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.bmiScreen.sectionTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {currentGoal && (
          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <p className="font-medium">{strings.bmiScreen.currentGoalTitle}</p>
            <p dir="ltr" className="text-muted-foreground">
              {Math.round(Number(currentGoal.targetKcal))} kcal ·{" "}
              {Math.round(Number(currentGoal.targetProteinG))}P{" "}
              {Math.round(Number(currentGoal.targetCarbsG))}C{" "}
              {Math.round(Number(currentGoal.targetFatG))}F
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>{strings.bmiScreen.goalTypeLabel}</Label>
          <Select value={goalType} onValueChange={(v) => setGoalType(v as GoalType)}>
            <SelectTrigger className="w-full">
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
        </div>

        {error === "no_weight_log" && (
          <p className="text-sm text-muted-foreground">{strings.profile.incompleteForBmi}</p>
        )}

        {bmi && !isPending && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-xs text-muted-foreground">{strings.bmiScreen.bmiLabel}</p>
                <p dir="ltr" className="font-medium">
                  {bmi.bmi.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">{BMI_CATEGORY_LABELS[bmi.bmiCategory]}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-xs text-muted-foreground">{strings.bmiScreen.bmrLabel}</p>
                <p dir="ltr" className="font-medium">
                  {Math.round(bmi.bmr)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-xs text-muted-foreground">{strings.bmiScreen.tdeeLabel}</p>
                <p dir="ltr" className="font-medium">
                  {Math.round(bmi.tdee)}
                </p>
              </div>
            </div>

            {bmi.flooredAtMinimum && (
              <p className="rounded-lg bg-amber-500/10 p-2 text-sm text-amber-700 dark:text-amber-400">
                {strings.bmiScreen.flooredWarning}
              </p>
            )}

            <p className="text-xs text-muted-foreground">{bmi.disclaimer}</p>

            <div className="flex flex-col gap-3 border-t pt-3">
              <p className="text-sm font-medium">{strings.bmiScreen.orEditManually}</p>
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
              <Button onClick={handleSaveGoal} disabled={isSaving}>
                {isSaving ? strings.common.saving : strings.bmiScreen.saveGoal}
              </Button>
              {saved && !isSaving && (
                <p className="text-center text-xs text-muted-foreground">{strings.bmiScreen.goalSaved}</p>
              )}
              {saveError && (
                <p className="text-center text-xs text-destructive">{saveError}</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
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
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input dir="ltr" type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
