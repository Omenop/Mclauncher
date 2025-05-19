// app/components/LogoutButton.tsx
"use client";

import React from "react";

export default function LogoutButton() {
  return (
    <button
      className="
        mt-4
        px-4 py-2
        bg-red-600 hover:bg-red-700
        text-white font-semibold
        rounded-md
        focus:outline-none focus:ring-2 focus:ring-red-400
      "
      onClick={() => {
        // Clear the HTTP-only cookie and navigate to /login
        document.cookie = "ms_auth=; path=/; max-age=0";
        window.location.href = "/login";
      }}
    >
      Log out
    </button>
  );
}
