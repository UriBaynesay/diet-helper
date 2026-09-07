import { cookies } from "next/headers";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { verifyPasswordVerifiedToken } from "@/lib/auth/session";
import { PASSWORD_VERIFIED_COOKIE } from "@/lib/auth/constants";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from, error } = await searchParams;

  const cookieStore = await cookies();
  const pwVerifiedToken = cookieStore.get(PASSWORD_VERIFIED_COOKIE)?.value;
  const passwordVerified = pwVerifiedToken
    ? await verifyPasswordVerifiedToken(pwVerifiedToken)
    : false;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{strings.auth.loginTitle}</CardTitle>
          <CardDescription>
            {passwordVerified ? strings.auth.loginEmailPrompt : strings.auth.loginPrompt}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/login" method="POST" className="flex flex-col gap-4">
            {passwordVerified ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">{strings.auth.loginEmailLabel}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  dir="ltr"
                  required
                  autoFocus
                />
              </div>
            ) : (
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
            )}
            {error === "invalid_password" && (
              <p className="text-sm text-destructive">{strings.auth.loginInvalidPassword}</p>
            )}
            {error === "invalid_email" && (
              <p className="text-sm text-destructive">{strings.auth.loginInvalidEmail}</p>
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
