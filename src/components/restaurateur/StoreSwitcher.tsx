"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Building2, ChevronDown, Check, Loader2 } from "lucide-react"

export default function StoreSwitcher() {
  const { data: session, update } = useSession()
  const [stores, setStores] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetch("/api/stores")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setStores(data)
          }
        })
        .catch((err) => console.error("Error loading stores:", err))
    }
  }, [session])

  // Click outside to close dropdown
  useEffect(() => {
    if (!open) return
    const handleOutsideClick = () => setOpen(false)
    window.addEventListener("click", handleOutsideClick)
    return () => window.removeEventListener("click", handleOutsideClick)
  }, [open])

  if (!session?.user || stores.length <= 1) return null

  const currentStore = stores.find((s) => s.id === session.user.storeId) || {
    name: "Établissement Actif",
  }

  const handleSwitch = async (e: React.MouseEvent, storeId: string) => {
    e.stopPropagation()
    if (storeId === session.user.storeId || switchingId) return

    setSwitchingId(storeId)
    setOpen(false)

    try {
      await update({ storeId })
      // Force reload to refresh layout context and state fully
      window.location.reload()
    } catch (err) {
      console.error("Error switching store context:", err)
      setSwitchingId(null)
    }
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        disabled={!!switchingId}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-95 disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
      >
        {switchingId ? (
          <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
        ) : (
          <Building2 className="w-4 h-4 text-slate-500" />
        )}
        <span className="max-w-[150px] truncate">{currentStore.name}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-slate-100 bg-white/95 backdrop-blur-md p-1 shadow-xl ring-1 ring-black/5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="px-2.5 py-1.5 text-xs font-semibold text-slate-400 tracking-wider uppercase">
            Établissements
          </div>
          <div className="max-h-60 overflow-y-auto">
            {stores.map((store) => {
              const isSelected = store.id === session.user.storeId
              return (
                <button
                  key={store.id}
                  onClick={(e) => handleSwitch(e, store.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm rounded-lg transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{store.name}</span>
                    {store.code && (
                      <span className="text-[10px] text-slate-400 font-normal">{store.code}</span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
