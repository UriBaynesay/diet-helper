import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, weightLogs } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";
import { profileUpdateSchema } from "@/lib/profile/schema";

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

  const profile = await db.query.users.findFirst({ where: eq(users.id, user.userId) });
  const latestWeight = await db.query.weightLogs.findFirst({
    where: eq(weightLogs.userId, user.userId),
    orderBy: desc(weightLogs.loggedOn),
  });

  return apiData({ profile, latestWeight: latestWeight ?? null });
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
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", parsed.error.message, 400);
  }
  const input = parsed.data;

  const [profile] = await db
    .update(users)
    .set({
      sex: input.sex,
      birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
      heightCm: input.heightCm,
      activityLevel: input.activityLevel,
      notificationsEnabled: input.notificationsEnabled,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.userId))
    .returning();

  let latestWeight = null;
  if (input.weightKg !== undefined) {
    const loggedOn = input.loggedOn ?? new Date().toISOString().slice(0, 10);
    [latestWeight] = await db
      .insert(weightLogs)
      .values({
        userId: user.userId,
        weightKg: input.weightKg.toString(),
        loggedOn: new Date(loggedOn),
      })
      .onConflictDoUpdate({
        target: [weightLogs.userId, weightLogs.loggedOn],
        set: { weightKg: input.weightKg.toString(), updatedAt: new Date() },
      })
      .returning();
  }

  return apiData({ profile, latestWeight });
}
