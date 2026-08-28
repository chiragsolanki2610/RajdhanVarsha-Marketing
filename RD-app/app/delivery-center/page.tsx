import React from 'react';
// Import your actual default Navbar and Footer components
import Navbar from '@/components/Navbar'; // Adjust the import path if your file names or structures are different
import Footer from '@/components/Footer';

// Data structure for the Delivery Centers
interface DeliveryCenter {
  id: number;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  cityState: string;
  mobile: string[];
}

const deliveryCenters: DeliveryCenter[] = [
  {
    id: 1,
    name: "TANU RDM PICKUP CENTER",
    addressLine1: "ZONE -1 KHURSIPAR",
    addressLine2: "POWER HOUSE BHILAI",
    cityState: "CHHATTISGARH",
    mobile: ["9770542122", "7693052122"]
  },
  {
    id: 2,
    name: "DISHA RDM PICKUP CENTER",
    addressLine1: "BAIKUNTH DHAM",
    addressLine2: "CAMP- 2 BHILAI",
    cityState: "CHHATTISGARH",
    mobile: ["9300441542", "7049523736"]
  },
  {
    id: 3,
    name: "PRERNA RDM PICKUP CENTRE",
    addressLine1: "VILLAGE SEMAN",
    addressLine2: "TEHSIL MEHAM DISTRIC",
    cityState: "ROHTAK",
    mobile: ["9050760814"]
  },
  {
    id: 4,
    name: "IDHIKA RDM PICKUP CENTER",
    addressLine1: "MOCHIWARA CHURU",
    cityState: "RAJASTHAN",
    mobile: ["9602480783"]
  },
  {
    id: 5,
    name: "SHANVI SALWAL PICKUP CENTER",
    cityState: "HISAR",
    mobile: ["9729420046"]
  }
];

export default function DeliveryCenterPage() {
  return (
    // 'flex flex-col min-h-screen' ensures your default footer pushes perfectly to the bottom 
    <div className="flex flex-col min-h-screen bg-white font-sans antialiased">
      
      {/* Your default global Navbar */}
      <Navbar />

      {/* Header Banner Section */}
      <header 
        className="relative bg-slate-900 bg-cover bg-center py-16 md:py-24 text-center text-white"
        style={{ 
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.85)), url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1200')` 
        }}
      >
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Delivery Center
          </h1>
          <nav className="text-sm md:text-base text-gray-300 flex justify-center items-center gap-2">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <span className="text-gray-500">&gt;</span>
            <span className="text-gray-400">Delivery Center</span>
          </nav>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="container mx-auto px-4 py-16 max-w-7xl flex-grow">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 items-start">
          {deliveryCenters.map((center) => (
            <div 
              key={center.id} 
              className="bg-[#666666] text-white p-5 rounded shadow-md text-sm leading-relaxed tracking-wide min-h-[220px] flex flex-col justify-between transform transition duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              <div>
                <h2 className="font-bold border-b border-gray-500/50 pb-2 mb-2 uppercase text-xs md:text-[13px]">
                  {center.name}
                </h2>
                <div className="space-y-1 text-gray-100 font-medium uppercase text-[12px]">
                  {center.addressLine1 && <p>{center.addressLine1}</p>}
                  {center.addressLine2 && <p>{center.addressLine2}</p>}
                  <p>{center.cityState}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-2 border-t border-gray-500/30 text-[12px]">
                <span className="font-bold block text-gray-300 text-[10px]">MOBILE</span>
                <p className="font-mono tracking-wider">
                  {center.mobile.join(' / ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Your default global Footer */}
      <Footer />

    </div>
  );
}