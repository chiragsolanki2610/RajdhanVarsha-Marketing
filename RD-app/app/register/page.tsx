"use client";

import { useState } from "react";

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        name: "",
        mobile: "",
        aadhar: "",
        sponsorId: "",
        sponsorName: "",
        position: "",
        underUserId: "",
        address: "",
        password: "",
        confirmPassword: "",
        agreeToTerms: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;

        if (type === "checkbox") {
            const target = e.target as HTMLInputElement;
            setFormData((prev) => ({ ...prev, [name]: target.checked }));
        } else {
            // Input masking logic for non-checkbox text/number fields
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Registration Data Submitted:", formData);
    };

    // Styled for premium clean light-mode inputs
    const inputStyles =
        "w-full px-4 py-3 border border-gray-300 rounded-xl bg-[#f8fafc] text-gray-800 placeholder-gray-400 outline-none focus:border-[#E23434]/60 focus:ring-1 focus:ring-[#E23434]/20 transition-all font-normal text-sm shadow-sm";
    const labelStyles =
        "block text-gray-600 font-bold text-[10px] mb-1.5 tracking-wider uppercase";

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 md:p-12 relative overflow-hidden font-sans selection:bg-red-500/10">

            {/* Soft Background Accent Rings for Light Theme */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[700px] h-[700px] border border-gray-100 rounded-full pointer-events-none hidden lg:block" />
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[450px] h-[450px] border border-gray-100 rounded-full pointer-events-none hidden lg:block" />

            <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative z-10">

                {/* Left Side: Hero Brand Column (Shifted upside using lg:justify-start and lg:pt-8) */}
                <div className="lg:col-span-5 space-y-7 pl-0 lg:pl-8 text-center flex flex-col items-center justify-center lg:justify-start lg:pt-8 self-start">

                    {/* Circular Logo */}
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

                    {/* Cleaner Alternative */}
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

                {/* Right Side: Account Registration Card Panel */}
                <div className="lg:col-span-7 bg-white p-6 md:p-9 rounded-2xl border border-gray-100 shadow-xl max-w-xl lg:max-w-none w-full ml-auto">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-900 tracking-wide">
                            Create Account
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Fill in your details to register
                        </p>
                    </div>

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
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="mobile" className={labelStyles}>Mobile No</label>
                                <input
                                    type="tel"
                                    id="mobile"
                                    name="mobile"
                                    placeholder="9876543210"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    className={inputStyles}
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
                                    className={inputStyles}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="sponsorName" className={labelStyles}>Sponsor ID Name</label>
                                <input
                                    type="text"
                                    id="sponsorName"
                                    name="sponsorName"
                                    placeholder="Sponsor name"
                                    value={formData.sponsorName}
                                    onChange={handleChange}
                                    className={inputStyles}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="position" className={labelStyles}>Your Position</label>
                                <div className="relative">
                                    <select
                                        id="position"
                                        name="position"
                                        value={formData.position}
                                        onChange={handleChange}
                                        className={`${inputStyles} appearance-none cursor-pointer pr-10 text-gray-800`}
                                        required
                                    >
                                        <option value="" disabled className="bg-white text-gray-400">Select Position</option>
                                        <option value="left" className="bg-white">LEFT</option>
                                        <option value="right" className="bg-white">RIGHT</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
                                        ▼
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="underUserId" className={labelStyles}>Under User ID</label>
                                <input
                                    type="text"
                                    id="underUserId"
                                    name="underUserId"
                                    placeholder="User ID"
                                    value={formData.underUserId}
                                    onChange={handleChange}
                                    className={inputStyles}
                                    required
                                />
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
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                            {/* <div>
                                <label htmlFor="password" className={labelStyles}>Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        name="password"
                                        placeholder="Min 8 chars"
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
                            </div> */}

                            {/* <div>
                                <label htmlFor="confirmPassword" className={labelStyles}>Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        placeholder="Re-enter"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className={inputStyles}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs select-none"
                                    >
                                        👁
                                    </button>
                                </div>
                            </div> */}
                        </div>

                        <div className="flex items-start gap-2.5 pt-0.5">
                            <input
                                type="checkbox"
                                id="agreeToTerms"
                                name="agreeToTerms"
                                checked={formData.agreeToTerms}
                                onChange={handleChange}
                                className="mt-0.5 w-3.5 h-3.5 rounded accent-[#E23434] border-gray-300 bg-[#f8fafc] cursor-pointer"
                                required
                            />
                            <label htmlFor="agreeToTerms" className="text-[11px] text-gray-500 font-medium leading-tight cursor-pointer select-none">
                                I agree to the{" "}
                                <a href="#" className="text-red-500 hover:underline">Terms of Service</a> &{" "}
                                <a href="#" className="text-red-500 hover:underline">Privacy Policy</a>
                            </label>
                        </div>

                        <div className="pt-3">
                            <button
                                type="submit"
                                className="w-full bg-[#E23434] hover:bg-[#c82828] text-white font-bold tracking-wider uppercase rounded-xl py-3.5 text-xs transition-all duration-300 shadow-md shadow-red-500/10"
                            >
                                Create Account
                            </button>
                        </div>

                        <div className="text-center pt-2">
                            <p className="text-[11px] text-gray-500 font-medium">
                                Already a member?{" "}
                                <a href="/login" className="text-red-500 hover:underline">Sign in</a>
                            </p>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}