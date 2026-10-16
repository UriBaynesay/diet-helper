import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { getRequestOrigin } from "@/lib/auth/origin";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", getRequestOrigin(request)), { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
