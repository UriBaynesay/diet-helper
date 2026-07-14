import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ data: { status: "ok" } });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "db_unreachable", message: String(error) } },
      { status: 503 }
    );
  }
}
