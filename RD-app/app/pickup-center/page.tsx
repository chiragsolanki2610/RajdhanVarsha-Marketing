"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { UploadCloud, CheckCircle2, Loader2 } from "lucide-react";

type FormState = {
  name: string;
  phone: string;
  aadharNumber: string;
  panNumber: string;
  accountNumber: string;
  ifscCode: string;
  centerName: string;
  centerAddress: string;
};

type FileState = {
  aadharImage: File | null;
  panImage: File | null;
  passbookImage: File | null;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  aadharNumber: "",
  panNumber: "",
  accountNumber: "",
  ifscCode: "",
  centerName: "",
  centerAddress: "",
};

const initialFiles: FileState = {
  aadharImage: null,
  panImage: null,
  passbookImage: null,
};

export default function PickupCenterPage() {
  const [mode, setMode] = useState<"apply" | "login">("apply");

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="flex-1 bg-gray-50">
        {/* Hero */}
        <section className="bg-white py-14 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Pickup Center <span className="text-red-600">Registration</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl px-4 text-sm text-gray-500">
            Apply to open your own Raj Dhanvarsha pickup center, or log in if
            you already run one.
          </p>

          {/* Mode toggle */}
          <div className="mx-auto mt-8 flex w-fit rounded-full border border-gray-200 bg-gray-100 p-1">
            <button
              onClick={() => setMode("apply")}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                mode === "apply"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Apply for Pickup Center
            </button>
            <button
              onClick={() => setMode("login")}
              id="login"
              className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Pickup Center Login
            </button>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          {mode === "apply" ? <ApplyForm /> : <LoginForm />}
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ----------------------------- Apply Form ----------------------------- */

function ApplyForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [files, setFiles] = useState<FileState>(initialFiles);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFile = (key: keyof FileState) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > 5 * 1024 * 1024) {
      setError("Each image must be under 5MB.");
      return;
    }
    setError(null);
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!files.aadharImage || !files.panImage || !files.passbookImage) {
      setError("Please upload Aadhar card, PAN card, and passbook images.");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      data.append("aadharImage", files.aadharImage);
      data.append("panImage", files.panImage);
      data.append("passbookImage", files.passbookImage);

      const res = await fetch("/api/pickup-center/apply", {
        method: "POST",
        body: data,
      });

      if (!res.ok) throw new Error("Submission failed. Please try again.");

      setSubmitted(true);
      setForm(initialForm);
      setFiles(initialFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <CheckCircle2 className="text-green-500" size={52} />
        <h2 className="text-xl font-bold text-gray-900">Application Submitted</h2>
        <p className="max-w-md text-sm text-gray-500">
          Thank you for applying. Our team will verify your documents and
          contact you on your registered phone number within 2–3 business
          days.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-2 rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Submit Another Application
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
    >
      {/* Personal details */}
      <div>
        <h3 className="mb-4 text-lg font-bold text-blue-700">
          Personal Details
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Full Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
          />
          <TextField
            label="Phone Number"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="10-digit mobile number"
            pattern="[0-9]{10}"
            maxLength={10}
            required
          />
        </div>
      </div>

      {/* Identity documents */}
      <div>
        <h3 className="mb-4 text-lg font-bold text-blue-700">
          Identity Documents
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Aadhar Card Number"
            name="aadharNumber"
            value={form.aadharNumber}
            onChange={handleChange}
            placeholder="XXXX XXXX XXXX"
            maxLength={12}
            required
          />
          <FileField
            label="Upload Aadhar Card Image"
            file={files.aadharImage}
            onChange={handleFile("aadharImage")}
            required
          />
          <TextField
            label="PAN Card Number"
            name="panNumber"
            value={form.panNumber}
            onChange={handleChange}
            placeholder="ABCDE1234F"
            maxLength={10}
            required
            className="uppercase"
          />
          <FileField
            label="Upload PAN Card Image"
            file={files.panImage}
            onChange={handleFile("panImage")}
            required
          />
        </div>
      </div>

      {/* Bank details */}
      <div>
        <h3 className="mb-4 text-lg font-bold text-blue-700">
          Bank Account Details
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Account Number"
            name="accountNumber"
            value={form.accountNumber}
            onChange={handleChange}
            placeholder="Enter bank account number"
            required
          />
          <TextField
            label="IFSC Code"
            name="ifscCode"
            value={form.ifscCode}
            onChange={handleChange}
            placeholder="Bank IFSC code"
            required
            className="uppercase"
          />
          <div className="sm:col-span-2">
            <FileField
              label="Upload Passbook / Bank Statement Image"
              file={files.passbookImage}
              onChange={handleFile("passbookImage")}
              required
            />
          </div>
        </div>
      </div>

      {/* Pickup center details */}
      <div>
        <h3 className="mb-4 text-lg font-bold text-blue-700">
          Pickup Center Details
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Pickup Center Name"
            name="centerName"
            value={form.centerName}
            onChange={handleChange}
            placeholder="Enter proposed center name"
            required
          />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Pickup Center Address
            </label>
            <textarea
              name="centerAddress"
              value={form.centerAddress}
              onChange={handleChange}
              placeholder="Full address with pin code"
              rows={3}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? "Submitting..." : "Submit Application"}
      </button>
    </form>
  );
}

/* ------------------------------ Login Form ----------------------------- */

function LoginForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/pickup-center/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      if (!res.ok) throw new Error("Invalid phone number or password.");

      window.location.href = "/pickup-center/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-md space-y-5 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
    >
      <h3 className="text-center text-lg font-bold text-blue-700">
        Pickup Center Login
      </h3>

      <TextField
        label="Registered Phone Number"
        name="phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="10-digit mobile number"
        maxLength={10}
        required
      />

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}

/* ------------------------------ Sub Fields ------------------------------ */

function TextField({
  label,
  className = "",
  ...props
}: {
  label: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <input
        {...props}
        className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${className}`}
      />
    </div>
  );
}

function FileField({
  label,
  file,
  onChange,
  required,
}: {
  label: string;
  file: File | null;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 transition hover:border-blue-500 hover:bg-blue-50">
        <UploadCloud size={18} className="shrink-0 text-blue-600" />
        <span className="truncate">
          {file ? file.name : "Click to upload image (JPG/PNG, max 5MB)"}
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          required={required}
          className="hidden"
        />
      </label>
    </div>
  );
}
