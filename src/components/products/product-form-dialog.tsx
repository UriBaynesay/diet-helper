"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldHint } from "@/components/field-hint";
import { strings } from "@/lib/strings";

export type ProductFormValues = {
  name: string;
  brand: string;
  barcode: string;
  servingLabel: string;
  servingSizeG: string;
  kcalPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
  fiberPer100g: string;
  sugarPer100g: string;
  sodiumMgPer100g: string;
};

const EMPTY_VALUES: ProductFormValues = {
  name: "",
  brand: "",
  barcode: "",
  servingLabel: "",
  servingSizeG: "",
  kcalPer100g: "",
  proteinPer100g: "",
  carbsPer100g: "",
  fatPer100g: "",
  fiberPer100g: "",
  sugarPer100g: "",
  sodiumMgPer100g: "",
};

function toPayload(values: ProductFormValues) {
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  const str = (s: string) => (s.trim() === "" ? undefined : s.trim());
  return {
    name: values.name.trim(),
    brand: str(values.brand) ?? null,
    barcode: str(values.barcode) ?? null,
    servingLabel: str(values.servingLabel) ?? null,
    servingSizeG: num(values.servingSizeG) ?? null,
    kcalPer100g: num(values.kcalPer100g) ?? 0,
    proteinPer100g: num(values.proteinPer100g) ?? 0,
    carbsPer100g: num(values.carbsPer100g) ?? 0,
    fatPer100g: num(values.fatPer100g) ?? 0,
    fiberPer100g: num(values.fiberPer100g) ?? null,
    sugarPer100g: num(values.sugarPer100g) ?? null,
    sodiumMgPer100g: num(values.sodiumMgPer100g) ?? null,
  };
}

/**
 * Bottom sheet per the UI redesign handoff. The mockup only shows
 * name/brand + kcal-protein-carbs-fat, but this preserves every existing
 * field (barcode, serving label/size, fiber/sugar/sodium) and the
 * kcal-sanity-mismatch warning banner — real fields the redesign's mockup
 * just didn't visually spec, not fields to drop.
 */
export function ProductFormDialog({
  trigger,
  productId,
  initialValues,
}: {
  trigger: ReactNode;
  productId?: string;
  initialValues?: ProductFormValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ProductFormValues>(initialValues ?? EMPTY_VALUES);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof ProductFormValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit() {
    if (!values.name.trim()) return;

    startTransition(async () => {
      setError(null);
      const res = await fetch(productId ? `/api/products/${productId}` : "/api/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(values)),
      });
      if (!res.ok) {
        setError(strings.common.genericError);
        return;
      }
      const { data } = await res.json();
      // The save always succeeds even when a warning comes back (the API
      // never blocks on the 4/4/9 sanity check) — router.refresh() runs
      // either way so the list reflects the new/edited product immediately.
      if (data.warning) {
        setWarning(data.warning);
      } else {
        setOpen(false);
        setWarning(null);
      }
      router.refresh();
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !productId) setValues(EMPTY_VALUES);
        if (next) {
          setWarning(null);
          setError(null);
        }
      }}
    >
      <SheetTrigger render={trigger as React.ReactElement} />
      <SheetContent side="bottom" className="max-h-[86%] rounded-t-[24px] p-0" showCloseButton={false}>
        <SheetHeader className="sr-only">
          <SheetTitle>
            {productId ? strings.products.editProduct : strings.products.newProduct}
          </SheetTitle>
        </SheetHeader>

        <div className="flex max-h-[86vh] flex-col">
          <div className="flex shrink-0 items-center justify-between p-4 pb-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} style={{ color: "var(--ink-muted)" }}>
              {strings.common.cancel}
            </Button>
            <p className="font-display text-[16px] font-bold">
              {productId ? strings.products.editProduct : strings.products.newProduct}
            </p>
            <div className="w-10" />
          </div>

          <div className="flex flex-col gap-3.5 overflow-y-auto p-4 pt-1 pb-8">
            <Field label={strings.products.nameLabel} required>
              <Input value={values.name} onChange={(e) => set("name", e.target.value)} className="rounded-xl" autoFocus />
            </Field>
            <Field label={strings.products.brandLabel}>
              <Input value={values.brand} onChange={(e) => set("brand", e.target.value)} className="rounded-xl" />
            </Field>
            <Field label={strings.products.barcodeLabel} hint={strings.products.barcodeHint}>
              <Input dir="ltr" value={values.barcode} onChange={(e) => set("barcode", e.target.value)} className="rounded-xl" />
            </Field>
            <Field label={strings.products.servingLabelLabel} hint={strings.products.servingLabelHint}>
              <Input value={values.servingLabel} onChange={(e) => set("servingLabel", e.target.value)} className="rounded-xl" />
            </Field>
            <Field label={strings.products.servingSizeGLabel} hint={strings.products.servingSizeGHint}>
              <Input
                dir="ltr"
                type="number"
                value={values.servingSizeG}
                onChange={(e) => set("servingSizeG", e.target.value)}
                className="rounded-xl"
              />
            </Field>

            <div className="mt-1 flex items-center gap-1 text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>
              {strings.products.macrosSectionLabel}
              <FieldHint text={strings.products.macrosHint} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label={strings.products.kcalLabel} required compact>
                <Input dir="ltr" type="number" value={values.kcalPer100g} onChange={(e) => set("kcalPer100g", e.target.value)} className="rounded-[10px] text-center" />
              </Field>
              <Field label={strings.products.proteinLabel} required compact>
                <Input dir="ltr" type="number" value={values.proteinPer100g} onChange={(e) => set("proteinPer100g", e.target.value)} className="rounded-[10px] text-center" />
              </Field>
              <Field label={strings.products.carbsLabel} required compact>
                <Input dir="ltr" type="number" value={values.carbsPer100g} onChange={(e) => set("carbsPer100g", e.target.value)} className="rounded-[10px] text-center" />
              </Field>
              <Field label={strings.products.fatLabel} required compact>
                <Input dir="ltr" type="number" value={values.fatPer100g} onChange={(e) => set("fatPer100g", e.target.value)} className="rounded-[10px] text-center" />
              </Field>
              <Field label={strings.products.fiberLabel} compact>
                <Input dir="ltr" type="number" value={values.fiberPer100g} onChange={(e) => set("fiberPer100g", e.target.value)} className="rounded-[10px] text-center" />
              </Field>
              <Field label={strings.products.sugarLabel} compact>
                <Input dir="ltr" type="number" value={values.sugarPer100g} onChange={(e) => set("sugarPer100g", e.target.value)} className="rounded-[10px] text-center" />
              </Field>
              <Field label={strings.products.sodiumLabel} compact>
                <Input dir="ltr" type="number" value={values.sodiumMgPer100g} onChange={(e) => set("sodiumMgPer100g", e.target.value)} className="rounded-[10px] text-center" />
              </Field>
            </div>

            {warning === "kcal_mismatch" && (
              <p
                className="rounded-xl p-2.5 text-sm"
                style={{ background: "var(--unverified-bg)", color: "var(--unverified-fg)" }}
              >
                {strings.products.kcalMismatchWarning}
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              onClick={handleSubmit}
              disabled={!values.name.trim() || isPending}
              className="mt-1 h-12 rounded-2xl text-[15px] font-bold"
              style={{ background: "var(--accent-coral)" }}
            >
              {isPending ? strings.common.saving : strings.common.save}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  hint,
  compact,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className={compact ? "items-center gap-1 text-[11.5px]" : "items-center gap-1"} style={{ color: "var(--ink-muted)" }}>
        {label}
        {required && <span className="text-destructive"> *</span>}
        {hint && <FieldHint text={hint} />}
      </Label>
      {children}
    </div>
  );
}
