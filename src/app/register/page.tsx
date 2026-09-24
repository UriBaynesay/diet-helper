import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from, error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{strings.auth.registerTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/api/register" method="POST" className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{strings.auth.registerEmailLabel}</Label>
              <Input id="email" name="email" type="email" dir="ltr" required autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{strings.auth.registerPasswordLabel}</Label>
              <Input id="password" name="password" type="password" dir="ltr" required minLength={8} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">{strings.auth.registerConfirmPasswordLabel}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                dir="ltr"
                required
                minLength={8}
              />
            </div>
            {error === "email_taken" && (
              <p className="text-sm text-destructive">{strings.auth.registerErrorEmailTaken}</p>
            )}
            {error === "password_mismatch" && (
              <p className="text-sm text-destructive">{strings.auth.registerErrorPasswordMismatch}</p>
            )}
            {error === "validation_error" && (
              <p className="text-sm text-destructive">{strings.auth.registerErrorWeakPassword}</p>
            )}
            <input type="hidden" name="from" value={from ?? "/"} />
            <Button type="submit" className="w-full">
              {strings.auth.registerSubmit}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {strings.auth.registerHaveAccount}{" "}
              <Link href="/login" className="underline">
                {strings.auth.registerLoginLink}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
