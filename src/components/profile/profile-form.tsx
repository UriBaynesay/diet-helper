"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{strings.profile.detailsSectionTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{strings.profile.sexLabel}</Label>
            <RadioGroup
              value={sex ?? undefined}
              onValueChange={(v) => setSex(v as Sex)}
              className="flex flex-row gap-8"
            >
              <div className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="male" id="sex-male" />
                <Label htmlFor="sex-male">{strings.profile.sexMale}</Label>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="female" id="sex-female" />
                <Label htmlFor="sex-female">{strings.profile.sexFemale}</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="birth-date">{strings.profile.birthDateLabel}</Label>
            <Input
              id="birth-date"
              type="date"
              dir="ltr"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="height">{strings.profile.heightLabel}</Label>
            <Input
              id="height"
              type="number"
              dir="ltr"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="items-center gap-1">
              {strings.profile.activityLabel}
              <FieldHint text={strings.profile.activityHint} />
            </Label>
            <Select
              value={activityLevel ?? undefined}
              onValueChange={(v) => setActivityLevel(v as ActivityLevel)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {activityLevel ? ACTIVITY_LABELS[activityLevel] : ""}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {ACTIVITY_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notifications">{strings.profile.notificationsLabel}</Label>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{strings.profile.weightSectionTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {latestWeightKg !== null ? (
              <>
                {strings.profile.latestWeightLabel}:{" "}
                <span dir="ltr">{latestWeightKg} ק״ג</span>
              </>
            ) : (
              strings.profile.noWeightYet
            )}
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="weight" className="items-center gap-1">
              {strings.profile.weightLabel}
              <FieldHint text={strings.profile.weightHint} />
            </Label>
            <Input
              id="weight"
              type="number"
              dir="ltr"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? strings.common.saving : strings.profile.saveProfile}
        </Button>
        {saved && !isPending && (
          <p className="text-center text-xs text-muted-foreground">{strings.profile.profileSaved}</p>
        )}
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
