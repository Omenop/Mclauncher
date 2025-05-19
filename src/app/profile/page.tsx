// app/profile/page.tsx
import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "../../components/Logout";
import LaunchButton from "../../components/LaunchButton";

type CookiePayload = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  email: string;
  name: string;
};

async function refreshAccessTokenIfNeeded(payload: CookiePayload) {
  // If token is valid for >5min, no refresh needed
  if (payload.accessExpiresAt - Date.now() > 5 * 60 * 1000) {
    return payload;
  }

  // Otherwise, refresh
  const {
    MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET,
    MICROSOFT_TENANT_ID,
  } = process.env;
  if (
    !MICROSOFT_CLIENT_ID ||
    !MICROSOFT_CLIENT_SECRET ||
    !MICROSOFT_TENANT_ID
  ) {
    throw new Error("Missing OAuth environment variables");
  }

  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: payload.refreshToken,
    scope: ["openid", "email", "offline_access", "XboxLive.signin"].join(" "),
  });

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );
  const data = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    error?: string;
    error_description?: string;
  };
  if (data.error) {
    console.error("Error refreshing token:", data);
    throw new Error("Failed to refresh access token");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessExpiresAt: Date.now() + data.expires_in * 1000,
    email: payload.email,
    name: payload.name,
  };
}

export default async function ProfilePage() {
  const cookieStore = cookies();
  const raw = (await cookieStore).get("ms_auth")?.value;

  if (!raw) {
    redirect("/login");
  }

  // Decode cookie
  let payload: CookiePayload;
  try {
    const json = Buffer.from(raw, "base64").toString("utf-8");
    payload = JSON.parse(json) as CookiePayload;
  } catch {
    redirect("/login");
  }

  // Possibly refresh access token
  let updatedPayload: CookiePayload;
  try {
    updatedPayload = await refreshAccessTokenIfNeeded(payload);
  } catch {
    redirect("/login");
  }

  // If refreshed, overwrite cookie
  if (updatedPayload.accessToken !== payload.accessToken) {
    const newCookieValue = Buffer.from(JSON.stringify(updatedPayload)).toString(
      "base64"
    );
    const THIRTY_DAYS = 60 * 60 * 24 * 30;
    (await cookies()).set({
      name: "ms_auth",
      value: newCookieValue,
      httpOnly: true,
      path: "/",
      maxAge: THIRTY_DAYS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Render profile + launch button
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Welcome, {updatedPayload.name}!
        </h1>
        <p className="text-gray-600 mb-2">
          Email:
          <span className="font-medium text-gray-800">
            {" "}
            {updatedPayload.email}
          </span>
        </p>

        <div className="mt-6">
          <p className="font-semibold text-gray-700 mb-1">
            Access Token (expires soon):
          </p>
          <div className="bg-gray-100 rounded-md p-4 overflow-x-auto">
            <code className="text-sm text-gray-700 break-all">
              {updatedPayload.accessToken}
            </code>
          </div>
        </div>

        {/* Launch Minecraft button */}
        <LaunchButton />

        {/* Logout button */}
        <LogoutButton />
      </div>
    </div>
  );
}
