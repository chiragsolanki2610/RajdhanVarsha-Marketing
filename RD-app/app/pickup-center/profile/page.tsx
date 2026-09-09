"use client";

import { FormEvent, useEffect, useState } from "react";
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

const API_BASE = "https://localhost:56187";

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

function Field({ label, value, icon: Icon }: { label: string; value: string; icon: typeof UserRound }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <Icon size={14} /> {label}
            </div>
            <p className="mt-2 break-words text-sm font-semibold text-gray-800">{value || "Not provided"}</p>
        </div>
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
            const cached = localStorage.getItem("pucInfo");
            if (cached) localStorage.setItem("pucInfo", JSON.stringify({ ...JSON.parse(cached), fullName: data.fullName, centerName: data.centerName }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save your changes.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500"><Loader2 className="mr-2 animate-spin" size={18} /> Loading profile...</div>;

    return (
        <div className="flex min-h-screen bg-[#f7f8fb]">
            <PickupCenterSidebar />
            <div className="min-w-0 flex-1">
                <PickupCenterTopbar title="Pickup Center Profile" operatorName={profile?.fullName || "Operator"} />
                <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
                    {error && <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError(null)}><X size={16} /></button></div>}
                    {notice && <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 size={17} /> {notice}</div>}

                    {profile && <>
                        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <div className="bg-[#3B5998] px-5 py-7 text-white sm:px-8">
                                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black uppercase ring-1 ring-white/25">{profile.fullName.slice(0, 2)}</div>
                                        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Owner profile</p><h2 className="mt-1 text-2xl font-bold">{profile.centerName}</h2><p className="mt-1 text-sm text-blue-100">{profile.fullName} · {profile.pucId}</p></div>
                                    </div>
                                    {!editing ? <button onClick={() => { setNotice(null); setEditing(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#3B5998] shadow-sm hover:bg-blue-50"><Edit3 size={16} /> Edit details</button> : <div className="flex gap-2"><button onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"><X size={16} /> Cancel</button><button form="profile-form" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#3B5998] disabled:opacity-60"><Save size={16} /> {saving ? "Saving..." : "Save changes"}</button></div>}
                                </div>
                            </div>
                            <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-8"><div><p className="text-xs font-semibold uppercase text-gray-400">Center ID</p><p className="mt-1 font-mono font-bold text-[#3B5998]">{profile.pucId}</p></div><div><p className="text-xs font-semibold uppercase text-gray-400">Account status</p><p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {profile.status}</p></div><div><p className="text-xs font-semibold uppercase text-gray-400">Member since</p><p className="mt-1 text-sm font-semibold text-gray-800">{new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p></div></div>
                        </section>

                        {editing ? <form id="profile-form" onSubmit={saveProfile} className="space-y-6">
                            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8"><div className="mb-5"><h3 className="font-bold text-gray-900">Contact and center details</h3><p className="mt-1 text-sm text-gray-500">Keep the information customers use to find and contact your center current.</p></div><div className="grid gap-4 sm:grid-cols-2">{([['fullName', 'Owner full name'], ['phone', 'Phone number'], ['centerName', 'Center name'], ['state', 'State'], ['city', 'City'], ['centerAddress', 'Full center address']] as [keyof EditableProfile, string][]).map(([field, label]) => <label key={field} className={field === 'centerAddress' ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</span><input required value={form[field] || ""} onChange={(event) => updateField(field, event.target.value)} className="w-full rounded-lg border border-gray-200 px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-[#3B5998] focus:ring-2 focus:ring-blue-100" /></label>)}</div></section>
                            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8"><h3 className="font-bold text-gray-900">Bank and UPI details</h3><p className="mt-1 mb-5 text-sm text-gray-500">Add the payment details customers should use at your pickup center.</p><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-semibold text-gray-700">Account holder name</span><input value={form.accountHolderName} onChange={(event) => updateField('accountHolderName', event.target.value)} className="w-full rounded-lg border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#3B5998] focus:ring-2 focus:ring-blue-100" /></label><label><span className="mb-1.5 block text-sm font-semibold text-gray-700">Bank name</span><input value={form.bankName} onChange={(event) => updateField('bankName', event.target.value)} className="w-full rounded-lg border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#3B5998] focus:ring-2 focus:ring-blue-100" /></label><label><span className="mb-1.5 block text-sm font-semibold text-gray-700">Account number</span><input required value={form.accountNumber} onChange={(event) => updateField('accountNumber', event.target.value)} className="w-full rounded-lg border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#3B5998] focus:ring-2 focus:ring-blue-100" /></label><label><span className="mb-1.5 block text-sm font-semibold text-gray-700">IFSC code</span><input required value={form.ifscCode} onChange={(event) => updateField('ifscCode', event.target.value.toUpperCase())} className="w-full rounded-lg border border-gray-200 px-3.5 py-3 text-sm uppercase outline-none focus:border-[#3B5998] focus:ring-2 focus:ring-blue-100" /></label><label><span className="mb-1.5 block text-sm font-semibold text-gray-700">Account type</span><select value={form.accountType} onChange={(event) => updateField('accountType', event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#3B5998] focus:ring-2 focus:ring-blue-100"><option>Savings</option><option>Current</option><option>Other</option></select></label><label><span className="mb-1.5 block text-sm font-semibold text-gray-700">UPI ID</span><input value={form.upiId} onChange={(event) => updateField('upiId', event.target.value.trim())} placeholder="yourname@upi" className="w-full rounded-lg border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-[#3B5998] focus:ring-2 focus:ring-blue-100" /></label><div className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-gray-700">UPI QR / scanner image</span><div className="flex flex-wrap items-start gap-4 rounded-xl border border-dashed border-gray-300 p-4"><div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg bg-gray-50">{form.upiQrImageBase64 ? <img src={form.upiQrImageBase64} alt="UPI QR code preview" className="h-full w-full object-contain" /> : <QrCode className="text-gray-300" size={48} />}</div><div className="space-y-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#3B5998] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><QrCode size={16} /> Choose QR image<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handleQrImage(event.target.files?.[0])} /></label>{form.upiQrImageBase64 && <button type="button" onClick={() => updateField('upiQrImageBase64', null)} className="block text-sm font-semibold text-red-600 hover:text-red-700">Remove QR image</button>}<p className="text-xs text-gray-500">JPG, PNG, or WEBP up to 5MB</p></div></div></div></div></section>
                        </form> : <>
                            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8"><div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-blue-50 p-2 text-[#3B5998]"><UserRound size={19} /></div><div><h3 className="font-bold text-gray-900">Owner details</h3><p className="text-sm text-gray-500">Your registered contact information</p></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Full name" value={profile.fullName} icon={UserRound} /><Field label="Phone number" value={profile.phone} icon={Phone} /><Field label="Username" value={profile.username} icon={LockKeyhole} /><Field label="Sponsor" value={[profile.sponsorName, profile.sponsorId].filter(Boolean).join(" · ")} icon={BadgeCheck} /></div></section>
                            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8"><div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-blue-50 p-2 text-[#3B5998]"><Building2 size={19} /></div><div><h3 className="font-bold text-gray-900">Center details</h3><p className="text-sm text-gray-500">The location customers will see</p></div></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Center name" value={profile.centerName} icon={Building2} /><Field label="Location" value={`${profile.city}, ${profile.state}`} icon={MapPin} /><Field label="Address" value={profile.centerAddress} icon={MapPin} /></div></section>
                            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8"><div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-blue-50 p-2 text-[#3B5998]"><ShieldCheck size={19} /></div><div><h3 className="font-bold text-gray-900">Verification and payment details</h3><p className="text-sm text-gray-500">Protected information linked to your center</p></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Aadhaar" value={mask(profile.aadharNumber)} icon={FileCheck2} /><Field label="PAN" value={mask(profile.panNumber)} icon={FileCheck2} /><Field label="Account number" value={mask(profile.accountNumber)} icon={Landmark} /><Field label="Bank" value={profile.bankName} icon={Landmark} /><Field label="Account holder" value={profile.accountHolderName} icon={UserRound} /><Field label="Account type" value={profile.accountType} icon={Landmark} /><Field label="IFSC code" value={profile.ifscCode} icon={Landmark} /><Field label="UPI ID" value={profile.upiId} icon={QrCode} /></div>{profile.upiQrImageBase64 && <div className="mt-5 flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4"><img src={profile.upiQrImageBase64} alt="UPI QR code" className="h-28 w-28 rounded-lg bg-white object-contain p-2" /><div><p className="font-semibold text-gray-900">UPI scanner image</p><p className="mt-1 text-sm text-gray-500">Customers can scan this code to pay.</p></div></div>}<div className="mt-4 flex items-center gap-2 text-xs text-gray-500"><LockKeyhole size={14} /> Identity documents are kept read-only for your security.</div></section>
                        </>}
                    </>}
                </main>
            </div>
        </div>
    );
}
