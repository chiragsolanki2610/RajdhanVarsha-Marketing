"use client";

import { Bell } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface PickupCenterTopbarProps {
  title: string;
  operatorName: string;
  logoSrc?: string;
}

export default function PickupCenterTopbar({
  title,
  operatorName,
  logoSrc = "/photos/web_logo.jpg",
}: PickupCenterTopbarProps) {
  const initials =
    (operatorName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "P";

  return (
    <>
      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex w-full items-center justify-between bg-white px-4 py-3 shadow-sm md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
            <Image
              src={logoSrc}
              alt="Logo"
              width={36}
              height={36}
              className="h-full w-full object-contain"
            />
          </div>
          <span className="truncate whitespace-nowrap text-[13px] font-bold uppercase leading-tight tracking-widest">
            <span className="text-red-600">RAJ </span>
            <span className="text-blue-600">DHANVARSHA </span>
            <br />
            <span className="text-red-600">MARKETING</span>
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          <button type="button" aria-label="Notifications" className="relative p-1">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <Link
            href="/pickup-center/profile"
            aria-label="Profile"
            className="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-indigo-500 transition-opacity hover:opacity-90"
          >
            <span className="text-xs font-semibold text-white">{initials}</span>
          </Link>
        </div>
      </div>

      {/* Desktop topbar */}
      <div className="sticky top-0 z-40 hidden w-full items-center justify-between border-b border-gray-200 bg-white px-6 py-5 md:flex">
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Welcome back,{" "}
            <span className="font-semibold text-gray-900">{operatorName}</span>
          </span>
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-full p-2 hover:bg-gray-100"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <Link
            href="/pickup-center/profile"
            aria-label="Profile"
            className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-indigo-500 transition-opacity hover:opacity-90"
          >
            <span className="text-xs font-semibold text-white">{initials}</span>
          </Link>
        </div>
      </div>
    </>
  );
}
