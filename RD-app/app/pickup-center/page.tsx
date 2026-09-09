"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { UploadCloud, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";

type CredentialsState = {
  username: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

type FormState = {
  name: string;
  sponsorId: string;
  sponsorName: string;
  aadharNumber: string;
  panNumber: string;
  accountNumber: string;
  ifscCode: string;
  centerName: string;
  centerAddress: string;
  centerState: string;
  centerCity: string;
};

type FileState = {
  aadharImage: File | null;
  panImage: File | null;
  passbookImage: File | null;
};

const initialCredentials: CredentialsState = {
  username: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

const initialForm: FormState = {
  name: "",
  sponsorId: "",
  sponsorName: "",
  aadharNumber: "",
  panNumber: "",
  accountNumber: "",
  ifscCode: "",
  centerName: "",
  centerAddress: "",
  centerState: "",
  centerCity: "",
};

const initialFiles: FileState = {
  aadharImage: null,
  panImage: null,
  passbookImage: null,
};

/* ------------------------- India States & Cities ------------------------ */
/* Covers all 28 states + 8 union territories with major cities/districts. */

const STATE_CITY_MAP: Record<string, string[]> = {
  "Andhra Pradesh": [
    "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry",
    "Tirupati", "Kadapa", "Kakinada", "Anantapur", "Chittoor", "Eluru",
  ],
  "Arunachal Pradesh": [
    "Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro", "Bomdila",
  ],
  Assam: [
    "Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia",
    "Tezpur", "Karimganj", "Bongaigaon",
  ],
  Bihar: [
    "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia",
    "Ara", "Begusarai", "Katihar", "Munger", "Chhapra", "Saharsa",
  ],
  Chhattisgarh: [
    "Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon",
    "Jagdalpur", "Ambikapur",
  ],
  Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  Gujarat: [
    "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar",
    "Junagadh", "Gandhinagar", "Anand", "Nadiad", "Mehsana", "Morbi",
  ],
  Haryana: [
    "Yamuna Nagar", "Hisar", "Karnal", "Panipat", "Ambala", "Rohtak",
    "Gurugram", "Faridabad", "Sonipat", "Kurukshetra", "Sirsa", "Bhiwani",
    "Panchkula", "Jind", "Kaithal", "Rewari", "Jhajjar", "Fatehabad",
    "Palwal", "Narnaul",
  ],
  "Himachal Pradesh": [
    "Shimla", "Manali", "Solan", "Dharamshala", "Mandi", "Kullu",
    "Una", "Hamirpur", "Bilaspur", "Chamba",
  ],
  Jharkhand: [
    "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh",
    "Giridih", "Ramgarh",
  ],
  Karnataka: [
    "Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Kalaburagi",
    "Davanagere", "Ballari", "Shivamogga", "Tumakuru", "Udupi", "Bidar",
  ],
  Kerala: [
    "Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam",
    "Kannur", "Alappuzha", "Palakkad", "Malappuram", "Kottayam",
  ],
  "Madhya Pradesh": [
    "Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar",
    "Dewas", "Satna", "Ratlam", "Rewa", "Katni", "Singrauli",
  ],
  Maharashtra: [
    "Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad",
    "Solapur", "Kolhapur", "Amravati", "Navi Mumbai", "Sangli", "Akola",
    "Latur", "Jalgaon", "Nanded",
  ],
  Manipur: ["Imphal", "Thoubal", "Bishnupur", "Churachandpur"],
  Meghalaya: ["Shillong", "Tura", "Jowai", "Nongstoin"],
  Mizoram: ["Aizawl", "Lunglei", "Champhai", "Serchhip"],
  Nagaland: ["Kohima", "Dimapur", "Mokokchung", "Tuensang"],
  Odisha: [
    "Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur",
    "Puri", "Balasore", "Bhadrak",
  ],
  Punjab: [
    "Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala",
    "Mohali", "Bathinda", "Hoshiarpur", "Pathankot", "Moga", "Firozpur",
  ],
  Rajasthan: [
    "Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner",
    "Alwar", "Bharatpur", "Sikar", "Bhilwara", "Sri Ganganagar",
  ],
  Sikkim: ["Gangtok", "Namchi", "Gyalshing", "Mangan"],
  "Tamil Nadu": [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem",
    "Tirunelveli", "Erode", "Vellore", "Thoothukudi", "Dindigul",
  ],
  Telangana: [
    "Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam",
    "Ramagundam", "Mahbubnagar", "Secunderabad",
  ],
  Tripura: ["Agartala", "Udaipur", "Dharmanagar", "Kailashahar"],
  "Uttar Pradesh": [
    "Lucknow", "Noida", "Ghaziabad", "Kanpur", "Agra", "Meerut",
    "Varanasi", "Prayagraj", "Bareilly", "Aligarh", "Moradabad",
    "Saharanpur", "Gorakhpur", "Firozabad", "Jhansi", "Muzaffarnagar",
    "Mathura", "Rampur", "Shahjahanpur",
  ],
  Uttarakhand: [
    "Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur",
    "Nainital", "Rishikesh", "Kashipur",
  ],
  "West Bengal": [
    "Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman",
    "Malda", "Kharagpur", "Haldia", "Darjeeling",
  ],
  /* Union Territories */
  "Andaman and Nicobar Islands": ["Port Blair", "Diglipur", "Car Nicobar"],
  Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  Delhi: [
    "New Delhi", "North Delhi", "South Delhi", "East Delhi",
    "West Delhi", "Dwarka", "Rohini", "Karol Bagh",
  ],
  "Jammu and Kashmir": [
    "Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur", "Kathua",
  ],
  Ladakh: ["Leh", "Kargil"],
  Lakshadweep: ["Kavaratti", "Agatti", "Minicoy"],
  Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
};

const STATE_LIST = Object.keys(STATE_CITY_MAP).sort();

function fileToBase64(file: File | null): Promise<string | null> {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

// Pull a readable message out of an API error response. ASP.NET Core's
// automatic [ApiController] model validation returns a ValidationProblemDetails
// body (an `errors` object keyed by field name), NOT a `{ message }` field, so
// without this we'd always fall back to a generic "something went wrong" text
// even when the server told us exactly what was missing.
async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  if (!data) return fallback;
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  if (data.errors && typeof data.errors === "object") {
    const fieldMessages = Object.values(data.errors as Record<string, string[]>).flat();
    if (fieldMessages.length) return fieldMessages.join(" ");
  }
  if (typeof data.title === "string" && data.title.trim()) return data.title;
  return fallback;
}

export default function PickupCenterPage() {
  const [mode, setMode] = useState<"apply" | "login">("apply");

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="flex-1 bg-gray-50 pt-20 md:pt-24">
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
          {mode === "apply" ? <ApplyFlow /> : <LoginForm />}
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ------------------------------ Apply Flow ------------------------------ */
/* Step 1: choose a username/password for the pickup center account.
   Step 2: fill the rest of the application details and submit everything. */

function ApplyFlow() {
  const [step, setStep] = useState<"credentials" | "details">("credentials");
  const [credentials, setCredentials] = useState<CredentialsState>(initialCredentials);
  const [credError, setCredError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleCredChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleCredSubmit = (e: FormEvent) => {
    e.preventDefault();
    setCredError(null);

    if (credentials.username.trim().length < 4) {
      setCredError("Username must be at least 4 characters.");
      return;
    }
    if (!/^[0-9]{10}$/.test(credentials.phone.trim())) {
      setCredError("Enter a valid 10-digit phone number.");
      return;
    }
    if (credentials.password.length < 6) {
      setCredError("Password must be at least 6 characters.");
      return;
    }
    if (credentials.password !== credentials.confirmPassword) {
      setCredError("Passwords do not match.");
      return;
    }

    setStep("details");
  };

  if (step === "credentials") {
    return (
      <form
        onSubmit={handleCredSubmit}
        className="mx-auto max-w-md space-y-5 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
      >
        <h3 className="text-center text-lg font-bold text-blue-700">
          Create Your Pickup Center Account
        </h3>
        <p className="text-center text-sm text-gray-500">
          Choose a username and password. You&apos;ll use these to log in
          once your application is approved.
        </p>

        <TextField
          label="Username"
          name="username"
          value={credentials.username}
          onChange={handleCredChange}
          placeholder="Choose a username"
          required
        />

        <TextField
          label="Phone Number"
          name="phone"
          type="tel"
          value={credentials.phone}
          onChange={handleCredChange}
          placeholder="10-digit mobile number"
          pattern="[0-9]{10}"
          maxLength={10}
          required
        />

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={credentials.password}
              onChange={handleCredChange}
              placeholder="Create a password"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={credentials.confirmPassword}
              onChange={handleCredChange}
              placeholder="Re-enter your password"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {credError && (
          <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {credError}
          </p>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Continue
        </button>
      </form>
    );
  }

  return (
    <ApplyForm
      credentials={credentials}
      onBack={() => setStep("credentials")}
    />
  );
}

/* ----------------------------- Apply Form ----------------------------- */

function ApplyForm({
  credentials,
  onBack,
}: {
  credentials: CredentialsState;
  onBack: () => void;
}) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [files, setFiles] = useState<FileState>(initialFiles);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- sponsor lookup state ---
  type SponsorLookupStatus = "idle" | "loading" | "found" | "not-found";
  const [sponsorLookupStatus, setSponsorLookupStatus] = useState<SponsorLookupStatus>("idle");

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // State dropdown: changing state clears the previously chosen city
  const handleStateChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setForm((prev) => ({ ...prev, centerState: newState, centerCity: "" }));
  };

  const handleCityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newCity = e.target.value;
    setForm((prev) => ({ ...prev, centerCity: newCity }));
  };

  // --- debounced sponsor lookup effect ---
  useEffect(() => {
    const id = form.sponsorId.trim();

    if (!id) {
      setSponsorLookupStatus("idle");
      setForm((prev) => ({ ...prev, sponsorName: "" }));
      return;
    }

    setSponsorLookupStatus("loading");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://rd-api-j7zj.onrender.com/api/Auth/sponsor-lookup/${encodeURIComponent(id)}`
        );

        if (!res.ok) {
          setSponsorLookupStatus("not-found");
          setForm((prev) => ({ ...prev, sponsorName: "" }));
          return;
        }

        const data = await res.json();
        setForm((prev) => ({ ...prev, sponsorName: data.sponsorIdName ?? "" }));
        setSponsorLookupStatus("found");
      } catch {
        setSponsorLookupStatus("not-found");
        setForm((prev) => ({ ...prev, sponsorName: "" }));
      }
    }, 400); // debounce so it doesn't fire on every keystroke

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sponsorId]);

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

    if (sponsorLookupStatus !== "found") {
      setError("Please enter a valid Sponsor ID before submitting.");
      return;
    }

    if (!form.centerState || !form.centerCity) {
      setError("Please select the pickup center's state and city.");
      return;
    }

    setSubmitting(true);
    try {
      const [aadharImageBase64, panImageBase64, passbookImageBase64] = await Promise.all([
        fileToBase64(files.aadharImage),
        fileToBase64(files.panImage),
        fileToBase64(files.passbookImage),
      ]);

      const res = await fetch("https://rd-api-j7zj.onrender.com/api/PickupCenter/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          phone: credentials.phone,
          fullName: form.name,
          sponsorId: form.sponsorId,
          sponsorName: form.sponsorName,
          aadharNumber: form.aadharNumber,
          aadharImageBase64,
          panNumber: form.panNumber,
          panImageBase64,
          accountNumber: form.accountNumber,
          ifscCode: form.ifscCode,
          passbookImageBase64,
          centerName: form.centerName,
          centerAddress: form.centerAddress,
          // NOTE: backend DTO expects "state" / "city" (not "centerState" /
          // "centerCity"). Sending the wrong keys left these empty server-side
          // and tripped the [Required] validation on State/City every time.
          state: form.centerState,
          city: form.centerCity,
        }),
      });

      if (!res.ok) {
        const message = await extractErrorMessage(res, "Submission failed. Please try again.");
        throw new Error(message);
      }

      setSubmitted(true);
      setForm(initialForm);
      setFiles(initialFiles);
      setSponsorLookupStatus("idle");
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
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Account username: <span className="font-semibold text-gray-800">{credentials.username}</span>
        </p>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Edit account details
        </button>
      </div>

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
            name="phoneDisplay"
            value={credentials.phone}
            placeholder="10-digit mobile number"
            disabled
          />
          <TextField
            label="Sponsor ID"
            name="sponsorId"
            value={form.sponsorId}
            onChange={handleChange}
            placeholder="Enter sponsor ID"
            required
          />

          {/* Sponsor Name is read-only and auto-filled */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Sponsor Name
            </label>
            <input
              name="sponsorName"
              value={form.sponsorName}
              readOnly
              placeholder={
                sponsorLookupStatus === "loading"
                  ? "Looking up sponsor..."
                  : "Auto-filled from Sponsor ID"
              }
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
            {sponsorLookupStatus === "not-found" && (
              <p className="mt-1 text-xs text-red-600">Sponsor ID not found.</p>
            )}
            {sponsorLookupStatus === "found" && (
              <p className="mt-1 text-xs text-green-600">Sponsor verified.</p>
            )}
          </div>
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
          <div className="sm:col-span-2">
            <TextField
              label="Pickup Center Name"
              name="centerName"
              value={form.centerName}
              onChange={handleChange}
              placeholder="Enter proposed center name"
              required
            />
          </div>

          {/* State dropdown */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              State
            </label>
            <select
              name="centerState"
              value={form.centerState}
              onChange={handleStateChange}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select state</option>
              {STATE_LIST.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {/* City dropdown, depends on selected state */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              City
            </label>
            <select
              name="centerCity"
              value={form.centerCity}
              onChange={handleCityChange}
              required
              disabled={!form.centerState}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
            >
              <option value="">
                {form.centerState ? "Select city" : "Select state first"}
              </option>
              {(STATE_CITY_MAP[form.centerState] ?? []).map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("https://rd-api-j7zj.onrender.com/api/PickupCenter/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const message = await extractErrorMessage(res, "Invalid username or password.");
        throw new Error(message);
      }

      const data = await res.json();
      localStorage.setItem("pucToken", data.token);
      localStorage.setItem("pucInfo", JSON.stringify(data));
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
        label="Username"
        name="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter your username"
        required
      />

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
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