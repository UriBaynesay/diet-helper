import { NextResponse } from "next/server";
import { requireUser, UnauthenticatedError } from "@/lib/auth/require-user";

export async function GET(request: Request) {
  try {
    const user = requireUser(request);
    return NextResponse.json({ data: user });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: { code: "unauthenticated" } }, { status: 401 });
    }
    throw error;
  }
}
