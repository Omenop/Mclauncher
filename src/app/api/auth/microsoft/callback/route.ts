import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma"; // Your Prisma client import

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return new NextResponse("No authorization code provided", { status: 400 });
  }

  const {
    MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET,
    MICROSOFT_TENANT_ID,
    NEXTAUTH_URL,
  } = process.env;

  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET || !MICROSOFT_TENANT_ID || !NEXTAUTH_URL) {
    return new NextResponse("Missing environment variables", { status: 500 });
  }

  const redirectUri = `${NEXTAUTH_URL}/api/auth/microsoft/callback`;

  // Step 1: Exchange code for Microsoft tokens
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        scope: "openid profile email offline_access",
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        client_secret: MICROSOFT_CLIENT_SECRET,
      }),
    }
  );

  const tokenJson = await tokenRes.json();
  if (tokenJson.error) {
    return new NextResponse(`OAuth Error: ${JSON.stringify(tokenJson)}`, { status: 500 });
  }

  const { id_token, access_token, refresh_token, expires_in } = tokenJson;

  // Decode id_token for user info
  let decoded: any;
  try {
    decoded = jwt.decode(id_token);
  } catch {
    return new NextResponse("Failed to decode ID token", { status: 500 });
  }

  const userEmail = decoded.email ?? decoded.preferred_username ?? "";
  const userName = decoded.name ?? "";

  // Step 2: Xbox Live Authentication
  const xboxAuthRes = await fetch("https://user.auth.xboxlive.com/user/authenticate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Properties: {
        AuthMethod: "RPS",
        SiteName: "user.auth.xboxlive.com",
        RpsTicket: `d=${access_token}`, // use Microsoft OAuth access token here
      },
      RelyingParty: "http://auth.xboxlive.com",
      TokenType: "JWT",
    }),
  });

  const xboxAuthData = await xboxAuthRes.json();

  if (!xboxAuthData.Token || !xboxAuthData.DisplayClaims?.xui?.[0]?.uhs) {
    return new NextResponse("Xbox Live Authentication failed", { status: 500 });
  }
  const xboxToken = xboxAuthData.Token;
  const userHash = xboxAuthData.DisplayClaims.xui[0].uhs;

  // Step 3: XSTS Authentication
  const xstsRes = await fetch("https://xsts.auth.xboxlive.com/xsts/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Properties: {
        SandboxId: "RETAIL",
        UserTokens: [xboxToken],
      },
      RelyingParty: "rp://api.minecraftservices.com/",
      TokenType: "JWT",
    }),
  });

  const xstsData = await xstsRes.json();

  if (!xstsData.Token) {
    return new NextResponse(`XSTS Authentication failed: ${JSON.stringify(xstsData)}`, { status: 500 });
  }
  const xstsToken = xstsData.Token;

  // Step 4: Minecraft Login with Xbox
  const mcAuthRes = await fetch("https://api.minecraftservices.com/authentication/login_with_xbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
    }),
  });

  const mcAuthData = await mcAuthRes.json();

  if (!mcAuthData.access_token) {
    return new NextResponse(`Minecraft Authentication failed: ${JSON.stringify(mcAuthData)}`, { status: 500 });
  }

  const mcAccessToken = mcAuthData.access_token;

  // Step 5: Get Minecraft Profile
  const profileRes = await fetch("https://api.minecraftservices.com/minecraft/profile", {
    headers: { Authorization: `Bearer ${mcAccessToken}` },
  });

  const profileData = await profileRes.json();

  if (!profileData.id || !profileData.name) {
    return new NextResponse(`Failed to get Minecraft profile: ${JSON.stringify(profileData)}`, { status: 500 });
  }

  const uuid = profileData.id;
  const username = profileData.name;

  // Step 6: Save or update user in DB (using Prisma)
  await prisma.user.upsert({
    where: { id: uuid },
    update: {
      refreshToken: refresh_token,
      email: userEmail,
    },
    create: {
      id: uuid,
      refreshToken: refresh_token,
      email: userEmail,
    },
  });

  // Step 7: Create session cookie or token
  const payload = {
    email: userEmail,
    name: userName,
    uuid,
    username,
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: Date.now() + expires_in * 1000,
  };

  const cookieValue = Buffer.from(JSON.stringify(payload)).toString("base64");

  const response = NextResponse.redirect(`${NEXTAUTH_URL}/profile`);
  response.headers.set(
    "Set-Cookie",
    [
      `ms_auth=${cookieValue}`,
      `Path=/`,
      `HttpOnly`,
      `Max-Age=${expires_in}`,
      `SameSite=Lax`,
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ")
  );

  return response;
}
