"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof ProductFormValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit() {
    if (!values.name.trim()) return;

    startTransition(async () => {
      const res = await fetch(productId ? `/api/products/${productId}` : "/api/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(values)),
      });
      if (!res.ok) return;
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !productId) setValues(EMPTY_VALUES);
        if (next) setWarning(null);
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {productId ? strings.products.editProduct : strings.products.newProduct}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field label={strings.products.nameLabel} required>
            <Input value={values.name} onChange={(e) => set("name", e.target.value)} autoFocus />
          </Field>
          <Field label={strings.products.brandLabel}>
            <Input value={values.brand} onChange={(e) => set("brand", e.target.value)} />
          </Field>
          <Field label={strings.products.barcodeLabel} hint={strings.products.barcodeHint}>
            <Input dir="ltr" value={values.barcode} onChange={(e) => set("barcode", e.target.value)} />
          </Field>
          <Field label={strings.products.servingLabelLabel} hint={strings.products.servingLabelHint}>
            <Input value={values.servingLabel} onChange={(e) => set("servingLabel", e.target.value)} />
          </Field>
          <Field label={strings.products.servingSizeGLabel} hint={strings.products.servingSizeGHint}>
            <Input
              dir="ltr"
              type="number"
              value={values.servingSizeG}
              onChange={(e) => set("servingSizeG", e.target.value)}
            />
          </Field>

          <div className="flex items-center gap-1 text-sm font-medium">
            {strings.products.macrosSectionLabel}
            <FieldHint text={strings.products.macrosHint} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={strings.products.kcalLabel} required>
              <Input
                dir="ltr"
                type="number"
                value={values.kcalPer100g}
                onChange={(e) => set("kcalPer100g", e.target.value)}
              />
            </Field>
            <Field label={strings.products.proteinLabel} required>
              <Input
                dir="ltr"
                type="number"
                value={values.proteinPer100g}
                onChange={(e) => set("proteinPer100g", e.target.value)}
              />
            </Field>
            <Field label={strings.products.carbsLabel} required>
              <Input
                dir="ltr"
                type="number"
                value={values.carbsPer100g}
                onChange={(e) => set("carbsPer100g", e.target.value)}
              />
            </Field>
            <Field label={strings.products.fatLabel} required>
              <Input
                dir="ltr"
                type="number"
                value={values.fatPer100g}
                onChange={(e) => set("fatPer100g", e.target.value)}
              />
            </Field>
            <Field label={strings.products.fiberLabel}>
              <Input
                dir="ltr"
                type="number"
                value={values.fiberPer100g}
                onChange={(e) => set("fiberPer100g", e.target.value)}
              />
            </Field>
            <Field label={strings.products.sugarLabel}>
              <Input
                dir="ltr"
                type="number"
                value={values.sugarPer100g}
                onChange={(e) => set("sugarPer100g", e.target.value)}
              />
            </Field>
            <Field label={strings.products.sodiumLabel}>
              <Input
                dir="ltr"
                type="number"
                value={values.sodiumMgPer100g}
                onChange={(e) => set("sodiumMgPer100g", e.target.value)}
              />
            </Field>
          </div>

          {warning === "kcal_mismatch" && (
            <p className="rounded-lg bg-amber-500/10 p-2 text-sm text-amber-700 dark:text-amber-400">
              {strings.products.kcalMismatchWarning}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!values.name.trim() || isPending}>
            {strings.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="items-center gap-1">
        {label}
        {required && <span className="text-destructive"> *</span>}
        {hint && <FieldHint text={hint} />}
      </Label>
      {children}
    </div>
  );
}
