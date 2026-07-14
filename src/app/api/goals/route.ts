import { db } from "@/db";
import { goals } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { goalInputSchema } from "@/lib/goals/schema";
import { findActiveGoal } from "@/lib/goals/active-goal";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  let user;
  try {
    user = requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  if (dateParam && !DATE_RE.test(dateParam)) {
    return apiError("validation_error", "date must be YYYY-MM-DD", 400);
  }
  const onDate = dateParam ? new Date(dateParam) : new Date();

  const activeGoal = await findActiveGoal(user.userId, onDate);
  return apiData({ goal: activeGoal ?? null });
}

export async function POST(request: Request) {
  let user;
  try {
    user = requireUser(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return apiError("unauthenticated", "Missing verified user", 401);
    }
    throw error;
  }

  const body = await request.json();
  const parsed = goalInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", parsed.error.message, 400);
  }
  const input = parsed.data;
  const effectiveFrom = input.effectiveFrom ?? new Date().toISOString().slice(0, 10);

  const [row] = await db
    .insert(goals)
    .values({
      userId: user.userId,
      effectiveFrom: new Date(effectiveFrom),
      goalType: input.goalType,
      targetKcal: input.targetKcal.toString(),
      targetProteinG: input.targetProteinG.toString(),
      targetCarbsG: input.targetCarbsG.toString(),
      targetFatG: input.targetFatG.toString(),
      source: input.source,
    })
    .returning();

  return apiData({ goal: row }, { status: 201 });
}
