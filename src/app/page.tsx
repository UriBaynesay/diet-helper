import { strings } from "@/lib/strings";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">{strings.common.appName}</h1>
    </main>
  );
}
