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
            const API_URL = "https://rd-api-j7zj.onrender.com/api/Auth/login"; 

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
        "w-full px-4 py-3 border border-gray-300 rounded-xl bg-[#f8fafc] text-gray-800 placeholder-gray-400 outline-none focus:border-[#E23434]/60 focus:ring-1 focus:ring-[#E23434]/20 transition-all font-normal text-sm shadow-sm disabled:opacity-60";
    const labelStyles =
        "block text-gray-600 font-bold text-[10px] mb-1.5 tracking-wider uppercase";

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 md:p-12 relative overflow-hidden font-sans selection:bg-red-500/10">
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[700px] h-[700px] border border-gray-100 rounded-full pointer-events-none hidden lg:block" />
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[450px] h-[450px] border border-gray-100 rounded-full pointer-events-none hidden lg:block" />

            <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative z-10">
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

                    <div className="space-y-3 flex-col items-center hidden md:flex">
                        <p className="text-gray-500 text-xs md:text-sm max-w-sm leading-relaxed font-normal pt-1">
                            Start earning with India's fastest-growing wellness marketing brand.
                        </p>
                    </div>

                    <ul className="space-y-3 text-xs text-gray-600 font-medium text-left self-center hidden md:block">
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

                <div className="lg:col-span-7 bg-white p-6 md:p-9 rounded-2xl border border-gray-100 shadow-xl max-w-xl lg:max-w-none w-full ml-auto">
                    {/* Signup / Login Toggle Buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button
                            type="button"
                            onClick={() => router.push("/register")}
                            className="w-full bg-white border border-gray-300 text-gray-600 font-bold tracking-wider uppercase rounded-xl py-2.5 text-xs hover:bg-gray-50 transition-all duration-200"
                        >
                            Signup
                        </button>
                        <button
                            type="button"
                            disabled
                            className="w-full bg-[#E23434] text-white font-bold tracking-wider uppercase rounded-xl py-2.5 text-xs shadow-md shadow-red-500/10 cursor-default"
                        >
                            Login
                        </button>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-900 tracking-wide">Welcome Back</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Sign in to manage your account</p>
                    </div>

                    {errorMessage && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
                            ⚠️ {errorMessage}
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-xl text-xs font-medium">
                            🎉 {successMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4.5">
                        <div className="mb-4">
                            <label htmlFor="userId" className={labelStyles}>
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

                        <div className="mb-4">
                            <label htmlFor="password" className={labelStyles}>
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

                        <div className="flex items-center justify-between pt-0.5 mb-4">
                            <div className="flex items-center gap-2.5">
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                    className="w-3.5 h-3.5 rounded accent-[#E23434] border-gray-300 bg-[#f8fafc] cursor-pointer"
                                />
                                <label htmlFor="rememberMe" className="text-[11px] text-gray-500 font-medium cursor-pointer select-none">
                                    Remember me
                                </label>
                            </div>
                            <a href="#" className="text-[11px] text-red-500 font-semibold hover:underline transition-all">
                                Forgot Password?
                            </a>
                        </div>

                        <div className="pt-3">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#E23434] hover:bg-[#c82828] text-white font-bold tracking-wider uppercase rounded-xl py-3.5 text-xs transition-all duration-300 shadow-md shadow-red-500/10 disabled:opacity-75 flex items-center justify-center gap-2"
                            >
                                {isLoading ? "Verifying..." : "Sign In"}
                            </button>
                        </div>

                        <div className="text-center pt-2">
                            <p className="text-[11px] text-gray-500 font-medium">
                                Not a member yet?{" "}
                                <button
                                    type="button"
                                    onClick={() => router.push("/register")}
                                    className="text-red-500 hover:underline font-medium"
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