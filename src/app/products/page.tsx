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
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 p-4 pb-32">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[26px] font-extrabold">{strings.products.title}</h1>
          <div className="flex gap-2">
            <Link
              href="/products/extract"
              aria-label={strings.products.addFromPhoto}
              className={buttonVariants({
                variant: "ghost",
                className: "size-9 rounded-xl",
              })}
              style={{ background: "var(--muted)" }}
            >
              <Camera className="size-[17px]" style={{ color: "var(--ink-mid)" }} />
            </Link>
            <ProductFormDialog
              trigger={
                <Button
                  aria-label={strings.products.addProduct}
                  className="size-9 rounded-xl text-white"
                  style={{ background: "var(--accent-coral)" }}
                >
                  <Plus className="size-4" />
                </Button>
              }
            />
          </div>
        </div>

        <ProductSearchBar q={q ?? ""} filter={filter} />

        {products.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
            {strings.products.noResults}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
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
