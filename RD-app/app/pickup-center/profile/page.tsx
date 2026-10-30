"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    BadgeCheck,
    Building2,
    CheckCircle2,
    Edit3,
    FileCheck2,
    Landmark,
    Loader2,
    LockKeyhole,
    LogOut,
    MapPin,
    Phone,
    QrCode,
    Save,
    ShieldCheck,
    UserRound,
    X,
} from "lucide-react";
import PickupCenterSidebar from "@/components/pickup_centersidebar";
import PickupCenterTopbar from "@/components/pickup_centertopbar";

const API_BASE = "https://rd-api-j7zj.onrender.com";

interface Profile {
    pucId: string;
    username: string;
    fullName: string;
    phone: string;
    sponsorId?: string | null;
    sponsorName?: string | null;
    aadharNumber: string;
    panNumber: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
    accountType: string;
    upiId: string;
    upiQrImageBase64?: string | null;
    centerName: string;
    centerAddress: string;
    state: string;
    city: string;
    status: string;
    createdAt: string;
}

type EditableProfile = Pick<Profile, "fullName" | "phone" | "centerName" | "centerAddress" | "state" | "city" | "accountNumber" | "ifscCode" | "accountHolderName" | "bankName" | "accountType" | "upiId" | "upiQrImageBase64">;

const emptyEditable: EditableProfile = {
    fullName: "",
    phone: "",
    centerName: "",
    centerAddress: "",
    state: "",
    city: "",
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    bankName: "",
    accountType: "Savings",
    upiId: "",
    upiQrImageBase64: null,
};

function fileToDataUri(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the QR image."));
        reader.readAsDataURL(file);
    });
}

function mask(value: string) {
    if (!value) return "Not provided";
    return value.length > 4 ? `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}` : value;
}

/* ---------- Small UI building blocks ---------- */

function Section({ icon: Icon, title, subtitle, children }: { icon: typeof UserRound; title: string; subtitle?: string; children: ReactNode }) {
    return (
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5 sm:px-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#3B5998]">
                    <Icon size={18} />
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                    {subtitle && <p className="truncate text-xs text-gray-500">{subtitle}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

// A single "label ... value" row, like a settings list
function Row({ label, value, icon: Icon, href, mono }: { label: string; value: string; icon: typeof UserRound; href?: string; mono?: boolean }) {
    const content = value || "Not provided";
    const muted = !value || value === "Not provided";
    return (
        <div className="flex items-start gap-3 px-4 py-3 sm:px-6">
            <Icon size={16} className="mt-0.5 shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                {href && value ? (
                    <a href={href} className="mt-0.5 block break-words text-sm font-semibold text-[#3B5998]">{content}</a>
                ) : (
                    <p className={`mt-0.5 break-words text-sm font-semibold ${muted ? "text-gray-400" : "text-gray-900"} ${mono ? "font-mono" : ""}`}>{content}</p>
                )}
            </div>
        </div>
    );
}

function RowGroup({ children, cols = 1 }: { children: ReactNode; cols?: 1 | 2 }) {
    return (
        <div className={`divide-y divide-gray-100 ${cols === 2 ? "lg:grid lg:grid-cols-2 lg:divide-y-0" : ""}`}>
            {children}
        </div>
    );
}

const inputCls =
    "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-[#3B5998] focus:bg-white focus:ring-2 focus:ring-blue-100 sm:text-sm";

function Input({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
    return (
        <label className={className}>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
            {children}
        </label>
    );
}

export default function PickupCenterProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [form, setForm] = useState<EditableProfile>(emptyEditable);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [confirmLogout, setConfirmLogout] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            const token = localStorage.getItem("pucToken");
            if (!token) {
                router.replace("/pickup-center");
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/PickupCenter/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                });
                if (response.status === 401) {
                    localStorage.removeItem("pucToken");
                    localStorage.removeItem("pucInfo");
                    router.replace("/pickup-center");
                    return;
                }
                if (!response.ok) throw new Error(`Profile service unavailable (${response.status}).`);
                applyLoadedProfile(await response.json());
            } catch (profileError) {
                try {
                    const cached = JSON.parse(localStorage.getItem("pucInfo") || "{}");
                    if (!cached.pucId) throw profileError;
                    const lookupResponse = await fetch(`${API_BASE}/api/PickupCenter/lookup/${encodeURIComponent(cached.pucId)}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!lookupResponse.ok) throw profileError;
                    const center = await lookupResponse.json();
                    applyLoadedProfile({
                        ...center,
                        pucId: cached.pucId,
                        username: cached.username || "",
                        fullName: cached.fullName || "",
                        phone: center.phone || "",
                        aadharNumber: "",
                        panNumber: "",
                        accountNumber: "",
                        ifscCode: "",
                        accountHolderName: "",
                        bankName: "",
                        accountType: "Savings",
                        upiId: "",
                        upiQrImageBase64: null,
                        status: "Active",
                        createdAt: "",
                    });
                    setNotice("Some private details are unavailable until the API is restarted.");
                } catch {
                    setError(profileError instanceof Error ? profileError.message : "Could not load your profile.");
                }
            } finally {
                setLoading(false);
            }
        };

        const applyLoadedProfile = (data: Profile) => {
            setProfile(data);
            setForm({
                fullName: data.fullName || "",
                phone: data.phone || "",
                centerName: data.centerName || "",
                centerAddress: data.centerAddress || "",
                state: data.state || "",
                city: data.city || "",
                accountNumber: data.accountNumber || "",
                ifscCode: data.ifscCode || "",
                accountHolderName: data.accountHolderName || "",
                bankName: data.bankName || "",
                accountType: data.accountType || "Savings",
                upiId: data.upiId || "",
                upiQrImageBase64: data.upiQrImageBase64 || null,
            });
        };

        loadProfile();
    }, [router]);

    // Auto-dismiss success notice
    useEffect(() => {
        if (!notice || notice.startsWith("Some private")) return;
        const t = setTimeout(() => setNotice(null), 5000);
        return () => clearTimeout(t);
    }, [notice]);

    const updateField = <Field extends keyof EditableProfile>(field: Field, value: EditableProfile[Field]) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const cancelEdit = () => {
        if (!profile) return;
        setForm({
            fullName: profile.fullName,
            phone: profile.phone,
            centerName: profile.centerName,
            centerAddress: profile.centerAddress,
            state: profile.state,
            city: profile.city,
            accountNumber: profile.accountNumber,
            ifscCode: profile.ifscCode,
            accountHolderName: profile.accountHolderName,
            bankName: profile.bankName,
            accountType: profile.accountType,
            upiId: profile.upiId,
            upiQrImageBase64: profile.upiQrImageBase64 || null,
        });
        setEditing(false);
        setError(null);
    };

    const handleQrImage = async (file: File | undefined) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Please choose a valid QR image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError("QR image must be smaller than 5MB.");
            return;
        }
        try {
            updateField("upiQrImageBase64", await fileToDataUri(file));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not read the QR image.");
        }
    };

    const saveProfile = async (event: FormEvent) => {
        event.preventDefault();
        const token = localStorage.getItem("pucToken");
        if (!token) return router.replace("/pickup-center");

        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            const response = await fetch(`${API_BASE}/api/PickupCenter/profile`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            const data = await response.json();
            if (response.status === 401) return router.replace("/pickup-center");
            if (!response.ok) throw new Error(data?.message || "Could not save your changes.");
            setProfile(data);
            setEditing(false);
            setNotice("Profile updated successfully.");
            window.scrollTo({ top: 0, behavior: "smooth" });
            const cached = localStorage.getItem("pucInfo");
            if (cached) localStorage.setItem("pucInfo", JSON.stringify({ ...JSON.parse(cached), fullName: data.fullName, centerName: data.centerName }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save your changes.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("pucToken");
        localStorage.removeItem("pucInfo");
        router.replace("/pickup-center");
    };

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500"><Loader2 className="mr-2 animate-spin" size={18} /> Loading profile...</div>;

    const memberSince = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "—";
    const initials = (profile?.fullName || "?").trim().slice(0, 2).toUpperCase();
    const isActive = (profile?.status || "").toLowerCase() === "active";

    return (
        <div className="flex min-h-screen bg-[#f4f6fa]">
            <PickupCenterSidebar />
            <div className="min-w-0 flex-1">
                <PickupCenterTopbar title="Pickup Center Profile" operatorName={profile?.fullName || "Operator"} />

                {/* big bottom padding on mobile: clears save bar + bottom nav */}
                <main className="mx-auto max-w-5xl space-y-4 px-4 pb-40 pt-4 sm:px-6 lg:space-y-6 lg:p-8 lg:pb-12">
                    {error && (
                        <div className="flex items-start justify-between gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <span>{error}</span>
                            <button aria-label="Dismiss error" onClick={() => setError(null)}><X size={16} /></button>
                        </div>
                    )}
                    {notice && (
                        <div className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> {notice}
                        </div>
                    )}

                    {profile && (
                        <>
                            {/* ---------- Hero card ---------- */}
                            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#3B5998] to-[#2d4373] text-white shadow-md">
                                <div className="px-5 pb-5 pt-6 sm:px-8">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-black ring-2 ring-white/30">
                                            {initials}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Pickup center owner</p>
                                            <h2 className="mt-0.5 truncate text-xl font-bold leading-tight">{profile.centerName}</h2>
                                            <p className="truncate text-sm text-blue-100">{profile.fullName}</p>
                                        </div>

                                        {/* Desktop actions */}
                                        <div className="hidden lg:block">
                                            {!editing ? (
                                                <button onClick={() => { setNotice(null); setEditing(true); }} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#3B5998] shadow-sm hover:bg-blue-50"><Edit3 size={16} /> Edit details</button>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"><X size={16} /> Cancel</button>
                                                    <button form="profile-form" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#3B5998] disabled:opacity-60"><Save size={16} /> {saving ? "Saving..." : "Save changes"}</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats strip */}
                                    <div className="mt-5 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 py-3 text-center">
                                        <div className="px-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-200">Center ID</p>
                                            <p className="mt-1 truncate font-mono text-xs font-bold sm:text-sm">{profile.pucId}</p>
                                        </div>
                                        <div className="px-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-200">Status</p>
                                            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold sm:text-sm">
                                                <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-amber-400"}`} />
                                                {profile.status}
                                            </p>
                                        </div>
                                        <div className="px-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-200">Member since</p>
                                            <p className="mt-1 truncate text-xs font-bold sm:text-sm">{memberSince}</p>
                                        </div>
                                    </div>

                                    {/* Mobile edit button */}
                                    {!editing && (
                                        <button onClick={() => { setNotice(null); setEditing(true); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold text-[#3B5998] shadow-sm active:bg-blue-50 lg:hidden">
                                            <Edit3 size={16} /> Edit details
                                        </button>
                                    )}
                                </div>
                            </section>

                            {editing ? (
                                /* ---------- Edit form ---------- */
                                <form id="profile-form" onSubmit={saveProfile} className="space-y-4 lg:space-y-6">
                                    <Section icon={Building2} title="Contact & center" subtitle="Shown to customers who visit you">
                                        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
                                            {([["fullName", "Owner full name"], ["phone", "Phone number"], ["centerName", "Center name"], ["state", "State"], ["city", "City"], ["centerAddress", "Full center address"]] as [keyof EditableProfile, string][]).map(([field, label]) => (
                                                <Input key={field} label={label} className={field === "centerAddress" ? "sm:col-span-2" : ""}>
                                                    <input
                                                        required
                                                        type={field === "phone" ? "tel" : "text"}
                                                        inputMode={field === "phone" ? "tel" : undefined}
                                                        value={form[field] || ""}
                                                        onChange={(event) => updateField(field, event.target.value)}
                                                        className={inputCls}
                                                    />
                                                </Input>
                                            ))}
                                        </div>
                                    </Section>

                                    <Section icon={Landmark} title="Bank & UPI" subtitle="Payment details for your center">
                                        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
                                            <Input label="Account holder name"><input value={form.accountHolderName} onChange={(e) => updateField("accountHolderName", e.target.value)} className={inputCls} /></Input>
                                            <Input label="Bank name"><input value={form.bankName} onChange={(e) => updateField("bankName", e.target.value)} className={inputCls} /></Input>
                                            <Input label="Account number"><input required inputMode="numeric" value={form.accountNumber} onChange={(e) => updateField("accountNumber", e.target.value)} className={inputCls} /></Input>
                                            <Input label="IFSC code"><input required value={form.ifscCode} onChange={(e) => updateField("ifscCode", e.target.value.toUpperCase())} className={`${inputCls} uppercase`} /></Input>
                                            <Input label="Account type">
                                                <select value={form.accountType} onChange={(e) => updateField("accountType", e.target.value)} className={inputCls}>
                                                    <option>Savings</option>
                                                    <option>Current</option>
                                                    <option>Other</option>
                                                </select>
                                            </Input>
                                            <Input label="UPI ID"><input value={form.upiId} onChange={(e) => updateField("upiId", e.target.value.trim())} placeholder="yourname@upi" className={inputCls} /></Input>

                                            <div className="sm:col-span-2">
                                                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">UPI QR / scanner image</span>
                                                <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4">
                                                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-gray-200">
                                                        {form.upiQrImageBase64 ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={form.upiQrImageBase64} alt="UPI QR code preview" className="h-full w-full object-contain" />
                                                        ) : (
                                                            <QrCode className="text-gray-300" size={40} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 space-y-2">
                                                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#3B5998] px-4 py-2.5 text-sm font-bold text-white active:bg-[#2d4373]">
                                                            <QrCode size={16} /> {form.upiQrImageBase64 ? "Change" : "Choose"} image
                                                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleQrImage(e.target.files?.[0])} />
                                                        </label>
                                                        {form.upiQrImageBase64 && (
                                                            <button type="button" onClick={() => updateField("upiQrImageBase64", null)} className="block text-sm font-semibold text-red-600">Remove image</button>
                                                        )}
                                                        <p className="text-xs text-gray-500">JPG, PNG or WEBP, up to 5MB</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Section>
                                </form>
                            ) : (
                                /* ---------- Read-only view ---------- */
                                <>
                                    <Section icon={UserRound} title="Owner details" subtitle="Your registered contact information">
                                        <RowGroup cols={2}>
                                            <Row label="Full name" value={profile.fullName} icon={UserRound} />
                                            <Row label="Phone number" value={profile.phone} icon={Phone} href={profile.phone ? `tel:${profile.phone}` : undefined} />
                                            <Row label="Username" value={profile.username} icon={LockKeyhole} />
                                            <Row label="Sponsor" value={[profile.sponsorName, profile.sponsorId].filter(Boolean).join(" · ")} icon={BadgeCheck} />
                                        </RowGroup>
                                    </Section>

                                    <Section icon={Building2} title="Center details" subtitle="The location customers will see">
                                        <RowGroup cols={2}>
                                            <Row label="Center name" value={profile.centerName} icon={Building2} />
                                            <Row label="Location" value={[profile.city, profile.state].filter(Boolean).join(", ")} icon={MapPin} />
                                            <Row label="Address" value={profile.centerAddress} icon={MapPin} />
                                        </RowGroup>
                                    </Section>

                                    <Section icon={ShieldCheck} title="Verification" subtitle="Protected identity documents">
                                        <RowGroup cols={2}>
                                            <Row label="Aadhaar" value={mask(profile.aadharNumber)} icon={FileCheck2} mono />
                                            <Row label="PAN" value={mask(profile.panNumber)} icon={FileCheck2} mono />
                                        </RowGroup>
                                        <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500 sm:px-6">
                                            <LockKeyhole size={13} /> Identity documents are read-only for your security.
                                        </div>
                                    </Section>

                                    <Section icon={Landmark} title="Bank & UPI" subtitle="Where customers can pay you">
                                        <RowGroup cols={2}>
                                            <Row label="Bank" value={profile.bankName} icon={Landmark} />
                                            <Row label="Account holder" value={profile.accountHolderName} icon={UserRound} />
                                            <Row label="Account number" value={mask(profile.accountNumber)} icon={Landmark} mono />
                                            <Row label="IFSC code" value={profile.ifscCode} icon={Landmark} mono />
                                            <Row label="Account type" value={profile.accountType} icon={Landmark} />
                                            <Row label="UPI ID" value={profile.upiId} icon={QrCode} />
                                        </RowGroup>
                                        {profile.upiQrImageBase64 && (
                                            <div className="flex items-center gap-4 border-t border-gray-100 bg-blue-50/40 p-4 sm:px-6">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={profile.upiQrImageBase64} alt="UPI QR code" className="h-28 w-28 shrink-0 rounded-xl bg-white object-contain p-2 ring-1 ring-blue-100" />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">UPI scanner</p>
                                                    <p className="mt-1 text-xs text-gray-500">Customers can scan this code to pay your center.</p>
                                                </div>
                                            </div>
                                        )}
                                    </Section>

                                    {/* Mobile-only logout */}
                                    <button
                                        onClick={() => setConfirmLogout(true)}
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3.5 text-sm font-bold text-red-600 shadow-sm active:bg-red-50 lg:hidden"
                                    >
                                        <LogOut size={17} /> Log out
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </main>
            </div>

            {/* Mobile sticky save bar (sits above bottom nav) */}
            {editing && (
                <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
                    <div className="flex gap-3">
                        <button type="button" onClick={cancelEdit} className="flex-1 rounded-2xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50">Cancel</button>
                        <button form="profile-form" disabled={saving} className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-[#3B5998] py-3 text-sm font-bold text-white active:bg-[#2d4373] disabled:opacity-60">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? "Saving..." : "Save changes"}
                        </button>
                    </div>
                </div>
            )}

            {/* Logout confirmation (mobile only) */}
            {confirmLogout && (
                <div className="fixed inset-0 z-[60] flex items-end bg-black/50 lg:hidden">
                    <div className="w-full rounded-t-3xl bg-white p-6 shadow-2xl">
                        <div className="mb-3 flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600"><LogOut size={20} /></span>
                            <h3 className="text-base font-bold text-gray-900">Log out?</h3>
                        </div>
                        <p className="mb-6 text-sm text-gray-600">You will need to sign in again to manage your pickup center.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmLogout(false)} className="flex-1 rounded-2xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50">Cancel</button>
                            <button onClick={handleLogout} className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white active:bg-red-700">Log out</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
