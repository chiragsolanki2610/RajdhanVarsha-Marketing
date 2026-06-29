"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; 

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        userId: "",
        password: "",
        rememberMe: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    
    // API State management
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Automatically fill the User ID if "Remember Me" was previously enabled
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedUserId = localStorage.getItem("rememberUserId");
            if (savedUserId) {
                setFormData((prev) => ({
                    ...prev,
                    userId: savedUserId,
                    rememberMe: true,
                }));
            }
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const API_URL = "http://localhost:56188/api/Auth/login"; 

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify({
                    UserId: formData.userId.trim(),
                    Password: formData.password,
                }),
            });

            const contentType = response.headers.get("content-type");
            let data: any = {};
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const textData = await response.text();
                data = { message: textData };
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || "Invalid credentials. Please try again.");
            }

            setSuccessMessage("Login Successful! Redirecting...");
            
            if (typeof window !== "undefined") {
                const token = data.token || data.tokenString || data.jwt;
                
                // Clear stale per-user cache from any previous session
                // so a different user logging in doesn't see the old user's plan status
                localStorage.removeItem("userPlanType");
                localStorage.removeItem("userProfile");

                // Set tokens consistently
                if (token) {
                    localStorage.setItem("authToken", token);
                    localStorage.setItem("token", token);
                } else {
                    localStorage.setItem("authToken", "dev_session_active");
                }

                // Parse user data from response if nested inside data.user
                const userSource = data.user || data;

                // Build a complete profile object with fallbacks to prevent rendering breaks
                const profileObj = {
                    userId: userSource.userId || userSource.memberId || formData.userId.trim().toUpperCase(),
                    name: userSource.name || "DHARAMVEER",
                    mobileNo: userSource.mobileNo || "",
                    position: userSource.position || "Left",
                    sponsorId: userSource.sponsorId || "",
                    sponsorName: userSource.sponsorName || "",
                    email: userSource.email || ""
                };
                
                localStorage.setItem("userProfile", JSON.stringify(profileObj));

                if (formData.rememberMe) {
                    localStorage.setItem("rememberUserId", formData.userId.trim());
                } else {
                    localStorage.removeItem("rememberUserId");
                }
            }

            // Perform a reliable page routing transition
            setTimeout(() => {
                router.push("/dashboard"); 
            }, 1000);

        } catch (error: any) {
            setErrorMessage(error.message || "Unable to connect to login servers. Please verify backend is running.");
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyles =
        "w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-[#f8fafc] text-gray-800 placeholder-gray-400 outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/10 transition-all font-normal text-sm shadow-inner/5";

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
            <div className="absolute top-1/2 left-[28%] -translate-y-1/2 -translate-x-1/2 w-[760px] h-[760px] border border-gray-100 rounded-full pointer-events-none hidden xl:block" />
            <div className="absolute top-1/2 left-[28%] -translate-y-1/2 -translate-x-1/2 w-[520px] h-[520px] border border-gray-100 rounded-full pointer-events-none hidden xl:block" />

            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center relative z-10">
                <div className="lg:col-span-6 flex flex-col items-center justify-center text-center p-2 lg:p-6 space-y-6">
                    <div className="w-32 h-32 rounded-full bg-white border border-gray-100 flex items-center justify-center p-0.5 shadow-md overflow-hidden">
                        <img
                            src="/photos/web_logo.jpg"
                            alt="Raj Dhan Varsha Marketing Logo"
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                    const fallback = document.createElement('div');
                                    fallback.className = "text-red-500 font-black text-3xl tracking-tight";
                                    fallback.innerText = "RD";
                                    parent.appendChild(fallback);
                                }
                            }}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide flex items-center justify-center gap-2.5">
                            <span className="text-[#E23434]">RAJ</span>
                            <span className="text-[#1E40AF]">DHANVARSHA</span>
                        </h1>
                        <h2 className="text-2xl md:text-3xl font-extrabold tracking-wider text-[#E23434]">
                            MARKETING
                        </h2>
                    </div>

                    <p className="text-gray-500 text-sm max-w-sm font-medium leading-relaxed">
                        Start earning with India's fastest-growing wellness marketing brand.
                    </p>

                    <ul className="space-y-3.5 text-xs text-gray-600 font-medium max-w-sm w-full pl-6 md:pl-12 text-left self-center">
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full border border-red-200 flex items-center justify-center text-[9px] text-[#E23434] bg-red-50/50">✓</span>
                            Premium healthcare & wellness products
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full border border-red-200 flex items-center justify-center text-[9px] text-[#E23434] bg-red-50/50">✓</span>
                            Retail margins up to 20%
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full border border-red-200 flex items-center justify-center text-[9px] text-[#E23434] bg-red-50/50">✓</span>
                            Direct referral commissions
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full border border-red-200 flex items-center justify-center text-[9px] text-[#E23434] bg-red-50/50">✓</span>
                            Business training & digital tools
                        </li>
                    </ul>
                </div>

                <div className="lg:col-span-6 bg-white px-7 py-9 md:p-10 rounded-3xl border border-gray-100/80 shadow-xl shadow-gray-200/40 max-w-lg w-full mx-auto">
                    <div className="mb-8">
                        <h3 className="text-2xl font-bold text-gray-800 tracking-tight">Welcome Back</h3>
                        <p className="text-xs text-gray-400 mt-1 font-medium">Sign in to manage your account</p>
                    </div>

                    {errorMessage && (
                        <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 font-medium flex items-center gap-2">
                            <span>⚠️</span> {errorMessage}
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-5 p-3 rounded-xl bg-green-50 border border-green-100 text-xs text-green-600 font-medium flex items-center gap-2">
                            <span>🎉</span> {successMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="userId" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                User ID
                            </label>
                            <input
                                type="text"
                                id="userId"
                                name="userId"
                                placeholder="Enter your User ID"
                                value={formData.userId}
                                onChange={handleChange}
                                className={inputStyles}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={inputStyles}
                                    disabled={isLoading}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm transition-colors select-none"
                                >
                                    {showPassword ? "🙈" : "👁"}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2.5">
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded border-gray-300 bg-gray-50 text-[#E23434] focus:ring-0 accent-[#E23434] cursor-pointer"
                                />
                                <label htmlFor="rememberMe" className="text-xs text-gray-500 font-semibold cursor-pointer select-none">
                                    Remember me
                                </label>
                            </div>
                            <a href="#" className="text-xs text-red-500 font-semibold hover:underline transition-all">
                                Forgot Password?
                            </a>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#E23434] hover:bg-[#d02c2c] disabled:bg-gray-400 text-white font-bold tracking-wider uppercase rounded-xl py-4 text-xs transition-all duration-200 shadow-md shadow-red-500/10 flex items-center justify-center gap-2"
                            >
                                {isLoading ? "Verifying..." : "Sign In"}
                            </button>
                        </div>

                        <div className="text-center pt-3">
                            <p className="text-xs text-gray-500 font-medium">
                                Not a member yet?{" "}
                                <button
                                    type="button"
                                    onClick={() => router.push("/register")}
                                    className="text-red-500 font-bold hover:underline ml-1 transition-all"
                                >
                                    Register here
                                </button>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}