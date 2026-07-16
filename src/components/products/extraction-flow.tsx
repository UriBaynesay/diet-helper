"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strings } from "@/lib/strings";

type Confidence = "high" | "medium" | "low";

type ParsedResult = {
  product_name: string | null;
  brand: string | null;
  serving_label: string | null;
  serving_size_g: number | null;
  basis: "per_100g" | "per_serving";
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  confidence: Confidence;
  notes: string | null;
};

type Job = {
  id: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  parsed: ParsedResult | null;
  error: string | null;
};

type Stage = "idle" | "uploading" | "polling" | "review" | "saved";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_BYTES = 10 * 1024 * 1024;

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: strings.extraction.confidenceHigh,
  medium: strings.extraction.confidenceMedium,
  low: strings.extraction.confidenceLow,
};

function fieldToString(value: number | null): string {
  return value === null ? "" : value.toString();
}

export function ExtractionFlow() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!ACCEPTED_TYPES.includes(selected.type) || selected.size > MAX_BYTES) {
      setError(strings.extraction.unsupportedFile);
      return;
    }
    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setJob(null);
    setStage("idle");
  }

  async function pollJob(jobId: string) {
    setStage("polling");
    for (let attempt = 0; attempt < 30; attempt++) {
      const res = await fetch(`/api/products/extract/${jobId}`);
      if (!res.ok) break;
      const { data } = await res.json();
      const currentJob: Job = data.job;
      if (currentJob.status === "succeeded" || currentJob.status === "failed") {
        setJob(currentJob);
        if (currentJob.status === "succeeded" && currentJob.parsed) {
          const p = currentJob.parsed;
          setValues({
            name: p.product_name ?? "",
            brand: p.brand ?? "",
            servingLabel: p.serving_label ?? "",
            servingSizeG: fieldToString(p.serving_size_g),
            kcalPer100g: fieldToString(p.kcal),
            proteinPer100g: fieldToString(p.protein_g),
            carbsPer100g: fieldToString(p.carbs_g),
            fatPer100g: fieldToString(p.fat_g),
            fiberPer100g: fieldToString(p.fiber_g),
            sugarPer100g: fieldToString(p.sugar_g),
            sodiumMgPer100g: fieldToString(p.sodium_mg),
          });
        }
        setStage("review");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    setError(strings.extraction.failed);
    setStage("idle");
  }

  function handleUpload() {
    if (!file) return;
    startTransition(async () => {
      setStage("uploading");
      setError(null);
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/products/extract", { method: "POST", body: formData });
      if (!res.ok) {
        setError(strings.extraction.failed);
        setStage("idle");
        return;
      }
      const { data } = await res.json();
      await pollJob(data.jobId);
    });
  }

  function handleRetry() {
    if (!job) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/products/extract/${job.id}/retry`, { method: "POST" });
      if (!res.ok) {
        setError(strings.extraction.failed);
        return;
      }
      await pollJob(job.id);
    });
  }

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleConfirm() {
    if (!job) return;
    startTransition(async () => {
      const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
      const str = (s: string) => (s.trim() === "" ? undefined : s.trim());
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          brand: str(values.brand) ?? null,
          servingLabel: str(values.servingLabel) ?? null,
          servingSizeG: num(values.servingSizeG) ?? null,
          kcalPer100g: num(values.kcalPer100g) ?? 0,
          proteinPer100g: num(values.proteinPer100g) ?? 0,
          carbsPer100g: num(values.carbsPer100g) ?? 0,
          fatPer100g: num(values.fatPer100g) ?? 0,
          fiberPer100g: num(values.fiberPer100g) ?? null,
          sugarPer100g: num(values.sugarPer100g) ?? null,
          sodiumMgPer100g: num(values.sodiumMgPer100g) ?? null,
          extractionJobId: job.id,
        }),
      });
      if (!res.ok) {
        setError(strings.extraction.failed);
        return;
      }
      setStage("saved");
      router.push("/products");
      router.refresh();
    });
  }

  const needsServingSize =
    job?.parsed?.basis === "per_serving" && !job.parsed.serving_size_g && stage === "review";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.extraction.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={handleFileSelect}
        />

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="max-h-64 w-full rounded-lg border object-contain"
          />
        )}

        {stage === "idle" && (
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            {file ? strings.extraction.changeImage : strings.extraction.chooseImage}
          </Button>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {stage === "idle" && file && (
          <Button onClick={handleUpload} disabled={isPending}>
            {strings.extraction.upload}
          </Button>
        )}

        {(stage === "uploading" || stage === "polling") && (
          <p className="text-center text-sm text-muted-foreground">
            {stage === "uploading" ? strings.extraction.uploading : strings.extraction.processing}
          </p>
        )}

        {stage === "review" && job?.status === "failed" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-destructive">{job.error ?? strings.extraction.failed}</p>
            <Button variant="outline" onClick={handleRetry} disabled={isPending}>
              {strings.extraction.retry}
            </Button>
          </div>
        )}

        {stage === "review" && job?.status === "succeeded" && job.parsed && (
          <div className="flex flex-col gap-3">
            <p className="rounded-lg bg-muted/40 p-2 text-sm">
              {strings.extraction.reviewHint}{" "}
              <span className="font-medium">{CONFIDENCE_LABELS[job.parsed.confidence]}</span>
            </p>

            {needsServingSize && (
              <p className="rounded-lg bg-amber-500/10 p-2 text-sm text-amber-700 dark:text-amber-400">
                {strings.extraction.missingServingSize}
              </p>
            )}

            <ReviewField label={strings.products.nameLabel} value={values.name} onChange={(v) => set("name", v)} />
            <ReviewField label={strings.products.brandLabel} value={values.brand} onChange={(v) => set("brand", v)} />
            <div className="grid grid-cols-2 gap-3">
              <ReviewField
                label={strings.products.servingLabelLabel}
                value={values.servingLabel}
                onChange={(v) => set("servingLabel", v)}
              />
              <ReviewField
                label={strings.products.servingSizeGLabel}
                value={values.servingSizeG}
                onChange={(v) => set("servingSizeG", v)}
                numeric
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ReviewField
                label={strings.products.kcalLabel}
                value={values.kcalPer100g}
                onChange={(v) => set("kcalPer100g", v)}
                numeric
              />
              <ReviewField
                label={strings.products.proteinLabel}
                value={values.proteinPer100g}
                onChange={(v) => set("proteinPer100g", v)}
                numeric
              />
              <ReviewField
                label={strings.products.carbsLabel}
                value={values.carbsPer100g}
                onChange={(v) => set("carbsPer100g", v)}
                numeric
              />
              <ReviewField
                label={strings.products.fatLabel}
                value={values.fatPer100g}
                onChange={(v) => set("fatPer100g", v)}
                numeric
              />
              <ReviewField
                label={strings.products.fiberLabel}
                value={values.fiberPer100g}
                onChange={(v) => set("fiberPer100g", v)}
                numeric
              />
              <ReviewField
                label={strings.products.sugarLabel}
                value={values.sugarPer100g}
                onChange={(v) => set("sugarPer100g", v)}
                numeric
              />
              <ReviewField
                label={strings.products.sodiumLabel}
                value={values.sodiumMgPer100g}
                onChange={(v) => set("sodiumMgPer100g", v)}
                numeric
              />
            </div>
          </div>
        )}
      </CardContent>
      {stage === "review" && job?.status === "succeeded" && (
        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={handleConfirm}
            disabled={!values.name?.trim() || isPending}
            className="w-full"
          >
            {strings.extraction.confirmAndSave}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setFile(null);
              setPreviewUrl(null);
              setJob(null);
              setValues({});
              setStage("idle");
            }}
          >
            {strings.extraction.startOver}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function ReviewField({
  label,
  value,
  onChange,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input
        dir={numeric ? "ltr" : undefined}
        type={numeric ? "number" : "text"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
