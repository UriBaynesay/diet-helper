import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSuggestions } from "@/lib/suggestions/get-suggestions";
import { todayIso } from "@/lib/format-date";
import { strings } from "@/lib/strings";
import { BottomNav } from "@/components/bottom-nav";
import { SuggestionCard } from "@/components/suggestions/suggestion-card";

export default async function SuggestionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { remaining, suggestions } = await getSuggestions(user.userId, todayIso());

  return (
    <>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 p-4 pb-32">
        <h1 className="font-display text-[26px] font-extrabold">{strings.suggestionsScreen.title}</h1>

        {!remaining ? (
          <p className="rounded-2xl p-3 text-sm" style={{ background: "var(--muted)", color: "var(--ink-muted)" }}>
            {strings.suggestionsScreen.noGoal}
          </p>
        ) : (
          <>
            <div className="rounded-[18px] border bg-card p-3.5" style={{ borderColor: "var(--border)" }}>
              <p className="mb-1.5 text-[13px] font-bold" style={{ color: "var(--ink-muted)" }}>
                {strings.suggestionsScreen.remainingTitle}
              </p>
              <p dir="ltr" className="text-sm font-semibold">
                {Math.round(remaining.kcal)} kcal · {Math.round(remaining.proteinG)}P{" "}
                {Math.round(remaining.carbsG)}C {Math.round(remaining.fatG)}F
              </p>
            </div>

            {suggestions.length === 0 ? (
              <p className="py-6 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
                {strings.suggestionsScreen.noSuggestions}
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {suggestions.map((suggestion, i) => (
                  <SuggestionCard key={`${suggestion.mealId}-${i}`} suggestion={suggestion} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}
