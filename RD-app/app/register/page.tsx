"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();
    
    const [formData, setFormData] = useState({
        name: "",
        mobile: "",
        aadhar: "",
        sponsorId: "",
        sponsorName: "",
        position: "",
        address: "",
        password: "",
        confirmPassword: "",
        agreeToTerms: false,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false); // New state to trace background login status
    const [apiError, setApiError] = useState<string | null>(null);
    const [isFetchingSponsor, setIsFetchingSponsor] = useState(false); // UI state for sponsor checking
    
    // Popup Modal States
    const [showPopup, setShowPopup] = useState(false);
    const [generatedCredentials, setGeneratedCredentials] = useState({
        userId: "",
        password: ""
    });

    // Automatically fetches sponsor details using your AuthController [HttpGet("{userId}")] endpoint
    const fetchSponsorName = async (sponsorId: string) => {
        if (!sponsorId.trim()) {
            setFormData((prev) => ({ ...prev, sponsorName: "" }));
            return;
        }

        setIsFetchingSponsor(true);
        try {
            const response = await fetch(`https://localhost:56187/api/Auth/${sponsorId.trim()}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Map from C# userProfile response 'userId' and 'name' properties
                setFormData((prev) => ({ ...prev, sponsorName: data.name || "" }));
            } else {
                setFormData((prev) => ({ ...prev, sponsorName: "Sponsor Not Found ⚠️" }));
            }
        } catch (error) {
            console.error("Error fetching sponsor:", error);
            setFormData((prev) => ({ ...prev, sponsorName: "Connection Error" }));
        } finally {
            setIsFetchingSponsor(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;

        if (type === "checkbox") {
            const target = e.target as HTMLInputElement;
            setFormData((prev) => ({ ...prev, [name]: target.checked }));
        } else {
            if (name === 'mobile') {
                const sanitized = value.replace(/[^0-9]/g, '');
                setFormData((prev) => ({ ...prev, [name]: sanitized.slice(0, 10) }));
            } else if (name === 'aadhar') {
                const sanitized = value.replace(/[^0-9]/g, '');
                setFormData((prev) => ({ ...prev, [name]: sanitized.slice(0, 12) }));
            } else {
                setFormData((prev) => ({ ...prev, [name]: value }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setApiError(null);

        try {
            const formattedPosition = formData.position 
                ? formData.position.charAt(0).toUpperCase() + formData.position.slice(1) 
                : "";

            const payload = {
                Name: formData.name,
                MobileNo: formData.mobile,
                AadharNo: formData.aadhar,
                SponsorId: formData.sponsorId,
                SponsorName: formData.sponsorName,
                Position: formattedPosition,
                Address: formData.address
            };

            const response = await fetch("https://localhost:56187/api/Auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.errors) {
                    const detailedErrors = Object.entries(errorData.errors)
                        .map(([field, messages]) => `${(messages as string[]).join(', ')}`)
                        .join(' | ');
                    throw new Error(detailedErrors || "Registration failed. Invalid inputs.");
                }
                throw new Error(errorData.message || "Registration failed. Please check your network or inputs.");
            }

            const data = await response.json();
            
            setGeneratedCredentials({
                userId: data.userId || "Generated ID Unavailable",
                password: data.generatedPassword || "Automatically Assigned"
            });
            
            setShowPopup(true);
        } catch (error: any) {
            console.error("API Fetch Error:", error);
            setApiError(error.message || "Failed to fetch response from registration server.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoginAndRedirect = async () => {
        setIsLoggingIn(true);
        setApiError(null);

        try {
            const loginPayload = {
                UserId: generatedCredentials.userId,
                Password: generatedCredentials.password
            };

            const response = await fetch("https://localhost:56187/api/Auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(loginPayload),
            });

            if (!response.ok) {
                throw new Error("Account created successfully, but automatic login failed. Please login manually.");
            }

            const loginData = await response.json();

            if (loginData.token) {
                localStorage.setItem("authToken", loginData.token);
                localStorage.setItem("userProfile", JSON.stringify(loginData));
            }

            setShowPopup(false);
            router.push("/dashboard");
        } catch (error: any) {
            console.error("Auto Login Error:", error);
            alert(error.message || "Authentication routing failed.");
            setShowPopup(false);
            router.push("/login");
        } finally {
            setIsLoggingIn(false);
        }
    };

    const inputStyles =
        "w-full px-4 py-3 border border-gray-300 rounded-xl bg-[#f8fafc] text-gray-800 placeholder-gray-400 outline-none focus:border-[#E23434]/60 focus:ring-1 focus:ring-[#E23434]/20 transition-all font-normal text-sm shadow-sm disabled:opacity-60";
    const labelStyles =
        "block text-gray-600 font-bold text-[10px] mb-1.5 tracking-wider uppercase";

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 md:p-12 relative overflow-hidden font-sans selection:bg-red-500/10">

            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[700px] h-[700px] border border-gray-100 rounded-full pointer-events-none hidden lg:block" />
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[450px] h-[450px] border border-gray-100 rounded-full pointer-events-none hidden lg:block" />

            <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative z-10">

                {/* Left Side Brand Info */}
                <div className="lg:col-span-5 space-y-7 pl-0 lg:pl-8 text-center flex flex-col items-center justify-center lg:justify-start lg:pt-8 self-start">
                    <div className="mb-2">
                        <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-gray-50 to-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden shadow-md group hover:border-gray-300 transition-all duration-300">
                            <img
                                src="/photos/web_logo.jpg"
                                alt="Website Logo"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                        const fallback = document.createElement('div');
                                        fallback.className = "text-gray-400 font-black text-4xl tracking-tighter";
                                        fallback.innerText = "RD";
                                        parent.appendChild(fallback);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center items-baseline gap-2 mb-2 font-bold text-3xl">
                        <span className="text-red-500">RAJ</span>
                        <span className="text-blue-800">DHANVARSHA</span>
                        <span className="text-red-500">MARKETING</span>
                    </div>

                    <div className="space-y-3 flex flex-col items-center">
                        <p className="text-gray-500 text-xs md:text-sm max-w-sm leading-relaxed font-normal pt-1">
                            Start earning with India's fastest-growing wellness marketing brand.
                        </p>
                    </div>

                    <ul className="space-y-3 text-xs text-gray-600 font-medium text-left self-center">
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full border border-red-500/20 flex items-center justify-center text-[9px] text-[#E23434] bg-red-50">✓</span>
                            Premium healthcare & wellness products
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full border border-red-500/20 flex items-center justify-center text-[9px] text-[#E23434] bg-red-50">✓</span>
                            Retail margins up to 20%
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full border border-red-500/20 flex items-center justify-center text-[9px] text-[#E23434] bg-red-50">✓</span>
                            Direct referral commissions
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full border border-red-500/20 flex items-center justify-center text-[9px] text-[#E23434] bg-red-50">✓</span>
                            Business training & digital tools
                        </li>
                    </ul>
                </div>

                {/* Right Side Card Panel */}
                <div className="lg:col-span-7 bg-white p-6 md:p-9 rounded-2xl border border-gray-100 shadow-xl max-w-xl lg:max-w-none w-full ml-auto">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-900 tracking-wide">Create Account</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Fill in your details to register</p>
                    </div>

                    {apiError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
                            ⚠️ {apiError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4.5">
                        <div className="mb-4">
                            <label htmlFor="name" className={labelStyles}>Your Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={handleChange}
                                className={inputStyles}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="mobile" className={labelStyles}>Mobile No</label>
                                <input
                                    type="text"
                                    id="mobile"
                                    name="mobile"
                                    placeholder="9876543210"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    className={inputStyles}
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="aadhar" className={labelStyles}>Aadhar No</label>
                                <input
                                    type="text"
                                    id="aadhar"
                                    name="aadhar"
                                    placeholder="XXXX XXXX XXXX"
                                    value={formData.aadhar}
                                    onChange={handleChange}
                                    className={inputStyles}
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="sponsorId" className={labelStyles}>Sponsor ID</label>
                                <input
                                    type="text"
                                    id="sponsorId"
                                    name="sponsorId"
                                    placeholder="Sponsor code"
                                    value={formData.sponsorId}
                                    onChange={handleChange}
                                    onBlur={(e) => fetchSponsorName(e.target.value)}
                                    className={inputStyles}
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label htmlFor="sponsorName" className={labelStyles}>Sponsor ID Name</label>
                                <input
                                    type="text"
                                    id="sponsorName"
                                    name="sponsorName"
                                    placeholder={isFetchingSponsor ? "Checking ID..." : "Sponsor name"}
                                    value={formData.sponsorName}
                                    onChange={handleChange}
                                    className={`${inputStyles} bg-gray-50 text-gray-600 font-medium`}
                                    readOnly
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="position" className={labelStyles}>Your Position</label>
                            <div className="relative">
                                <select
                                    id="position"
                                    name="position"
                                    value={formData.position}
                                    onChange={handleChange}
                                    className={`${inputStyles} appearance-none cursor-pointer pr-10 text-gray-800`}
                                    disabled={isLoading}
                                    required
                                >
                                    <option value="" disabled>Select Position</option>
                                    <option value="left">LEFT</option>
                                    <option value="right">RIGHT</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="address" className={labelStyles}>Your Address</label>
                            <textarea
                                id="address"
                                name="address"
                                rows={2}
                                placeholder="Enter your full address"
                                value={formData.address}
                                onChange={handleChange}
                                className={`${inputStyles} resize-none h-[48px]`}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className="flex items-start gap-2.5 pt-0.5">
                            <input
                                type="checkbox"
                                id="agreeToTerms"
                                name="agreeToTerms"
                                checked={formData.agreeToTerms}
                                onChange={handleChange}
                                className="mt-0.5 w-3.5 h-3.5 rounded accent-[#E23434] border-gray-300 bg-[#f8fafc] cursor-pointer"
                                disabled={isLoading}
                                required
                            />
                            <label htmlFor="agreeToTerms" className="text-[11px] text-gray-500 font-medium leading-tight cursor-pointer select-none">
                                I agree to the <a href="#" className="text-red-500 hover:underline">Terms of Service</a> & <a href="#" className="text-red-500 hover:underline">Privacy Policy</a>
                            </label>
                        </div>

                        <div className="pt-3">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#E23434] hover:bg-[#c82828] text-white font-bold tracking-wider uppercase rounded-xl py-3.5 text-xs transition-all duration-300 shadow-md shadow-red-500/10 disabled:opacity-75 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Creating...
                                    </>
                                ) : (
                                    "Create Account"
                                )}
                            </button>
                        </div>

                        <div className="text-center pt-2">
                            <p className="text-[11px] text-gray-500 font-medium">
                                Already a member? <a href="/login" className="text-red-500 hover:underline">Sign in</a>
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Modal Popup for displaying API generated values */}
            {showPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 transition-all">
                        <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                            ✓
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-1">Registration Successful!</h4>
                        <p className="text-xs text-gray-400 mb-5">Please save your auto-generated credentials below.</p>
                        
                        <div className="bg-[#f8fafc] border border-gray-100 rounded-xl p-4 text-left space-y-3 mb-6">
                            <div>
                                <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">User ID</span>
                                <span className="text-sm font-semibold text-gray-800 select-all block break-all">{generatedCredentials.userId}</span>
                            </div>
                            <div className="border-t border-gray-200/60 pt-2.5">
                                <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Password</span>
                                <span className="text-sm font-semibold text-gray-800 select-all block break-all">{generatedCredentials.password}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleLoginAndRedirect}
                            disabled={isLoggingIn}
                            className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold tracking-wider uppercase rounded-xl py-3 text-xs transition-all duration-200 shadow-md shadow-blue-800/10 disabled:opacity-75 flex items-center justify-center gap-2"
                        >
                            {isLoggingIn ? (
                                <>
                                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Logging in...
                                </>
                            ) : (
                                "Login to Dashboard"
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}