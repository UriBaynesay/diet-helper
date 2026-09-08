import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Camera } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProducts, isProductFilter } from "@/lib/products/get-products";
import { strings } from "@/lib/strings";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProductSearchBar } from "@/components/products/product-search-bar";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductListItem } from "@/components/products/product-list-item";
import { BottomNav } from "@/components/bottom-nav";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { q, filter: filterParam } = await searchParams;
  const filter = isProductFilter(filterParam) ? filterParam : "all";

  const products = await getProducts(q, filter);

  return (
    <>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-32">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{strings.products.title}</h1>
          <div className="flex gap-2">
            <Link
              href="/products/extract"
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              <Camera className="size-4" />
              {strings.products.addFromPhoto}
            </Link>
            <ProductFormDialog
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  {strings.products.addProduct}
                </Button>
              }
            />
          </div>
        </div>

        <ProductSearchBar q={q ?? ""} filter={filter} />

        {products.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{strings.products.noResults}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((product) => (
              <ProductListItem key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
