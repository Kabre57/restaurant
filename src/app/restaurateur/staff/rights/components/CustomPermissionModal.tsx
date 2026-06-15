import React from 'react'
import { X, AlertCircle, Loader2 } from 'lucide-react'
import { MODULES_LIST } from '@/app/utils/permissions-config'

interface CustomPermissionModalProps {
  isDarkMode: boolean
  modalMode: 'create' | 'edit'
  customKey: string
  customName: string
  customDesc: string
  customModule: string
  errorMessage: string
  actionLoading: boolean
  setCustomKey: (val: string) => void
  setCustomName: (val: string) => void
  setCustomDesc: (val: string) => void
  setCustomModule: (val: string) => void
  setIsModalOpen: (val: boolean) => void
  handleSaveCustomPermission: (e: React.FormEvent) => Promise<void>
}

export default function CustomPermissionModal({
  isDarkMode,
  modalMode,
  customKey,
  customName,
  customDesc,
  customModule,
  errorMessage,
  actionLoading,
  setCustomKey,
  setCustomName,
  setCustomDesc,
  setCustomModule,
  setIsModalOpen,
  handleSaveCustomPermission
}: CustomPermissionModalProps) {
  const cardTheme = isDarkMode ? 'bg-[#151821] border-[#252a37] shadow-xl' : 'bg-white border-[#e3e8f0] shadow-sm'
  const titleTheme = isDarkMode ? 'text-white' : 'text-[#1a202c]'
  const descTheme = isDarkMode ? 'text-[#9faab7]' : 'text-[#64748b]'
  const borderTheme = isDarkMode ? 'border-[#252a37]' : 'border-[#e2e8f0]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg p-6 rounded-3xl border transition-all ${cardTheme} shadow-2xl`}>
        <div className="flex items-center justify-between border-b pb-4 mb-4 dark:border-slate-800">
          <h3 className={`text-sm font-black uppercase tracking-widest ${titleTheme}`}>
            {modalMode === 'create' ? 'Créer une permission personnalisée' : 'Modifier la permission'}
          </h3>
          <button
            onClick={() => setIsModalOpen(false)}
            className={`p-1.5 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 ${borderTheme}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSaveCustomPermission} className="space-y-4">
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${descTheme}`}>
              Clé technique (unique) *
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-xs font-bold text-slate-400">custom.</span>
              <input
                type="text"
                required
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="ma_permission"
                disabled={modalMode === 'edit'}
                className={`w-full pl-16 pr-4 py-3 text-xs rounded-2xl border outline-none font-semibold transition ${
                  isDarkMode
                    ? 'bg-[#0f1115] border-[#252a37] text-white focus:border-amber-500'
                    : 'bg-slate-50 border-[#cbd5e1] text-slate-800 focus:border-amber-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${descTheme}`}>
              Nom d'affichage *
            </label>
            <input
              type="text"
              required
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ex: Modifier les tarifs de nuit"
              className={`w-full px-4 py-3 text-xs rounded-2xl border outline-none font-semibold transition ${
                isDarkMode
                  ? 'bg-[#0f1115] border-[#252a37] text-white focus:border-amber-500'
                  : 'bg-slate-50 border-[#cbd5e1] text-slate-800 focus:border-amber-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${descTheme}`}>
              Description détaillée *
            </label>
            <textarea
              required
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Décrivez précisément ce que cette règle autorise."
              rows={3}
              className={`w-full px-4 py-3 text-xs rounded-2xl border outline-none font-semibold transition ${
                isDarkMode
                  ? 'bg-[#0f1115] border-[#252a37] text-white focus:border-amber-500'
                  : 'bg-slate-50 border-[#cbd5e1] text-slate-800 focus:border-amber-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${descTheme}`}>
              Module de rattachement *
            </label>
            <select
              value={customModule}
              onChange={(e) => setCustomModule(e.target.value)}
              className={`w-full px-4 py-3 text-xs rounded-2xl border outline-none font-semibold cursor-pointer ${
                isDarkMode ? 'bg-[#0f1115] border-[#252a37] text-white' : 'bg-slate-50 border-[#cbd5e1] text-slate-800'
              }`}
            >
              {MODULES_LIST.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider border hover:bg-slate-50 dark:hover:bg-slate-800 ${borderTheme}`}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold uppercase tracking-wider text-xs px-6 py-3 rounded-2xl shadow-lg hover:from-amber-600 hover:to-orange-700 transition"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
