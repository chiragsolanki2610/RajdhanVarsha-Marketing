"use client";

import { Bell } from "lucide-react";
import Image from "next/image";
import Link from "next/link"; // 1. Import Next.js Link component

interface LoginTopbarProps {
  userName?: string;
  logoSrc?: string;
}

export default function LoginTopbar({
  userName = "Dharamveer",
  logoSrc,
}: LoginTopbarProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* ── Mobile topbar (hidden on md+) ── */}
      <div className="flex md:hidden w-full items-center justify-between bg-white px-4 py-3 shadow-sm">

        {/* Left: Logo circle + Title */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Logo circle */}
          <div className="h-9 w-9 rounded-full overflow-hidden bg-red-500 flex items-center justify-center flex-shrink-0">
            {logoSrc ? (
              <Image
                src="/photos/web_logo.jpg"
                alt="Logo"
                width={36}
                height={36}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-white font-bold text-base">R</span>
            )}
          </div>

          {/* Title — RAJ (red) DHANVARSHA (blue) MARKETING (red) */}
          <span className="font-bold text-[13px] tracking-widest uppercase whitespace-nowrap truncate">
            <span className="text-red-600">RAJ </span>
            <span className="text-blue-600">DHANVARSHA </span>
            <br></br>
            <span className="text-red-600">MARKETING</span>
          </span>
        </div>

        {/* Right: Bell + Avatar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button className="relative p-1">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
          </button>

          {/* 2. Wrapped the avatar element inside Link */}
          <Link 
            href="/profile" 
            className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
          >
            <span className="text-white font-semibold text-xs">{initials}</span>
          </Link>
        </div>
      </div>

      {/* ── Desktop/Tablet topbar — no logo, no name, just bell ── */}
      <div className="hidden md:flex w-full bg-white border-b border-gray-200 px-6 py-4 items-center justify-end">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Welcome back,{" "}
            <span className="font-semibold text-gray-900">{userName}</span>
          </span>

          <button className="relative p-2 rounded-full hover:bg-gray-100">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </>
  );
}