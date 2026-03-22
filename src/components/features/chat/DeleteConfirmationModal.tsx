import { Trash2 } from 'lucide-react'

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  description: string
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1a1c24] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4 text-red-400">
            <div className="p-3 bg-red-400/10 rounded-full">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
          </div>
          <p className="text-gray-400 leading-relaxed">
            {description}
          </p>
        </div>
        <div className="flex border-t border-white/5">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-4 text-gray-400 hover:bg-white/5 transition-colors font-medium border-r border-white/5"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-6 py-4 text-red-400 hover:bg-red-400/10 transition-colors font-semibold"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
