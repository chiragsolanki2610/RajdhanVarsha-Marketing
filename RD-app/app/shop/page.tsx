'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

export default function ShopPage() {
  const [chosenPlan, setChosenPlan] = useState<string | null>(null);

  useEffect(() => {
    // Read which blueprint they committed to from the plan tracker dashboard
    const savedPlan = localStorage.getItem('pendingActivationPlan');
    setChosenPlan(savedPlan);
  }, []);

  const completeCheckout = async (productId: string) => {
    // This will send the activation transaction request back to your C# API
    console.log(`Processing activation for ${chosenPlan} using product ${productId}`);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-6">
        <header className="mb-6">
          <h1 className="text-xl font-black uppercase text-slate-800">Select Activation Package</h1>
          <p className="text-xs text-slate-500">
            Target Context: <span className="text-blue-600 font-bold uppercase">{chosenPlan?.replace('-', ' ')}</span>
          </p>
        </header>

        {/* Product Cards Grid goes here */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* We will map out packages mapping exactly to 600 B.V or 1 S.P properties here */}
        </div>
      </div>
    </div>
  );
}