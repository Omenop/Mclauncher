// app/login/page.tsx
import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  // If ms_auth cookie exists, skip login
  const msAuth = (await cookies()).get("ms_auth")?.value;
  if (msAuth) {
    redirect("/profile");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Log in with Microsoft</h1>
        <a href="/api/auth/microsoft">
          <button className="
            w-full
            px-4 py-2
            bg-blue-600 hover:bg-blue-700
            text-white font-semibold
            rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-400
          ">
            Sign in with Microsoft
          </button>
        </a>
      </div>
    </div>
  );
}
