"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface TeamMember {
  name: string;
  role: string;
  description: string;
  imageSrc: string;
  bgClass: string;
  featured?: boolean;
}

const teamMembers: TeamMember[] = [
  {
    name: "Mr. Rajkumar Solanki",
    role: "MD & CEO",
    description:
      "A visionary leader at the helm of RDM Business, Mr. Rajkumar Solanki drives the company's mission to empower individuals with true financial independence. With deep experience in business strategy and leadership, he inspires the entire team to create lasting, meaningful impact across the nation.",
    imageSrc: "/team/rajkumar.jpeg",
    bgClass: "bg-white",
    featured: true,
  },
  {
    name: "Mr. Rupendra Kumar Banjare",
    role: "Advisor & National Promoter By RDM Business",
    description:
      "Drives national outreach and advisory efforts for RDM Business, building a trusted network of partners and promoters across the country to expand the mission of financial independence.",
    imageSrc: "/team/rupendra.png",
    bgClass: "bg-white",
  },
  {
    name: "Mr. Kuldeep Kumar",
    role: "Quality Product Research Executive",
    description:
      "Leads in-depth product research to ensure every offering from RDM Business meets the highest standards of quality, effectiveness, and value for members.",
    imageSrc: "/team/kuldeep.png",
    bgClass: "bg-white",
  },
  {
    name: "Jagdeep Sir",
    role: "Trainer & Motivational Speaker",
    description:
      "Inspires and trains members with powerful motivational sessions and practical business guidance, helping individuals unlock their full potential on the path to success.",
    imageSrc: "/team/jagdeep.png",
    bgClass: "bg-white",
  },
];

export default function OurTeamPage() {
  const featuredMember = teamMembers.find((m) => m.featured) ?? teamMembers[0];
  const restMembers = teamMembers.filter((m) => m !== featuredMember);

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      {/* 1. Global Navigation Bar */}
      <Navbar transparent={false} />

      {/* Main Content Area */}
      <main className="flex-grow">
        {/* Page Title Banner */}
        <section
          className="relative bg-cover bg-center bg-no-repeat pt-36 pb-24 text-center"
          style={{ backgroundImage: `url('/photos/page-title.jpg')` }}
        >
          <div className="absolute inset-0 bg-slate-950/70 mix-blend-multiply"></div>

          <div className="container mx-auto px-4 relative z-10">
            <h1 className="text-5xl font-bold mb-4 text-white tracking-wide">About Us</h1>
            <p className="text-sm text-gray-300 font-medium flex justify-center items-center gap-2">
              <Link href="/" className="hover:text-white transition-colors no-underline text-gray-300">
                Home
              </Link>
              <span className="text-gray-500">&gt;</span>
              <span className="text-gray-200">Our Team</span>
            </p>
          </div>
        </section>

        {/* Section Intro */}
        <div className="container mx-auto px-4 md:px-6 max-w-5xl mt-16 text-center">
          <div className="inline-block border-2 border-green-600 rounded-full px-5 py-0.5 mb-6">
            <span className="text-xs font-bold text-green-600 tracking-wider uppercase">
              Raj Dhanvarsha
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight max-w-2xl mx-auto leading-tight">
            Founders and CEO
          </h2>

          <p className="text-xs md:text-sm text-gray-500 max-w-xl mx-auto mt-4 leading-relaxed">
            Share tips on how to effectively market products through social media, networking events, or personal contacts.
          </p>
        </div>

        {/* Featured Leader Card */}
        <div className="container mx-auto px-4 md:px-6 max-w-5xl mt-14">
          <div className="flex flex-col md:flex-row items-stretch bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div
              className={`relative w-full md:w-1/2 h-96 md:h-[480px] ${featuredMember.bgClass} border-r border-gray-100 flex items-end justify-center overflow-hidden`}
            >
              <Image
                src={featuredMember.imageSrc}
                alt={featuredMember.name}
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                priority
                className="object-contain object-bottom select-none pointer-events-none"
              />
            </div>

            <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                {featuredMember.name}
              </h3>
              <p className="text-sm font-semibold text-[#E31E24] mt-1 uppercase tracking-wide">
                {featuredMember.role}
              </p>
              <div className="w-12 h-0.5 bg-gray-200 my-4"></div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {featuredMember.description}
              </p>
              <Link
                href="#"
                className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-green-600 uppercase tracking-wider hover:text-green-700 transition-colors no-underline"
              >
                Read Full Story <span aria-hidden="true">&rsaquo;</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Core Leadership Section */}
        <div className="container mx-auto px-4 md:px-6 max-w-5xl mt-20 pb-24">
          <div className="text-left mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              Core Leadership
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-2">
              The experts executing the vision.
            </p>
          </div>

          {/* Team Profile Responsive Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {restMembers.map((member, index) => (
              <div
                key={index}
                className="flex flex-col h-full bg-white rounded-lg overflow-hidden shadow-md border border-gray-100"
              >
                <div
                  className={`relative w-full h-80 ${member.bgClass} border-b border-gray-100 flex items-end justify-center overflow-hidden`}
                >
                  <Image
                    src={member.imageSrc}
                    alt={member.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-contain object-bottom select-none pointer-events-none transition-transform duration-300 hover:scale-[1.02]"
                  />
                </div>

                <div className="w-full flex-1 bg-[#E5E2D5] py-4 px-4 border-t border-gray-200 text-left">
                  <h3 className="text-base font-bold text-gray-900 tracking-wide">
                    {member.name}
                  </h3>
                  <p className="text-xs font-medium text-[#E31E24] mt-0.5 uppercase tracking-wide">
                    {member.role}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    {member.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 2. Footer */}
      <Footer />
    </div>
  );
}