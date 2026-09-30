import React from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar'; 
import Footer from '@/components/Footer'; 

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* Navbar Component */}
      <Navbar transparent={false} />

      {/* Hero Banner with Background Image */}
      <section 
        className="relative bg-cover bg-center bg-no-repeat pt-36 pb-24 text-center"
        style={{ backgroundImage: `url('/photos/page-title.jpg')` }} // Replace with your actual background image path
      >
        {/* Dark Overlay to maintain text readability */}
        <div className="absolute inset-0 bg-slate-950/70 mix-blend-multiply"></div>

        {/* Content Container */}
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-5xl font-bold mb-4 text-white tracking-wide">About Us</h1>
          <p className="text-sm text-gray-300 font-medium flex justify-center items-center gap-2">
            <span>Home</span> 
            <span className="text-gray-500">&gt;</span> 
            <span className="text-gray-200">Overview</span>
          </p>
        </div>
      </section>

      {/* Main Profiles Content */}
      <main className="container mx-auto px-4 py-16 max-w-6xl space-y-24">
        
        {/* Profile 1: MD & CEO */}
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="w-full lg:w-2/5 flex justify-center">
            <div className="relative aspect-[4/5] w-full rounded-lg overflow-hidden bg-gray-200 shadow-lg">
              <Image 
                src="/photos/md.jpg" 
                alt="Mr. Rajkumar Solanki" 
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
          <div className="w-full lg:w-3/5 space-y-4">
            {/* Custom Speech-bubble styled tag matching the screenshot */}
            <span className="inline-block border border-green-600 text-green-700 px-4 py-1 rounded-full rounded-br-none text-xs font-bold tracking-wide shadow-sm">
              ABOUT US
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight">
              <span className="text-[#E31E24]">RAJ</span> <span className="text-[#2E4CA2]">DHANVARSHA</span>
            </h2>
            <p className="text-gray-600 leading-relaxed text-justify">
              At Raj Dhanvarsha, Our mission is to create a platform that fosters personal growth, financial independence, and a sense of community. We believe in the power of entrepreneurship and are committed to providing our partners with the tools and support they need to succeed. Our mission is not just about selling products; it's about building a legacy of success and making a positive impact on the lives of our partners and customers.
            </p>
            <p className="text-gray-600 leading-relaxed text-justify">
              Our platform is designed to reward hard work and dedication, allowing you to build your own business and achieve your goals on your terms. With comprehensive training programs, innovative tools, and a supportive community.
            </p>
            <h4 className="text-yellow-600 font-bold text-lg pt-4">Mr. Rajkumar Solanki MD & CEO</h4>
          </div>
        </div>

        {/* Profile 2: Advisor & National Promoter */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
          <div className="w-full lg:w-2/5 flex justify-center">
            <div className="relative aspect-[4/5] w-full max-w-sm rounded-lg overflow-hidden shadow-xl bg-gray-200">
              <Image 
                src="/photos/rupender_home.jpg" 
                alt="Mr. Rupendra Kumar Banjare" 
                fill
                className="object-cover"
                />
            </div>
          </div>
          <div className="w-full lg:w-3/5 space-y-4">
            <span className="inline-block border border-green-600 text-green-700 px-4 py-1 rounded-full rounded-br-none text-xs font-bold tracking-wide shadow-sm">
              RUPENDRA KUMAR
            </span>
            <h2 className="text-2xl lg:text-3xl font-bold text-[#E31E24] tracking-tight leading-tight uppercase">
              Advisor & National Promoter by RDM Business
            </h2>
            <p className="text-gray-600 leading-relaxed text-justify">
              In a business context, an "Advisor & National Promoter" refers to a person or entity who provides guidance and support to a company while also actively promoting its interests on a national level. This role often involves strategic planning, market expansion, and building relationships with key stakeholders.
            </p>
            
            <ul className="space-y-3 pt-2 text-gray-600">
              <li className="text-sm">
                <strong className="text-gray-800 block md:inline">Guidance and Expertise: </strong> 
                Provides expert advice on various aspects of the business, including strategy, finance, operations, and marketing.
              </li>
              <li className="text-sm">
                <strong className="text-gray-800 block md:inline">Problem-solving: </strong> 
                Helies identify and address challenges, offering solutions and recommendations.
              </li>
              <li className="text-sm">
                <strong className="text-gray-800 block md:inline">Networking: </strong> 
                Connects the company with valuable resources, including investors, potential partners, and industry experts.
              </li>
            </ul>
            <h4 className="text-yellow-600 font-bold text-lg pt-4">Mr. Rupendra Kumar Banjare</h4>
          </div>
        </div>

      </main>

      {/* Reusable Footer Component */}
      <Footer />

    </div>
  );
}