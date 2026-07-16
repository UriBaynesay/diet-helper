import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { strings } from "@/lib/strings";

export default function ForbiddenPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{strings.auth.forbidden}</CardTitle>
          <CardDescription>{strings.common.appName}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
