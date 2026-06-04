'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X, Camera, AlertCircle, Sparkles } from 'lucide-react'

interface Props {
  onScan: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScannerModal({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasDetector, setHasDetector] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState("")

  useEffect(() => {
    let active = true
    let videoStream: MediaStream | null = null

    // Check if browser supports BarcodeDetector
    if (!('BarcodeDetector' in window)) {
      setHasDetector(false)
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        videoStream = stream
        if (videoRef.current && active) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(e => console.error("Video play error:", e))
        }

        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e']
          })

          const scanLoop = async () => {
            if (!active) return
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await detector.detect(videoRef.current)
                if (barcodes.length > 0 && active) {
                  onScan(barcodes[0].rawValue)
                  onClose()
                  return
                }
              } catch (err) {
                console.error("Barcode detection error:", err)
              }
            }
            requestAnimationFrame(scanLoop)
          }

          requestAnimationFrame(scanLoop)
        }
      } catch (err) {
        console.error("Camera access error:", err)
        setError("Impossible d'accéder à la caméra. Veuillez accorder les permissions requises.")
      }
    }

    startCamera()

    return () => {
      active = false
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [onScan, onClose])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      onScan(manualCode.trim())
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <div className="bg-[#1e1e24]/95 border border-white/10 text-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-md font-black uppercase tracking-wider">Scanner Caméra</h2>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Placez le code-barres devant l&apos;objectif</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </header>

        <div className="p-6 space-y-6">
          {/* Camera Frame */}
          <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
            {error ? (
              <div className="flex flex-col items-center p-6 text-center text-red-400 gap-2">
                <AlertCircle className="w-8 h-8" />
                <span className="text-xs font-bold">{error}</span>
              </div>
            ) : !hasDetector ? (
              <div className="flex flex-col items-center p-6 text-center text-amber-400 gap-2">
                <AlertCircle className="w-8 h-8" />
                <span className="text-xs font-bold">API de Détection indisponible (Chromium Requis)</span>
                <span className="text-[10px] text-gray-400 mt-1">Utilisez l&apos;entrée manuelle ci-dessous ou une douchette physique.</span>
              </div>
            ) : (
              <>
                <video 
                  ref={videoRef}
                  playsInline 
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Laser scan animation overlay */}
                <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] top-1/2 -translate-y-1/2 animate-pulse" />
                <div className="absolute inset-4 border border-dashed border-white/30 rounded-xl pointer-events-none" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">Caméra Active</span>
                </div>
              </>
            )}
          </div>

          {/* Fallback manual entry */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Saisie manuelle / Test</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Entrez le code à tester..."
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
              />
              <button 
                type="submit"
                className="bg-amber-400 hover:bg-amber-500 text-black px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Valider
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
