'use client';

import React, { useState } from 'react';
// Adjust the import paths according to your actual folder structure
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Define the structure for our document items
interface DocumentRowProps {
  icon: React.ReactNode;
  title: string;
  issuer: string;
  badgeText: string;
  badgeColorClass: string; 
  idLabel: string;
  onViewClick: () => void;
}

const DocumentRow: React.FC<DocumentRowProps> = ({
  icon,
  title,
  issuer,
  badgeText,
  badgeColorClass,
  idLabel,
  onViewClick,
}) => {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:border-gray-200 transition-colors duration-200">
      <div className="flex items-center space-x-4">
        {/* Icon Container */}
        <div className="p-3 bg-gray-50 rounded-xl text-gray-500">
          {icon}
        </div>
        
        {/* Document Details */}
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeColorClass}`}>
              {badgeText}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-medium">{issuer}</p>
          
          {/* Status and ID Row */}
          <div className="flex items-center space-x-2 mt-1">
            <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
              Active
            </span>
            <span className="text-[11px] font-mono font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {idLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div>
        <button
          onClick={onViewClick}
          className="inline-flex items-center space-x-1 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors duration-150"
        >
          <span>View Document</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default function LegalDocumentsPage() {
  // State variables to handle modal view structure
  const [selectedDocImage, setSelectedDocImage] = useState<string | null>(null);
  const [selectedDocTitle, setSelectedDocTitle] = useState<string>('');

  const openModal = (title: string, imagePath: string) => {
    setSelectedDocTitle(title);
    setSelectedDocImage(imagePath);
  };

  const closeModal = () => {
    setSelectedDocImage(null);
    setSelectedDocTitle('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFC]">
      {/* Navbar Component */}
      <Navbar />

      {/* Main Content Container - pt-24 added here to stop navbar overlap */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-4 pt-24 pb-12 md:pb-16">
        
        {/* Top Floating Status Badge */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center space-x-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold text-xs px-4 py-1.5 rounded-full">
            <span>★</span>
            <span>All documents verified & up to date</span>
          </div>
        </div>

        {/* Header Typography Section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Our Legal & Compliance Documents
          </h1>
          <p className="text-sm md:text-base text-gray-500 leading-relaxed font-normal">
            We believe in full transparency. Below are our official government-issued
            registrations, licenses, and certifications — so you know exactly who you're
            doing business with.
          </p>
        </div>

        {/* Legal Document Accordions Stack */}
        <div className="space-y-4">
          {/* Document 1 */}
          <DocumentRow
            title="USYAM REGISTRATION CERTIFICATE"
            issuer="Department of Commerce & Trade"
            badgeText="Government Issued"
            badgeColorClass="bg-blue-50 text-blue-600 border border-blue-100"
            idLabel="REG-2019-00482741"
            onViewClick={() => openModal("USYAM REGISTRATION CERTIFICATE", "/legalDocuments/rc-certificate.jpg")}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
              </svg>
            }
          />

          {/* Document 2 */}
          <DocumentRow
            title="TRADEMARK CERTIFICATE"
            issuer="Internal Revenue Service (IRS)"
            badgeText="Federal Verified"
            badgeColorClass="bg-sky-50 text-sky-600 border border-sky-100"
            idLabel="EIN: 47-3829104"
            onViewClick={() => openModal("TRADEMARK CERTIFICATE", "/legalDocuments/Registeration of Trademark.jpg")}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a2.25 2.25 0 003.182 0l5.174-5.173a2.25 2.25 0 000-3.181L12.15 3.66a2.25 2.25 0 00-1.591-.659zm1.742 4.75a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            }
          />

          {/* Document 3 */}
          <DocumentRow
            title="FOOD & DRUG CERTIFICATE"
            issuer="City Business Licensing Authority"
            badgeText="City Verified"
            badgeColorClass="bg-emerald-50 text-emerald-700 border border-emerald-100"
            idLabel="LIC-2023-BZ-88321"
            onViewClick={() => openModal("FOOD & DRUG CERTIFICATE", "/legalDocuments/Food & Drug Certificate.jpg")}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            }
          />

          {/* Document 4 */}
          <DocumentRow
            title="REGISTRATION CERTIFICATE"
            issuer="DigiCert Inc."
            badgeText="256-Bit Encrypted"
            badgeColorClass="bg-purple-50 text-purple-600 border border-purple-100"
            idLabel="CERT-SHA256-RSA4096"
            onViewClick={() => openModal("REGISTRATION CERTIFICATE", "/legalDocuments/Rejisteration_Certificate.jpg")}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            }
          />
        </div>
      </main>

      {/* Pop-up Modal View Overlay */}
      {selectedDocImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={closeModal}
        >
          {/* Changed max-w-2xl to max-w-4xl and max-h-[85vh] to max-h-[90vh] below */}
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the window content
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
              <h3 className="text-base font-bold text-slate-900">{selectedDocTitle}</h3>
              <button 
                onClick={closeModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Image Wrapper Container */}
            <div className="p-6 bg-gray-50 flex-grow overflow-y-auto flex items-center justify-center min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={selectedDocImage} 
                alt={selectedDocTitle} 
                className="max-w-full h-auto rounded-lg shadow-sm border border-gray-200/60"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer Component */}
      <Footer />
    </div>
  );
}