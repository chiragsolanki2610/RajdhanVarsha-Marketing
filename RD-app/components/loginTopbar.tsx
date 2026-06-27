"use client";

import { Bell } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function LoginTopbar({
  logoSrc,
  pageTitle,
}: {
  logoSrc?: string;
  pageTitle?: string;
}) {
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token =
          localStorage.getItem("authToken") || localStorage.getItem("token");

        if (token) {
          const res = await fetch(
            `${
              process.env.NEXT_PUBLIC_API_URL || "https://localhost:56187"
            }/api/auth/profile`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.ok) {
            const data = await res.json();
            setUserName(
              data.fullName || data.name || data.memberName || "User"
            );
            return;
          }
        }

        const keys = ["userProfile", "profile", "user", "userData", "memberProfile"];
        for (const key of keys) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const profile = JSON.parse(raw);
            const name =
              profile.fullName ||
              profile.name ||
              profile.memberName ||
              profile.FullName ||
              profile.Name;
            if (name) {
              setUserName(name);
              return;
            }
          }
        }

        setUserName("User");
      } catch {
        setUserName("User");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile topbar */}
      <div className="flex md:hidden sticky top-0 z-40 w-full items-center justify-between bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
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
          <span className="font-bold text-[13px] tracking-widest uppercase whitespace-nowrap truncate">
            <span className="text-red-600">RAJ </span>
            <span className="text-blue-600">DHANVARSHA </span>
            <br />
            <span className="text-red-600">MARKETING</span>
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button className="relative p-1">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
          </button>
          <Link
            href="/profile"
            className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
          >
            <span className="text-white font-semibold text-xs">{initials}</span>
          </Link>
        </div>
      </div>

      {/* Desktop topbar */}
      <div className="hidden md:flex sticky top-0 z-40 w-full bg-white border-b border-gray-200 px-6 py-6 items-center justify-between">
        {/* LEFT: Page title */}
        <div>
          {pageTitle && (
            <h1 className="text-xl font-bold text-gray-800">{pageTitle}</h1>
          )}
        </div>

        {/* RIGHT: Welcome + Bell */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Welcome back,{" "}
            <span className="font-semibold text-gray-900">
              {loading ? "..." : userName}
            </span>
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