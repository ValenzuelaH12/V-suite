import { X, MapPin, Clock, ImageIcon, Sparkles, RefreshCw, MessageSquare, Trash2, Plus } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function IncidentDetailPanel({ 
  selectedIncident, 
  onClose, 
  staff, 
  STATUS_DETAILS,
  onAssign,
  onUpdateStatus,
  onDelete,
  onAIAnalysis,
  aiResult,
  isAnalyzing,
  onNavigateToChat,
  onFileUpload
}: { 
  selectedIncident: any
  onClose: () => void
  staff: any[]
  STATUS_DETAILS: Record<string, any>
  onAssign: (incidentId: string | number, userId: string) => void
  onUpdateStatus: (incidentId: string | number, status: string) => void
  onDelete: (incidentId: string | number) => void
  onAIAnalysis: () => void
  aiResult: any
  isAnalyzing: boolean
  onNavigateToChat: () => void
  onFileUpload: (e: any) => Promise<void>
}) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: any) => {
    setUploading(true)
    try {
      await onFileUpload(e)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="detail-panel glass-card" onClick={e => e.stopPropagation()}>
        <div className="panel-header border-b px-xl py-lg flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-md">
            <span className={`h-3 w-3 rounded-full bg-${STATUS_DETAILS[selectedIncident.status]?.color}`}></span>
            <h2 className="text-lg font-bold tracking-tight">Detalle de Incidencia</h2>
          </div>
          <button 
            className="btn-icon hover:bg-white/10 rounded-full h-10 w-10 flex items-center justify-center transition-all hover:rotate-90" 
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="panel-body overflow-y-auto custom-scrollbar">
          <section className="mb-xl">
            <div className="flex flex-col gap-sm mb-lg">
              <div className="flex items-center gap-md">
                <span className={`badge priority-${selectedIncident.priority} uppercase tracking-widest text-[10px]`}>
                  {selectedIncident.priority === 'high' ? 'Alta' : selectedIncident.priority === 'medium' ? 'Media' : 'Baja'}
                </span>
                <span className="text-xs text-secondary font-mono">#{selectedIncident.id}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{selectedIncident.title}</h1>
            </div>
            
            <div className="flex flex-wrap gap-xl text-sm text-secondary mb-xl pb-xl border-b border-white/5">
              <div className="flex items-center gap-md">
                <div className="p-sm glass rounded-lg text-accent">
                  <MapPin size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-muted font-bold">Ubicación</span>
                  <span className="text-primary">{selectedIncident.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-md">
                <div className="p-sm glass rounded-lg text-accent">
                  <Clock size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-muted font-bold">Reportado</span>
                  <span className="text-primary">{selectedIncident.time}</span>
                </div>
              </div>
            </div>
            <div className="input-group mt-lg">
              <label className="input-label mb-md text-xs uppercase tracking-widest text-muted">Asignar Responsable</label>
              <select 
                className="select"
                value={selectedIncident.assignee_id || ''}
                onChange={(e) => onAssign(selectedIncident.id, e.target.value)}
              >
                <option value="">Sin asignar</option>
                {staff.map(member => (
                  <option key={member.id} value={member.id}>{member.nombre} ({member.rol})</option>
                ))}
              </select>
            </div>

            <div className="input-group mt-lg">
              <label className="input-label mb-md text-xs uppercase tracking-widest text-muted">Cambiar Estado</label>
              <div className="status-selector-grid">
                {Object.entries(STATUS_DETAILS).map(([key, details]) => {
                  const Icon = details.icon
                  return (
                    <button 
                      key={key}
                      className={`status-option ${selectedIncident.status === key ? 'active' : ''} border-${details.color}`}
                      onClick={() => onUpdateStatus(selectedIncident.id, key)}
                    >
                      <Icon size={16} className={`text-${details.color}`} />
                      <span>{details.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="mb-xl p-lg glass rounded-2xl">
            <div className="flex justify-between items-center mb-lg">
              <h3 className="section-title flex items-center gap-sm font-bold uppercase tracking-widest text-sm">
                <ImageIcon size={18} className="text-accent" />
                Multimedia y Archivos
              </h3>
              {selectedIncident.media_urls?.length > 0 && (
                <button 
                  className="btn btn-xs btn-accent flex items-center gap-xs"
                  onClick={onAIAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  <span>{isAnalyzing ? 'Analizando...' : 'Analizar con V-AI'}</span>
                </button>
              )}
            </div>
            
            <div className="media-grid">
              {selectedIncident.media_urls?.map((url: string, i: number) => (
                <div key={i} className="media-item glass relative group border border-white/5 hover:border-accent/50 transition-all rounded-xl overflow-hidden shadow-xl">
                  <img src={url} alt="" className="media-content group-hover:scale-110 transition-transform duration-500" onClick={() => window.open(url, '_blank')} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <Plus size={20} className="text-white" />
                  </div>
                </div>
              ))}
              <label className="upload-box glass hover:border-accent transition-all rounded-xl border-2 border-dashed border-white/10 hover:bg-accent/5 group">
                {uploading ? (
                  <RefreshCw className="animate-spin text-accent" />
                ) : (
                  <>
                    <div className="p-md bg-white/5 rounded-full mb-xs group-hover:bg-accent/20 transition-colors">
                      <Plus size={24} className="text-muted group-hover:text-accent transition-colors" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted group-hover:text-accent transition-colors">Añadir Archivo</span>
                  </>
                )}
                <input type="file" hidden accept="image/*,video/*" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>

            {aiResult && (
              <div className="mt-lg p-md bg-accent/10 border border-accent/20 rounded-xl animate-fade-in">
                <h4 className="text-xs font-bold text-accent uppercase mb-sm flex items-center gap-xs">
                  <Sparkles size={14} /> Diagnóstico Inteligente (Gemini)
                </h4>
                <div className="text-sm leading-relaxed mb-md">
                  <p className="text-primary"><strong className="text-accent">Detección:</strong> {aiResult.diagnostico}</p>
                  <p className="mt-xs text-primary"><strong className="text-accent">Sugerencia:</strong> {aiResult.sugerencia}</p>
                  <p className="mt-xs text-primary"><strong className="text-accent">Depto:</strong> {aiResult.departamento}</p>
                </div>
                <div className="flex flex-wrap gap-xs">
                  {aiResult.materiales_sugeridos.map((m: string) => (
                    <span key={m} className="badge badge-accent text-[10px]">{m}</span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="p-lg glass rounded-2xl">
            <h3 className="section-title flex items-center gap-sm mb-lg text-sm font-bold uppercase tracking-widest">
              <MessageSquare size={18} className="text-accent" />
              Descripción y Notas
            </h3>
            <div className="p-md glass rounded-xl min-h-[120px] text-sm text-secondary leading-relaxed border border-white/5">
              {selectedIncident.descripcion || "No hay descripción adicional para esta incidencia."}
            </div>
          </section>

          <button 
            className="btn btn-primary w-full mt-xl flex items-center justify-center gap-sm"
            onClick={onNavigateToChat}
          >
            <MessageSquare size={18} />
            <span>Abrir Chat de Coordinación</span>
          </button>

          <div className="mt-xl pt-lg border-t border-white/5">
            <button 
              className="btn btn-sm flex items-center gap-sm w-full justify-center" 
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              onClick={() => onDelete(selectedIncident.id)}
            >
              <Trash2 size={16} /> Eliminar Incidencia
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
