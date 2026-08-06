import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";
import { clearSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const { baseUrl } = getAuthConfig();
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(baseUrl).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const response = NextResponse.redirect(`${baseUrl}/login`, 303);
  clearSession(response);
  return response;
}
