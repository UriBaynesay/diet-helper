import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{strings.auth.loginTitle}</CardTitle>
          <CardDescription>
            {isDev ? strings.auth.loginDevOnly : strings.auth.unauthorized}
          </CardDescription>
        </CardHeader>
        {isDev && (
          <CardContent>
            <form action="/api/dev-login" method="POST" className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">{strings.auth.loginEmailLabel}</Label>
                <Input id="email" name="email" type="email" dir="ltr" required autoFocus />
              </div>
              <input type="hidden" name="from" value={from ?? "/"} />
              <Button type="submit" className="w-full">
                {strings.auth.loginSubmit}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
