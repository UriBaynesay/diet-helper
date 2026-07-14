import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/cron/guard";

export async function POST(request: Request) {
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  return NextResponse.json({ data: { pong: true } });
}
