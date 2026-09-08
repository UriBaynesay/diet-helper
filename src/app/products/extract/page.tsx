import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { strings } from "@/lib/strings";
import { BottomNav } from "@/components/bottom-nav";
import { ExtractionFlow } from "@/components/products/extraction-flow";

export default async function ExtractPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-32">
        <Link
          href="/products"
          className="flex items-center gap-1 text-sm font-semibold"
          style={{ color: "var(--ink-muted)" }}
        >
          {/* "back" moves to the products list — in RTL that's a rightward
              chevron, same reasoning as DateNav's "previous day" arrow. */}
          <ChevronRight className="size-4" />
          {strings.products.title}
        </Link>
        <ExtractionFlow />
      </main>
      <BottomNav />
    </>
  );
}
