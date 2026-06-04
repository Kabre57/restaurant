'use client';

import React from 'react';
import { X, Printer } from 'lucide-react';

interface PrintLayoutProps {
  title: string;
  subtitle?: string;
  meta?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function PrintLayout({ title, subtitle, meta, onClose, children }: PrintLayoutProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-100 flex flex-col print:bg-white print:z-auto">
      {/* Barre d'outils (invisible à l'impression) */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm print:hidden">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex gap-4">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
          >
            <Printer className="w-5 h-5" />
            <span>Imprimer</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Zone imprimable */}
      <div className="flex-1 overflow-y-auto print:overflow-visible p-8 print:p-0">
        <div className="max-w-4xl mx-auto bg-white p-12 shadow-lg print:shadow-none print:p-0 print:m-0">
          <div className="border-b-2 border-black pb-6 mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-widest">{title}</h1>
              {subtitle && <h2 className="text-xl font-bold mt-2 text-gray-700">{subtitle}</h2>}
            </div>
            {meta && (
              <div className="text-right">
                <p className="text-gray-600 font-medium">{meta}</p>
              </div>
            )}
          </div>
          
          <div className="print-content text-black">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
