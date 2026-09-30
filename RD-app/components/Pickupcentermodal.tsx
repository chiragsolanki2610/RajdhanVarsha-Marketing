"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight, X, Search, MapPin, Store,
  CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface PickupCenterSummary {
  pucId: string;
  centerName: string;
  centerAddress: string;
  city: string;
  state: string;
  pucStatus?: string; // "Open" | "Closed"
  upiId?: string;
  upiQrImageBase64?: string | null;
  accountHolderName?: string;
  bankName?: string;
  accountType?: string;
}

interface Props {
  /** Currently selected center (pre-selects it when the popup re-opens via "Change") */
  initial?: PickupCenterSummary | null;
  /** Called when the user taps "Continue to Shop" */
  onSelect: (center: PickupCenterSummary) => void;
  /** If omitted, the popup cannot be dismissed (user must choose a center) */
  onClose?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://rd-api-j7zj.onrender.com";

function getAuthHeaders(): HeadersInit {
  const token =
    (typeof window !== "undefined" &&
      (localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt"))) ||
    "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PickupCenterModal({ initial = null, onSelect, onClose }: Props) {
  const [mode, setMode] = useState<"search" | "id">("search");

  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [statesLoading, setStatesLoading] = useState(false);
  const [statesError, setStatesError] = useState<string | null>(null);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [centersLoading, setCentersLoading] = useState(false);
  const [centers, setCenters] = useState<PickupCenterSummary[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [idInput, setIdInput] = useState("");
  const [idLoading, setIdLoading] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);

  // Never pre-select a center that is currently closed
  const [selected, setSelected] = useState<PickupCenterSummary | null>(
    initial && initial.pucStatus !== "Closed" ? initial : null
  );
  const [continueError, setContinueError] = useState<string | null>(null);

  // Load states on mount
  useEffect(() => {
    const run = async () => {
      setStatesLoading(true);
      setStatesError(null);
      try {
        const res = await fetch(`${API_URL}/api/PickupCenter/states`, { headers: getAuthHeaders() });
        if (res.status === 401 || res.status === 403) {
          throw new Error("Your session has expired. Please log in again.");
        }
        if (!res.ok) {
          throw new Error(`Could not load states (server returned ${res.status}).`);
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setStates(list);
        if (list.length === 0) {
          setStatesError("No active pickup centers are available yet. Please try again later.");
        }
      } catch (err: any) {
        setStates([]);
        setStatesError(
          err instanceof TypeError
            ? "Cannot reach the server. Please check your connection and try again."
            : err.message ?? "Could not load states."
        );
      } finally {
        setStatesLoading(false);
      }
    };
    run();
  }, []);

  // Load cities when state changes
  useEffect(() => {
    if (!selectedState) {
      setCities([]);
      setSelectedCity("");
      return;
    }
    const run = async () => {
      setCitiesLoading(true);
      setSelectedCity("");
      setCenters([]);
      try {
        const res = await fetch(
          `${API_URL}/api/PickupCenter/cities?state=${encodeURIComponent(selectedState)}`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setCities(Array.isArray(data) ? data : []);
      } catch {
        setCities([]);
      } finally {
        setCitiesLoading(false);
      }
    };
    run();
  }, [selectedState]);

  // Load centers when city changes
  useEffect(() => {
    if (!selectedState || !selectedCity) {
      setCenters([]);
      return;
    }
    const run = async () => {
      setCentersLoading(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `${API_URL}/api/PickupCenter/search?state=${encodeURIComponent(selectedState)}&city=${encodeURIComponent(selectedCity)}`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) throw new Error("Failed to fetch pickup centers.");
        const data = await res.json();
        setCenters(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length === 0) {
          setSearchError("No active pickup centers found in this city.");
        }
      } catch (err: any) {
        setSearchError(err.message ?? "Could not load pickup centers.");
        setCenters([]);
      } finally {
        setCentersLoading(false);
      }
    };
    run();
  }, [selectedState, selectedCity]);

  // Close on Escape (only when dismissible)
  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleIdLookup = async () => {
    setIdError(null);
    const id = idInput.trim();
    if (!id) { setIdError("Please enter a Pickup Center ID."); return; }

    setIdLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/PickupCenter/lookup/${encodeURIComponent(id)}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Pickup Center ID not found.");
      }
      const data = await res.json();
      if (data.pucStatus === "Closed") {
        setSelected(null);
        throw new Error(
          `${data.centerName} (${data.pucId}) is currently offline. Please choose another pickup center.`
        );
      }
      setSelected({
        pucId: data.pucId,
        centerName: data.centerName,
        centerAddress: data.centerAddress,
        city: data.city,
        state: data.state,
        pucStatus: data.pucStatus,
      });
    } catch (err: any) {
      setIdError(err.message ?? "Pickup Center ID not found.");
    } finally {
      setIdLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selected) {
      setContinueError("Please select a pickup center to continue.");
      return;
    }
    if (selected.pucStatus === "Closed") {
      setContinueError("This pickup center is currently offline. Please choose another one.");
      return;
    }
    setContinueError(null);
    onSelect(selected);
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100 max-w-xl w-full my-auto"
        style={{ animation: "pucPopIn .2s ease" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Choose your pickup center"
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        )}

        <div className="w-16 h-16 bg-[#eef1f8] rounded-full flex items-center justify-center mx-auto mb-5">
          <Store size={30} className="text-[#3b5998]" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 text-center">
          Choose Your Pickup Center
        </h2>
        <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">
          Select the pickup center you&apos;ll collect your products from.
        </p>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6 bg-gray-50 rounded-2xl p-1">
          <button
            onClick={() => { setMode("search"); setIdError(null); }}
            className={`flex-1 text-sm font-semibold py-2.5 rounded-xl transition-colors ${
              mode === "search" ? "bg-white shadow-sm text-[#3b5998]" : "text-gray-400"
            }`}
          >
            Search by Location
          </button>
          <button
            onClick={() => { setMode("id"); setSearchError(null); }}
            className={`flex-1 text-sm font-semibold py-2.5 rounded-xl transition-colors ${
              mode === "id" ? "bg-white shadow-sm text-[#3b5998]" : "text-gray-400"
            }`}
          >
            Enter Center ID
          </button>
        </div>

        {mode === "search" ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  State
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  disabled={statesLoading}
                  className="w-full border border-gray-200 rounded-2xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5f76ab] focus:border-transparent transition-all bg-white"
                >
                  <option value="">{statesLoading ? "Loading..." : "Select state"}</option>
                  {states.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  City
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={!selectedState || citiesLoading}
                  className="w-full border border-gray-200 rounded-2xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5f76ab] focus:border-transparent transition-all bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">{citiesLoading ? "Loading..." : "Select city"}</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {!statesLoading && statesError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-2xl px-4 py-3 mb-2 flex items-start gap-2">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {statesError}
              </div>
            )}

            {centersLoading && (
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-6">
                <Loader2 size={16} className="animate-spin" /> Loading pickup centers...
              </div>
            )}

            {!centersLoading && searchError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-2xl px-4 py-3 mb-2 flex items-start gap-2">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {searchError}
              </div>
            )}

            {!centersLoading && centers.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-2 pr-1">
                {centers.map((c) => {
                  const isSelected = selected?.pucId === c.pucId;
                  const isOffline = c.pucStatus === "Closed";
                  return (
                    <button
                      key={c.pucId}
                      disabled={isOffline}
                      onClick={() => { setSelected(c); setContinueError(null); }}
                      className={`w-full text-left rounded-2xl border p-3.5 transition-colors ${
                        isOffline
                          ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-100"
                          : isSelected
                          ? "border-[#3b5998] bg-[#eef1f8]"
                          : "border-gray-100 hover:border-[#b8c3e1] bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <MapPin size={16} className={`flex-shrink-0 mt-0.5 ${isSelected ? "text-[#3b5998]" : "text-gray-300"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">
                            {c.centerName}
                            {isOffline && (
                              <span className="ml-2 align-middle text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                                Currently Offline
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{c.centerAddress}</p>
                          <p className="text-[11px] text-[#46608f] font-medium mt-1">ID: {c.pucId}</p>
                        </div>
                        {isSelected && !isOffline && <CheckCircle2 size={16} className="text-[#3b5998] flex-shrink-0 mt-0.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Pickup Center ID <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleIdLookup(); }}
                placeholder="e.g. PUC0001"
                className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5f76ab] focus:border-transparent transition-all"
              />
              <button
                onClick={handleIdLookup}
                disabled={idLoading}
                className="bg-[#3b5998] hover:bg-[#2f4677] disabled:bg-[#8fa0ce] text-white font-semibold px-5 rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm"
              >
                {idLoading ? <Loader2 size={16} className="animate-spin" /> : <><Search size={15} /> Find</>}
              </button>
            </div>

            {idError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-2 flex items-start gap-2">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {idError}
              </div>
            )}
          </>
        )}

        {/* Selected summary */}
        {selected && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-3 mb-4 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-0.5">
                Selected Pickup Center
              </p>
              <p className="text-sm text-emerald-800 font-medium truncate">
                {selected.centerName} ({selected.pucId})
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">{selected.city}, {selected.state}</p>
            </div>
          </div>
        )}

        {continueError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-4 flex items-start gap-2">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            {continueError}
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={!selected || selected.pucStatus === "Closed"}
          className={`w-full font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm mt-2 ${
            selected && selected.pucStatus !== "Closed"
              ? "bg-[#3b5998] hover:bg-[#2f4677] text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          <ArrowRight size={16} /> Continue to Shop
        </button>
      </div>
      <style>{`@keyframes pucPopIn { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}