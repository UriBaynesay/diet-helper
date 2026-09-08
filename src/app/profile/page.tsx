import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { users, weightLogs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findActiveGoal } from "@/lib/goals/active-goal";
import { strings } from "@/lib/strings";
import { BottomNav } from "@/components/bottom-nav";
import { ProfileForm } from "@/components/profile/profile-form";
import { GoalPanel } from "@/components/profile/goal-panel";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await db.query.users.findFirst({ where: eq(users.id, user.userId) });
  const latestWeight = await db.query.weightLogs.findFirst({
    where: eq(weightLogs.userId, user.userId),
    orderBy: desc(weightLogs.loggedOn),
  });
  const activeGoal = await findActiveGoal(user.userId, new Date());

  const profileComplete = Boolean(
    profile?.sex && profile.birthDate && profile.heightCm && profile.activityLevel && latestWeight
  );

  return (
    <>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-32">
        <h1 className="text-xl font-semibold">{strings.profile.title}</h1>

        <ProfileForm
          profile={{
            sex: profile?.sex ?? null,
            birthDate: profile?.birthDate ? profile.birthDate.toISOString().slice(0, 10) : null,
            heightCm: profile?.heightCm ?? null,
            activityLevel: profile?.activityLevel ?? null,
            notificationsEnabled: profile?.notificationsEnabled ?? true,
          }}
          latestWeightKg={latestWeight ? Number(latestWeight.weightKg) : null}
        />

        <GoalPanel
          profileComplete={profileComplete}
          currentGoal={
            activeGoal
              ? {
                  targetKcal: activeGoal.targetKcal,
                  targetProteinG: activeGoal.targetProteinG,
                  targetCarbsG: activeGoal.targetCarbsG,
                  targetFatG: activeGoal.targetFatG,
                }
              : null
          }
        />
      </main>
      <BottomNav />
    </>
  );
}
