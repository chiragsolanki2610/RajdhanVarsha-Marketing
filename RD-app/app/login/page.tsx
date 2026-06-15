"use client";

import { useState } from "react";

export default function LoginPage() {
    const [formData, setFormData] = useState({
        userId: "",
        password: "",
        rememberMe: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Login Data Submitted:", formData);
    };

    // Exactly matches the premium styling from your registration page
    const inputStyles =
        "w-full px-4 py-3 border border-gray-300 rounded-xl bg-[#f8fafc] text-gray-800 placeholder-gray-400 outline-none focus:border-[#E23434]/60 focus:ring-1 focus:ring-[#E23434]/20 transition-all font-normal text-sm shadow-sm";
    const labelStyles =
        "block text-gray-600 font-bold text-[10px] mb-1.5 tracking-wider uppercase";

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 md:p-12 relative overflow-hidden font-sans selection:bg-red-500/10">

            {/* Soft Background Accent Rings matching your brand design */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[700px] h-[700px] border border-gray-100 rounded-full pointer-events-none hidden lg:block" />
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[450px] h-[450px] border border-gray-100 rounded-full pointer-events-none hidden lg:block" />

            <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">

                {/* Left Side: Hero Brand Column */}
                <div className="lg:col-span-5 space-y-7 pl-0 lg:pl-8 text-center flex flex-col items-center justify-center lg:pt-8 self-start">

                    {/* Circular Logo wrapper */}
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

                    {/* Typography matching Registration Page */}
                    <div className="flex flex-wrap justify-center items-baseline gap-2 mb-2 font-bold text-3xl">
                        <span className="text-red-500">RAJ</span>
                        <span className="text-blue-800">DHANVARSHA</span>
                        <span className="text-red-500">MARKETING</span>
                    </div>

                    {/* Slogan Pitch */}
                    <div className="space-y-3 flex flex-col items-center">
                        <p className="text-gray-500 text-xs md:text-sm max-w-sm leading-relaxed font-normal pt-1">
                            Start earning with India's fastest-growing wellness marketing brand.
                        </p>
                    </div>

                    {/* Feature Lists */}
                    <ul className="space-y-3 text-xs text-gray-600 font-medium text-left self-center">
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full border border-red-500/20 flex items-center justify-center text-[9px] text-[#E23434] bg-red-50">
                                ✓
                            </span>
                            Premium healthcare & wellness products
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full border border-red-500/20 flex items-center justify-center text-[9px] text-[#E23434] bg-red-50">
                                ✓
                            </span>
                            Retail margins up to 20%
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full border border-red-500/20 flex items-center justify-center text-[9px] text-[#E23434] bg-red-50">
                                ✓
                            </span>
                            Direct referral commissions
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full border border-red-500/20 flex items-center justify-center text-[9px] text-[#E23434] bg-red-50">
                                ✓
                            </span>
                            Business training & digital tools
                        </li>
                    </ul>
                </div>

                {/* Right Side: Account Login Card Panel */}
                <div className="lg:col-span-7 bg-white p-6 md:p-9 rounded-2xl border border-gray-100 shadow-xl max-w-xl lg:max-w-none w-full ml-auto">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-900 tracking-wide">
                            Welcome Back
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Sign in to manage your account
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* User ID Field */}
                        <div>
                            <label htmlFor="userId" className={labelStyles}>User ID</label>
                            <input
                                type="text"
                                id="userId"
                                name="userId"
                                placeholder="Enter your User ID"
                                value={formData.userId}
                                onChange={handleChange}
                                className={inputStyles}
                                required
                            />
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className={labelStyles}>Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={inputStyles}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs select-none"
                                >
                                    👁
                                </button>
                            </div>
                        </div>

                        {/* Remember Me & Forgot Password Layout */}
                        <div className="flex items-center justify-between pt-0.5">
                            <div className="flex items-start gap-2.5">
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                    className="mt-0.5 w-3.5 h-3.5 rounded accent-[#E23434] border-gray-300 bg-[#f8fafc] cursor-pointer"
                                />
                                <label htmlFor="rememberMe" className="text-[11px] text-gray-500 font-medium leading-tight cursor-pointer select-none">
                                    Remember me
                                </label>
                            </div>
                            
                            <a href="#" className="text-[11px] text-red-500 font-medium hover:underline">
                                Forgot Password?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                className="w-full bg-[#E23434] hover:bg-[#c82828] text-white font-bold tracking-wider uppercase rounded-xl py-3.5 text-xs transition-all duration-300 shadow-md shadow-red-500/10"
                            >
                                Sign In
                            </button>
                        </div>

                        {/* Registration Redirection Footer */}
                        <div className="text-center pt-2">
                            <p className="text-[11px] text-gray-500 font-medium">
                                Not a member yet?{" "}
                                <a href="/register" className="text-red-500 hover:underline">Register here</a>
                            </p>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}