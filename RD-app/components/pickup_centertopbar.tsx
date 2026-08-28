"use client";

import { Bell } from "lucide-react";

interface PickupCenterTopbarProps {
  title: string;
  operatorName: string;
}

export default function PickupCenterTopbar({
  title,
  operatorName,
}: PickupCenterTopbarProps) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-5">
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-600">
          Welcome back, <span className="font-semibold text-gray-900">{operatorName}</span>
        </p>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100">
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
      </div>
    </header>
  );
}