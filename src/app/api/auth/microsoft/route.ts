// app/api/auth/microsoft/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  const {
    MICROSOFT_CLIENT_ID,
    MICROSOFT_TENANT_ID,
    NEXTAUTH_URL,
  } = process.env;

  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_TENANT_ID || !NEXTAUTH_URL) {
    return new NextResponse("Missing OAuth environment variables", {
      status: 500,
    });
  }

  const redirectUri = `${NEXTAUTH_URL}/api/auth/microsoft/callback`;
  const scope = [
    "openid",
    "email",
    "offline_access",
    "XboxLive.signin",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope,
    prompt: "select_account",
  });

  const authorizationUrl = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
  return NextResponse.redirect(authorizationUrl, 302);

}
