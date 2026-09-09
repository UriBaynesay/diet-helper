"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldHint } from "@/components/field-hint";
import { strings } from "@/lib/strings";
import { todayIso } from "@/lib/format-date";

type Sex = "male" | "female";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

const ACTIVITY_LEVELS: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];
const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: strings.profile.activitySedentary,
  light: strings.profile.activityLight,
  moderate: strings.profile.activityModerate,
  active: strings.profile.activityActive,
  very_active: strings.profile.activityVeryActive,
};

export type ProfileData = {
  sex: Sex | null;
  birthDate: string | null;
  heightCm: number | null;
  activityLevel: ActivityLevel | null;
  notificationsEnabled: boolean;
};

export function ProfileForm({
  profile,
  latestWeightKg,
}: {
  profile: ProfileData;
  latestWeightKg: number | null;
}) {
  const router = useRouter();
  const [sex, setSex] = useState<Sex | null>(profile.sex);
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? "");
  const [heightCm, setHeightCm] = useState(profile.heightCm?.toString() ?? "");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(profile.activityLevel);
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile.notificationsEnabled);
  const [weightKg, setWeightKg] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    startTransition(async () => {
      setSaved(false);
      setError(null);
      const body: Record<string, unknown> = {
        sex: sex ?? undefined,
        birthDate: birthDate || undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        activityLevel: activityLevel ?? undefined,
        notificationsEnabled,
      };
      if (weightKg.trim()) {
        body.weightKg = Number(weightKg);
        body.loggedOn = todayIso();
      }

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaved(true);
        setWeightKg("");
        router.refresh();
      } else {
        setError(strings.common.genericError);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Section title={strings.profile.detailsSectionTitle}>
        <Field label={strings.profile.sexLabel}>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={sex === "male" ? "default" : "outline"}
              className="flex-1 rounded-xl"
              style={sex === "male" ? { background: "var(--accent-coral)" } : undefined}
              onClick={() => setSex("male")}
            >
              {strings.profile.sexMale}
            </Button>
            <Button
              type="button"
              variant={sex === "female" ? "default" : "outline"}
              className="flex-1 rounded-xl"
              style={sex === "female" ? { background: "var(--accent-coral)" } : undefined}
              onClick={() => setSex("female")}
            >
              {strings.profile.sexFemale}
            </Button>
          </div>
        </Field>

        <Field label={strings.profile.birthDateLabel}>
          <Input
            id="birth-date"
            type="date"
            dir="ltr"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="rounded-xl"
          />
        </Field>

        <Field label={strings.profile.heightLabel}>
          <Input
            id="height"
            type="number"
            dir="ltr"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="rounded-xl"
          />
        </Field>

        <Field label={strings.profile.activityLabel} hint={strings.profile.activityHint}>
          <Select
            value={activityLevel ?? undefined}
            onValueChange={(v) => setActivityLevel(v as ActivityLevel)}
          >
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue>{activityLevel ? ACTIVITY_LABELS[activityLevel] : ""}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {ACTIVITY_LABELS[level]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center justify-between">
          <Label htmlFor="notifications" style={{ color: "var(--ink-muted)" }}>
            {strings.profile.notificationsLabel}
          </Label>
          <Switch id="notifications" checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
        </div>
      </Section>

      <Section title={strings.profile.weightSectionTitle}>
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          {latestWeightKg !== null ? (
            <>
              {strings.profile.latestWeightLabel}: <span dir="ltr">{latestWeightKg} ק״ג</span>
            </>
          ) : (
            strings.profile.noWeightYet
          )}
        </p>
        <Field label={strings.profile.weightLabel} hint={strings.profile.weightHint}>
          <Input
            id="weight"
            type="number"
            dir="ltr"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="rounded-xl"
          />
        </Field>
      </Section>

      <div className="flex flex-col gap-2">
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="h-12 rounded-2xl text-[15px] font-bold"
          style={{ background: "var(--accent-coral)" }}
        >
          {isPending ? strings.common.saving : strings.profile.saveProfile}
        </Button>
        {saved && !isPending && (
          <p className="text-center text-xs" style={{ color: "var(--ink-muted)" }}>
            {strings.profile.profileSaved}
          </p>
        )}
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[18px] border bg-card p-3.5" style={{ borderColor: "var(--border)" }}>
      <p className="text-[13px] font-bold" style={{ color: "var(--ink-muted)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="items-center gap-1" style={{ color: "var(--ink-muted)" }}>
        {label}
        {hint && <FieldHint text={hint} />}
      </Label>
      {children}
    </div>
  );
}
