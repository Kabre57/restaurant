'use client'

import React from 'react'
import { AlertCircle, X, CheckCircle } from 'lucide-react'

interface AlertModalProps {
  type?: 'error' | 'success' | 'info'
  title: string
  message: string
  onClose: () => void
}

export function AlertModal({ type = 'error', title, message, onClose }: AlertModalProps) {
  const isError = type === 'error'
  const isSuccess = type === 'success'

  return (
    <div className="fixed inset-0 bg-[#1a1d24]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative text-center">
        <button onClick={onClose} className="absolute top-8 right-8 text-[#adb5bd] hover:text-[#212529]"><X className="w-6 h-6" /></button>
        
        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg ${isError ? 'bg-[#fff5f5] text-[#e03131]' : isSuccess ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#f1f3f5] text-[#212529]'}`}>
          {isError ? <AlertCircle className="w-10 h-10" /> : isSuccess ? <CheckCircle className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
        </div>
        
        <h3 className="text-2xl font-black text-[#212529] uppercase tracking-tight mb-4">{title}</h3>
        <div className="bg-[#f8f9fa] rounded-2xl p-6 border border-[#dee2e6] mb-8">
          <p className="text-sm font-bold text-[#495057] leading-relaxed break-words">{message}</p>
        </div>
        
        <button 
          onClick={onClose}
          className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${isError ? 'bg-[#e03131] hover:bg-[#c92a2a] text-white shadow-red-500/20' : 'bg-[#212529] hover:bg-black text-white'}`}
        >
          {isSuccess ? "Continuer" : "J'ai compris"}
        </button>
      </div>
    </div>
  )
}
