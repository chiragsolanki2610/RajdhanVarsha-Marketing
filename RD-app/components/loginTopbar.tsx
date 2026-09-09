"use client";

import { Bell } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";

// useLayoutEffect is a no-op (with a console warning) during SSR since there's
// no DOM to lay out. This swaps to a plain useEffect on the server so the
// warning never fires, while still getting the "before paint" timing on the
// client where it actually matters.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function readProfileCache() {
  const keys = ["userProfile", "profile", "user", "userData", "memberProfile"];
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const profile = JSON.parse(raw);
        const name =
          profile.fullName ||
          profile.name ||
          profile.memberName ||
          profile.FullName ||
          profile.Name ||
          "";
        const picture =
          profile.profilePictureUrl || profile.ProfilePictureUrl || null;
        if (name || picture) return { name, picture };
      } catch {
        // ignore malformed cache entry, try next key
      }
    }
  }
  return { name: "", picture: null as string | null };
}

export default function LoginTopbar({
  logoSrc = "/photos/web_logo.jpg",
  pageTitle,
}: {
  logoSrc?: string;
  pageTitle?: string;
}) {
  // IMPORTANT: these must start identical on server and client (blank), or
  // React throws a hydration mismatch the moment localStorage has a cached
  // value the server can't see. Cache is applied after mount instead, below.
  const [userName, setUserName] = useState<string>("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Runs on the client only, synchronously before the browser paints — so the
  // cached name/picture appear on the very first frame the user sees, without
  // ever having disagreed with what the server sent during hydration.
  useIsomorphicLayoutEffect(() => {
    const cached = readProfileCache();
    if (cached.name || cached.picture) {
      setUserName(cached.name);
      setProfilePictureUrl(cached.picture);
      setLoading(!cached.name);
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token =
          localStorage.getItem("authToken") || localStorage.getItem("token");

        if (token) {
          const res = await fetch(
            `${
              process.env.NEXT_PUBLIC_API_URL || "https://rd-api-j7zj.onrender.com"
            }/api/auth/profile`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.ok) {
            const data = await res.json();
            setUserName(
              data.fullName || data.name || data.memberName || "User"
            );
            setProfilePictureUrl(
              data.profilePictureUrl || data.ProfilePictureUrl || null
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
              setProfilePictureUrl(
                profile.profilePictureUrl || profile.ProfilePictureUrl || null
              );
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

    // Keep in sync with Sidebar's picture updates (profile page upload/removal
    // in this tab, and other-tab changes via the storage event)
    window.addEventListener("storage", fetchProfile);
    window.addEventListener("profile-picture-updated", fetchProfile);
    return () => {
      window.removeEventListener("storage", fetchProfile);
      window.removeEventListener("profile-picture-updated", fetchProfile);
    };
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
                src={logoSrc}
                alt="Logo"
                width={36}
                height={36}
                className="object-contain w-full h-full"
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
            className="h-8 w-8 rounded-full bg-indigo-500 overflow-hidden flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
          >
            {profilePictureUrl ? (
              <Image
                src={profilePictureUrl}
                alt={userName || "Profile"}
                width={32}
                height={32}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <span className="text-white font-semibold text-xs">
                {initials}
              </span>
            )}
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