import { Badge } from "@/components/ui/badge";
import { strings } from "@/lib/strings";

const STATUS_LABELS: Record<"ready" | "draft" | "rejected", string> = {
  ready: strings.recipes.statusReady,
  draft: strings.recipes.statusDraft,
  rejected: strings.recipes.statusRejected,
};

export function RecipeStatusBadge({ status }: { status: "ready" | "draft" | "rejected" }) {
  return (
    <Badge variant={status === "ready" ? "default" : "secondary"}>{STATUS_LABELS[status]}</Badge>
  );
}
