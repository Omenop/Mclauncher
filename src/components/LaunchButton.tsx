"use client";

import React from "react";

export default function LaunchButton() {
  return (
    <button
      className="
        mt-4
        w-full
        px-4 py-2
        bg-green-600 hover:bg-green-700
        text-white font-semibold
        rounded-md
        focus:outline-none focus:ring-2 focus:ring-green-400
      "
      onClick={() => {
        alert("Launching Minecraft... (hook this up to your Electron main process later)");
      }}
    >
      Launch Minecraft
    </button>
  );
}
