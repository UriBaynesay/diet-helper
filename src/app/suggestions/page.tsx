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
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-32">
        <h1 className="text-xl font-semibold">{strings.suggestionsScreen.title}</h1>

        {!remaining ? (
          <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
            {strings.suggestionsScreen.noGoal}
          </p>
        ) : (
          <>
            <div className="rounded-lg border p-3">
              <p className="mb-1 text-sm font-medium">{strings.suggestionsScreen.remainingTitle}</p>
              <p dir="ltr" className="text-sm text-muted-foreground">
                {Math.round(remaining.kcal)} kcal · {Math.round(remaining.proteinG)}P{" "}
                {Math.round(remaining.carbsG)}C {Math.round(remaining.fatG)}F
              </p>
            </div>

            {suggestions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {strings.suggestionsScreen.noSuggestions}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {suggestions.map((suggestion, i) => (
                  <SuggestionCard key={`${suggestion.recipeId}-${i}`} suggestion={suggestion} />
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
