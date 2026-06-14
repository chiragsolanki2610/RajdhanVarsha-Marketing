"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";

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
        isOpaque
          ? "bg-white/95 backdrop-blur-md shadow-sm py-4 border-b border-gray-200/50"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 no-underline group">
          <Image
            src="/photos/web_logo.png"
            alt="Raj Dhan Varsha logo"
            width={48}
            height={48}
            className="rounded-md object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="flex flex-col justify-center leading-none">
            <div className="text-xl md:text-2xl font-black tracking-tight select-none">
              <span className="text-[#E31E24]">RAJ</span>
              <span className={`transition-colors duration-300 ${isOpaque ? "text-[#2E4CA2]" : "text-white md:text-[#2E4CA2]"}`}>DHANVARSHA</span>
            </div>
            <span className="text-[10px] md:text-[11px] font-extrabold tracking-widest text-[#E31E24] text-right mt-0.5">
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
                
                <Link
                  href="/#about"
                  onClick={(e) => { setAboutDropdownOpen(false); handleScrollLink(e, "about"); }}
                  className={dropdownItemStyles}
                >
                  Our Team
                </Link>
                
                <Link
                  href="/#about" 
                  onClick={(e) => { setAboutDropdownOpen(false); handleScrollLink(e, "about"); }}
                  className={dropdownItemStyles}
                >
                  Legal Documents
                </Link>
              </div>
            )}
          </div>
          
          <Link href="/#plan" onClick={(e) => handleScrollLink(e, "plan")} className={linkStyles}>
            Our Plan
          </Link>
          
          <Link href="/products" className={linkStyles}>
            Products
          </Link>
          
          <Link href="/#contact" onClick={(e) => handleScrollLink(e, "contact")} className={linkStyles}>
            Contact
          </Link>
        </nav>

        {/* CTA */}
        <div className="hidden md:flex">
          <Link
            href="/#contact"
            onClick={(e) => handleScrollLink(e, "contact")}
            className="bg-[#2E4CA2] hover:bg-[#1E3573] text-white font-semibold rounded-full px-6 py-2.5 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 active:translate-y-0 no-underline"
          >
            Join Now
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className={`md:hidden p-2 transition-colors ${isOpaque ? "text-gray-700" : "text-white"}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg py-4 px-4 flex flex-col gap-2">
          <Link
            href="/#home"
            onClick={(e) => handleScrollLink(e, "home")}
            className="text-left text-sm font-medium p-2.5 hover:bg-gray-50 active:bg-gray-100 rounded-lg text-gray-800 transition-colors no-underline"
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
            <Link
              href="/#about"
              onClick={(e) => handleScrollLink(e, "about")}
              className="text-left text-sm font-medium p-2 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors no-underline"
            >
              Our Team
            </Link>
            <Link
              href="/#about"
              onClick={(e) => handleScrollLink(e, "about")}
              className="text-left text-sm font-medium p-2 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors no-underline"
            >
              Legal Documents
            </Link>
          </div>

          <Link
            href="/#plan"
            onClick={(e) => handleScrollLink(e, "plan")}
            className="text-left text-sm font-medium p-2.5 hover:bg-gray-50 active:bg-gray-100 rounded-lg text-gray-800 transition-colors no-underline"
          >
            Our Plan
          </Link>
          
          <Link
            href="/products"
            onClick={() => setMobileOpen(false)}
            className="text-left text-sm font-medium p-2.5 hover:bg-gray-50 rounded-lg block text-gray-800 transition-colors no-underline"
          >
            Products
          </Link>

          <Link
            href="/#contact"
            onClick={(e) => handleScrollLink(e, "contact")}
            className="text-left text-sm font-medium p-2.5 hover:bg-gray-50 active:bg-gray-100 rounded-lg text-gray-800 transition-colors no-underline"
          >
            Contact
          </Link>
          
          <Link
            href="/#contact"
            onClick={(e) => handleScrollLink(e, "contact")}
            className="mt-2 w-full bg-[#2E4CA2] hover:bg-[#1E3573] text-white font-semibold rounded-full py-3 text-sm transition-colors text-center no-underline"
          >
            Join Now
          </Link>
        </div>
      )}
    </header>
  );
}