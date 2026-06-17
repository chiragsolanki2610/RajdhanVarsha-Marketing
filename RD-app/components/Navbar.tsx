"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface NavbarProps {
  transparent?: boolean;
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aboutDropdownOpen, setAboutDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAboutDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Intercepts click if already on home page to provide smooth scrolling
  const handleScrollLink = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    setMobileOpen(false);
    setAboutDropdownOpen(false);
    
    if (pathname === "/") {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const isOpaque = !transparent || isScrolled;

  const linkStyles = `text-sm font-semibold transition-all duration-300 px-4 py-2 rounded-full select-none border tracking-wide hover:scale-105 active:scale-98 flex items-center gap-1 ${
    isOpaque 
      ? "text-gray-600 border-transparent hover:text-[#2E4CA2] hover:bg-blue-50/60 hover:border-blue-200/50 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_12px_rgba(46,76,162,0.05)] hover:backdrop-blur-sm" 
      : "text-white/90 border-transparent hover:text-white hover:bg-white/[0.18] hover:border-white/30 hover:backdrop-blur-lg hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),0_8px_20px_rgba(0,0,0,0.15)]"
  }`;

  const dropdownItemStyles = `
    block text-center lg:text-left w-full px-5 py-3 text-sm font-semibold text-gray-800 transition-all duration-300 
    rounded-xl border border-transparent select-none overflow-hidden no-underline
    hover:text-cyan-950 hover:scale-[1.02] hover:border-white/40
    hover:bg-[linear-gradient(135deg,rgba(0,210,255,0.25)0%,rgba(0,210,255,0.08)40%,rgba(0,210,255,0)100%),linear-gradient(to_bottom,rgba(255,255,255,0.8),rgba(255,255,255,0.3))]
    hover:shadow-[inset_0_1px_3px_rgba(255,255,255,0.9),_0_4px_16px_-2px_rgba(0,210,255,0.3),_0_2px_6px_-1px_rgba(0,210,255,0.1)]
  `;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        /* Mobile/Tablet forces white background per image; Desktop preserves transparent/opaque scroll configurations */
        isOpaque
          ? "bg-white/95 backdrop-blur-md shadow-sm py-4 border-b border-gray-200/50"
          : "bg-white md:bg-transparent py-4 md:py-6 border-b border-gray-100 md:border-none"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 md:gap-3 no-underline group">
          <Image
            src="/photos/web_logo.png"
            alt="Raj Dhan Varsha logo"
            width={44}
            height={44}
            className="rounded-md object-cover transition-transform duration-500 group-hover:scale-105 shadow-sm md:w-[48px] md:h-[48px]"
          />
          <div className="flex flex-col justify-center leading-none">
            <div className="text-lg md:text-2xl font-black tracking-tight select-none">
              <span className="text-[#E31E24]">RAJ</span>
              {/* "DHANVARSHA" color locked cleanly to your brand blue color */}
              <span className="text-[#2E4CA2]">
                DHANVARSHA
              </span>
            </div>
            <span className="text-[9px] md:text-[11px] font-extrabold tracking-widest text-[#E31E24] text-left mt-0.5">
              MARKETING
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          <Link href="/#home" onClick={(e) => handleScrollLink(e, "home")} className={linkStyles}>
            Home
          </Link>
          
          {/* About Us Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setAboutDropdownOpen(!aboutDropdownOpen)} 
              className={`${linkStyles} ${aboutDropdownOpen ? (isOpaque ? "text-[#2E4CA2] bg-blue-50/60 border-blue-200/50" : "text-white bg-white/[0.18] border-white/30") : ""}`}
            >
              About Us
              <ChevronDown size={14} className={`transition-transform duration-200 ${aboutDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Liquid Glass Dropdown */}
            {aboutDropdownOpen && (
              <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 transform origin-top transition-all duration-300 animation-liquid-pop z-50
                border rounded-2xl p-1.5 flex flex-col gap-1 overflow-hidden
                ${isOpaque 
                  ? "bg-white border-gray-200 shadow-xl" 
                  : "bg-white/20 backdrop-blur-xl border-white/40 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.6),_0_12px_24px_rgba(0,0,0,0.15)]"
                }`}
              >
                <Link
                  href="/overview"
                  onClick={() => setAboutDropdownOpen(false)}
                  className={dropdownItemStyles}
                >
                  Overview
                </Link>
                
                {/* Redirecting to Our Team page */}
                <Link
                  href="/our-team"
                  onClick={() => setAboutDropdownOpen(false)}
                  className={dropdownItemStyles}
                >
                  Our Team
                </Link>
                
                {/* Clean redirection to Legal Documents page */}
                <Link
                  href="/legal-documents" 
                  onClick={() => setAboutDropdownOpen(false)}
                  className={dropdownItemStyles}
                >
                  Legal Documents
                </Link>
              </div>
            )}
          </div>
          
          <Link href="/our-plan" className={linkStyles}>
            Our Plan
          </Link>
          
          <Link href="/products" className={linkStyles}>
            Products
          </Link>
          
          {/* Desktop Redirect to Delivery Center */}
          <Link href="/delivery-center" className={linkStyles}>
            Delivery Center
          </Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex">
          <Link
            href="/register"
            className="bg-[#2E4CA2] hover:bg-[#1E3573] text-white font-semibold rounded-full px-6 py-2.5 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 active:translate-y-0 no-underline"
          >
            Join Now
          </Link>
        </div>

        {/* Custom Hamburger Matching Image Look */}
        <button
          className="md:hidden flex flex-col items-end justify-center gap-1.5 w-8 h-8 p-1 focus:outline-none group z-50"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span 
            className={`h-[2px] bg-slate-800 rounded-full transition-all duration-300 origin-center ${
              mobileOpen ? "w-6 rotate-45 translate-y-[8px]" : "w-6"
            }`} 
          />
          <span 
            className={`h-[2px] bg-slate-800 rounded-full transition-all duration-300 ${
              mobileOpen ? "w-0 opacity-0" : "w-5"
            }`} 
          />
          <span 
            className={`h-[2px] bg-slate-800 rounded-full transition-all duration-300 origin-center ${
              mobileOpen ? "w-6 -rotate-45 -translate-y-[8px]" : "w-4"
            }`} 
          />
        </button>
      </div>

      {/* Mobile menu wrapper */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-xl py-4 px-4 flex flex-col gap-2 animate-fadeIn">
          <Link
            href="/#home"
            onClick={(e) => handleScrollLink(e, "home")}
            className="text-left text-sm font-semibold p-2.5 hover:bg-gray-50 active:bg-gray-100 rounded-lg text-gray-800 transition-colors no-underline"
          >
            Home
          </Link>
          
          <div className="flex flex-col border-l-2 border-gray-100 ml-2 pl-2">
            <span className="text-left text-xs font-bold uppercase tracking-wider p-2 text-gray-400">
              About Us
            </span>
            <Link
              href="/overview"
              onClick={() => setMobileOpen(false)}
              className="text-left text-sm font-medium p-2 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors no-underline"
            >
              Overview
            </Link>
            {/* Mobile Redirect to Our Team page */}
            <Link
              href="/our-team"
              onClick={() => setMobileOpen(false)}
              className="text-left text-sm font-medium p-2 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors no-underline"
            >
              Our Team
            </Link>
            {/* Mobile Redirect to Legal Documents page */}
            <Link
              href="/legal-documents"
              onClick={() => setMobileOpen(false)}
              className="text-left text-sm font-medium p-2 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors no-underline"
            >
              Legal Documents
            </Link>
          </div>

          <Link
            href="/our-plan"
            onClick={() => setMobileOpen(false)}
            className="text-left text-sm font-semibold p-2.5 hover:bg-gray-50 active:bg-gray-100 rounded-lg text-gray-800 transition-colors no-underline"
          >
            Our Plan
          </Link>
          
          <Link
            href="/products"
            onClick={() => setMobileOpen(false)}
            className="text-left text-sm font-semibold p-2.5 hover:bg-gray-50 rounded-lg block text-gray-800 transition-colors no-underline"
          >
            Products
          </Link>

          {/* Mobile Redirect to Delivery Center page */}
          <Link
            href="/delivery-center"
            onClick={() => setMobileOpen(false)}
            className="text-left text-sm font-semibold p-2.5 hover:bg-gray-50 rounded-lg block text-gray-800 transition-colors no-underline"
          >
            Delivery Center
          </Link>
          
          {/* Mobile Redirect to Join Now / Register page */}
          <Link
            href="/register"
            onClick={() => setMobileOpen(false)}
            className="mt-2 w-full bg-[#2E4CA2] hover:bg-[#1E3573] text-white font-semibold rounded-full py-3 text-sm transition-colors text-center no-underline"
          >
            Join Now
          </Link>
        </div>
      )}
    </header>
  );
}