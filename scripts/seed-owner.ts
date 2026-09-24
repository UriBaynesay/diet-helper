// Run manually: npm run db:seed-owner (never invoked by app boot or any route).
import { db } from "@/db";
import { profiles } from "@/db/schema";

async function main() {
  const email = process.env.OWNER_EMAIL;
  if (!email) {
    throw new Error("OWNER_EMAIL env var is required");
  }

  await db
    .insert(profiles)
    .values({ email, isAllowed: true, name: "Owner" })
    .onConflictDoNothing({ target: profiles.email });

  console.log(`Seeded owner: ${email}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
