import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
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
    <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate font-medium">{product.name}</span>
          <Badge variant={product.isVerified ? "default" : "secondary"}>
            {product.isVerified ? strings.products.verified : strings.products.unverified}
          </Badge>
        </div>
        {product.brand && <span className="text-sm text-muted-foreground">{product.brand}</span>}
        <span dir="ltr" className="text-xs text-muted-foreground">
          {Math.round(Number(product.kcalPer100g))} kcal · {Math.round(Number(product.proteinPer100g))}P{" "}
          {Math.round(Number(product.carbsPer100g))}C {Math.round(Number(product.fatPer100g))}F{" "}
          {strings.products.perHundredG}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ProductFormDialog
          productId={product.id}
          initialValues={toFormValues(product)}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label={strings.products.editProduct}>
              <Pencil className="size-3.5" />
            </Button>
          }
        />
        <ArchiveProductButton productId={product.id} />
      </div>
    </div>
  );
}
