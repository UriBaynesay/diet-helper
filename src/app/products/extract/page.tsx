import { redirect } from "next/navigation";
import Link from "next/link";
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
        <Link href="/products" className="text-sm text-muted-foreground">
          ← {strings.products.title}
        </Link>
        <ExtractionFlow />
      </main>
      <BottomNav />
    </>
  );
}
