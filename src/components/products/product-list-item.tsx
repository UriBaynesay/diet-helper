import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductFormDialog, type ProductFormValues } from "@/components/products/product-form-dialog";
import { ArchiveProductButton } from "@/components/products/archive-product-button";
import { strings } from "@/lib/strings";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  servingLabel: string | null;
  servingSizeG: string | null;
  kcalPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
  fiberPer100g: string | null;
  sugarPer100g: string | null;
  sodiumMgPer100g: string | null;
  isVerified: boolean;
};

function toFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    brand: product.brand ?? "",
    barcode: product.barcode ?? "",
    servingLabel: product.servingLabel ?? "",
    servingSizeG: product.servingSizeG ?? "",
    kcalPer100g: product.kcalPer100g,
    proteinPer100g: product.proteinPer100g,
    carbsPer100g: product.carbsPer100g,
    fatPer100g: product.fatPer100g,
    fiberPer100g: product.fiberPer100g ?? "",
    sugarPer100g: product.sugarPer100g ?? "",
    sodiumMgPer100g: product.sodiumMgPer100g ?? "",
  };
}

export function ProductListItem({ product }: { product: Product }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-2xl border bg-card p-3.5"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-[14.5px] font-semibold">{product.name}</span>
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            style={{
              background: product.isVerified ? "var(--verified-bg)" : "var(--unverified-bg)",
              color: product.isVerified ? "var(--verified-fg)" : "var(--unverified-fg)",
            }}
          >
            {product.isVerified ? strings.products.verified : strings.products.unverified}
          </span>
        </div>
        {product.brand && (
          <span className="text-sm" style={{ color: "var(--ink-muted)" }}>
            {product.brand}
          </span>
        )}
        <div dir="ltr" className="mt-0.5 text-xs" style={{ color: "var(--ink-muted)" }}>
          {Math.round(Number(product.kcalPer100g))} kcal · {Math.round(Number(product.proteinPer100g))}P{" "}
          {Math.round(Number(product.carbsPer100g))}C {Math.round(Number(product.fatPer100g))}F{" "}
          {strings.products.perHundredG}
        </div>
      </div>
      <ProductFormDialog
        productId={product.id}
        initialValues={toFormValues(product)}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={strings.products.editProduct}
            className="size-[30px] rounded-[10px]"
            style={{ background: "var(--muted)" }}
          >
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <ArchiveProductButton productId={product.id} />
    </div>
  );
}
