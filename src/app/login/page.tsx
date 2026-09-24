import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
        </CardHeader>
        <CardContent>
          <form action="/api/login" method="POST" className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{strings.auth.loginEmailLabel}</Label>
              <Input id="email" name="email" type="email" dir="ltr" required autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{strings.auth.loginPasswordLabel}</Label>
              <Input id="password" name="password" type="password" dir="ltr" required />
            </div>
            {error === "invalid_credentials" && (
              <p className="text-sm text-destructive">{strings.auth.loginInvalidCredentials}</p>
            )}
            <input type="hidden" name="from" value={from ?? "/"} />
            <Button type="submit" className="w-full">
              {strings.auth.loginSubmit}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {strings.auth.loginNoAccount}{" "}
              <Link href="/register" className="underline">
                {strings.auth.loginRegisterLink}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
