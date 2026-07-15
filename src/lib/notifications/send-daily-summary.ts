import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, notificationLogs } from "@/db/schema";
import { findActiveGoal } from "@/lib/goals/active-goal";
import { sendMail } from "./mailer";
import { buildSubject } from "./summary";
import { renderDailySummaryEmail } from "./template";
import { env } from "@/lib/env";

export type SendResult =
  | { outcome: "sent" }
  | { outcome: "skipped"; reason: "already_sent" | "no_entries" | "no_goal" }
  | { outcome: "failed"; error: string };

/**
 * Sends (or skips, or logs failure for) one user's daily_summary for one
 * calendar date. Idempotent: checks notification_logs for an existing
 * status='sent' row for the same user+date+type before doing anything.
 */
export async function sendDailySummaryForUserDate(
  user: { id: string; email: string },
  coversDate: string,
  isCatchUp: boolean
): Promise<SendResult> {
  const alreadySent = await db.query.notificationLogs.findFirst({
    where: and(
      eq(notificationLogs.userId, user.id),
      eq(notificationLogs.type, "daily_summary"),
      eq(notificationLogs.coversDate, new Date(coversDate)),
      eq(notificationLogs.status, "sent")
    ),
  });
  if (alreadySent) {
    return { outcome: "skipped", reason: "already_sent" };
  }

  const entries = await db
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.userId, user.id), eq(diaryEntries.entryDate, new Date(coversDate))));
  if (entries.length === 0) {
    return { outcome: "skipped", reason: "no_entries" };
  }

  const activeGoal = await findActiveGoal(user.id, new Date(coversDate));
  if (!activeGoal) {
    return { outcome: "skipped", reason: "no_goal" };
  }

  const consumed = entries.reduce(
    (acc, entry) => ({
      kcal: acc.kcal + Number(entry.kcal),
      proteinG: acc.proteinG + Number(entry.proteinG),
      carbsG: acc.carbsG + Number(entry.carbsG),
      fatG: acc.fatG + Number(entry.fatG),
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
  const target = {
    kcal: Number(activeGoal.targetKcal),
    proteinG: Number(activeGoal.targetProteinG),
    carbsG: Number(activeGoal.targetCarbsG),
    fatG: Number(activeGoal.targetFatG),
  };

  const html = renderDailySummaryEmail({
    consumed,
    target,
    appUrl: env.APP_URL,
    isCatchUp,
    coversDate,
  });
  const subject = buildSubject(consumed.kcal, target.kcal);

  try {
    await sendMail({ to: user.email, subject, html });
    await db.insert(notificationLogs).values({
      userId: user.id,
      type: "daily_summary",
      coversDate: new Date(coversDate),
      sentAt: new Date(),
      status: "sent",
    });
    return { outcome: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.insert(notificationLogs).values({
      userId: user.id,
      type: "daily_summary",
      coversDate: new Date(coversDate),
      status: "failed",
      error: message,
    });
    return { outcome: "failed", error: message };
  }
}
