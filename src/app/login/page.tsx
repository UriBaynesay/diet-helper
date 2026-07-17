import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from, error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{strings.auth.loginTitle}</CardTitle>
          <CardDescription>{strings.auth.loginPrompt}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/login" method="POST" className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{strings.auth.loginPasswordLabel}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                dir="ltr"
                required
                autoFocus
              />
            </div>
            {error === "invalid_password" && (
              <p className="text-sm text-destructive">{strings.auth.loginInvalidPassword}</p>
            )}
            <input type="hidden" name="from" value={from ?? "/"} />
            <Button type="submit" className="w-full">
              {strings.auth.loginSubmit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
