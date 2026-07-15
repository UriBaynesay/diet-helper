import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiData, apiError } from "@/lib/api-response";
import { isValidCronRequest } from "@/lib/cron/guard";
import { sendDailySummaryForUserDate } from "@/lib/notifications/send-daily-summary";
import { todayInTimezone, yesterdayInTimezone } from "@/lib/notifications/timezone";

export async function POST(request: Request) {
  if (!isValidCronRequest(request)) {
    return apiError("unauthorized", "Invalid or missing cron secret", 401);
  }

  const eligibleUsers = await db
    .select()
    .from(users)
    .where(and(eq(users.isAllowed, true), eq(users.notificationsEnabled, true)));

  const results = [];
  for (const user of eligibleUsers) {
    // "Today" is resolved per-user timezone, never the container's UTC clock.
    const today = todayInTimezone(user.timezone);
    const todayResult = await sendDailySummaryForUserDate(user, today, false);
    results.push({ userId: user.id, coversDate: today, ...todayResult });

    // Catch-up: the PC may have been asleep at the scheduled time, so also
    // check yesterday — but never further back than one day.
    const yesterday = yesterdayInTimezone(user.timezone);
    const yesterdayResult = await sendDailySummaryForUserDate(user, yesterday, true);
    results.push({ userId: user.id, coversDate: yesterday, ...yesterdayResult });
  }

  return apiData({ results });
}
