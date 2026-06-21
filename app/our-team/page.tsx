"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar"; 
import Footer from "@/components/Footer"; 

interface TeamMember {
  name: string;
  role: string;
  imageSrc: string;
  bgClass: string; 
}

const teamMembers: TeamMember[] = [
  {
    name: "Jagdeep Sir",
    role: "Raj Dhanvarsha",
    imageSrc: "/photos/jagdeep.png", 
    bgClass: "bg-[#E31E24]",
  },
  {
    name: "Kuldeep Kumar",
    role: "Raj Dhanvarsha",
    imageSrc: "/photos/kuldeep.png",
    bgClass: "bg-[#E31E24]",
  },
  {
    name: "Mahendra Sir",
    role: "Raj Dhanvarsha",
    imageSrc: "/photos/mahendra.png",
    bgClass: "bg-[#E31E24]",
  },
  {
    name: "Rupendra Sir",
    role: "Raj Dhanvarsha",
    imageSrc: "/photos/rupendra.png",
    bgClass: "bg-[#E31E24]",
  },
  {
    name: "Dharamveer Salwal",
    role: "Raj Dhanvarsha",
    imageSrc: "/photos/dharamveer.png",
    bgClass: "bg-[#E31E24]", 
  },
];

export default function OurTeamPage() {
  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      {/* 1. Global Navigation Bar */}
      <Navbar transparent={false} />

      {/* Main Content Area */}
      <main className="flex-grow">
        
        {/* Your Exact Requested Banner Block */}
        <section 
          className="relative bg-cover bg-center bg-no-repeat pt-36 pb-24 text-center"
          style={{ backgroundImage: `url('/photos/page-title.jpg')` }} 
        >
          {/* Dark Overlay to maintain text readability */}
          <div className="absolute inset-0 bg-slate-950/70 mix-blend-multiply"></div>

          {/* Content Container */}
          <div className="container mx-auto px-4 relative z-10">
            <h1 className="text-5xl font-bold mb-4 text-white tracking-wide">About Us</h1>
            <p className="text-sm text-gray-300 font-medium flex justify-center items-center gap-2">
              <Link href="/" className="hover:text-white transition-colors no-underline text-gray-300">Home</Link> 
              <span className="text-gray-500">&gt;</span> 
              <span className="text-gray-200">Our Team</span>
            </p>
          </div>
        </section>

        {/* Main Team Profiles Grid Container */}
        <div className="container mx-auto px-4 md:px-6 max-w-5xl mt-16 text-center pb-24">
          
          {/* Decorative Top Branding Badge */}
          <div className="inline-block border-2 border-green-600 rounded-full px-5 py-0.5 mb-6">
            <span className="text-xs font-bold text-green-600 tracking-wider uppercase">
              Raj Dhanvarsha
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight max-w-2xl mx-auto leading-tight">
            The Real Success Counselling Member By RDM Business
          </h2>
          
          <p className="text-xs md:text-sm text-gray-500 max-w-xl mx-auto mt-4 leading-relaxed">
            Share tips on how to effectively market products through social media, networking events, or personal contacts.
          </p>

          {/* Team Profile Responsive Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12 max-w-4xl mx-auto px-4">
            {teamMembers.map((member, index) => (
              <div 
                key={index} 
                className="flex flex-col bg-white rounded-b-lg overflow-hidden shadow-md border border-gray-100"
              >
                {/* Image Container Box with fixed height for Next.js sizing layout */}
                <div className={`relative w-full h-80 ${member.bgClass} flex items-end justify-center overflow-hidden`}>
                  <Image
                    src={member.imageSrc}
                    alt={member.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={index < 3}
                    className="object-contain object-bottom select-none pointer-events-none transition-transform duration-300 hover:scale-[1.02]"
                  />
                </div>

                {/* Team Info Text Box Labels */}
                <div className="w-full bg-[#E5E2D5] py-4 px-2 border-t border-gray-200 text-center">
                  <h3 className="text-base font-bold text-gray-900 tracking-wide">
                    {member.name}
                  </h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 2. Your Project Default Components Saved Footer */}
      <Footer />
    </div>
  );
}