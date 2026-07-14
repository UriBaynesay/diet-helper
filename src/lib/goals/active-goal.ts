import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";

// The active goal for a date is the one with the greatest effective_from <=
// that date — goals are append-only, so this never rewrites past history
// when a new goal is saved.
export async function findActiveGoal(userId: string, onDate: Date) {
  return db.query.goals.findFirst({
    where: and(eq(goals.userId, userId), lte(goals.effectiveFrom, onDate)),
    orderBy: desc(goals.effectiveFrom),
  });
}
