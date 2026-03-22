import { useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'

export function IncidentExportMenu({ 
  onExportCSV, 
  onExportPDF 
}: { 
  onExportCSV: () => void
  onExportPDF: () => void 
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button 
        className="btn btn-secondary flex items-center gap-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Download size={18} />
        <span className="hidden sm:inline">Exportar</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-sm w-48 glass-card border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 animate-fade-in">
          <button 
            className="w-full text-left px-md py-sm hover:bg-white/5 flex items-center gap-sm transition-colors text-sm"
            onClick={() => {
              onExportCSV()
              setIsOpen(false)
            }}
          >
            <FileSpreadsheet size={16} className="text-success" />
            Descargar CSV
          </button>
          <button 
            className="w-full text-left px-md py-sm hover:bg-white/5 flex items-center gap-sm transition-colors text-sm border-t border-white/5"
            onClick={() => {
              onExportPDF()
              setIsOpen(false)
            }}
          >
            <FileText size={16} className="text-danger" />
            Descargar PDF
          </button>
        </div>
      )}
    </div>
  )
}
