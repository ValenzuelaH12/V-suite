import { useState, useEffect } from 'react'
import { X, Plus, RefreshCw } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

export function CreateIncidentModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  tipos, 
  zonas, 
  habitaciones,
  initialData = {}
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  tipos: any[]
  zonas: any[]
  habitaciones: any[]
  initialData?: any
}) {
  const [newIncident, setNewIncident] = useState({ 
    title: '', 
    location: '', 
    priority: 'medium', 
    room: '', 
    descripcion: '', 
    media_urls: [] as string[], 
    activo_id: null 
  })
  const [uploading, setUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setNewIncident(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  if (!isOpen) return null

  const handleModalFileUpload = async (e: any) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `new_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `incidents/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('incidencias-media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('incidencias-media')
        .getPublicUrl(filePath)

      setNewIncident(prev => ({
        ...prev,
        media_urls: [...(prev.media_urls || []), publicUrl]
      }))
    } catch (error) {
      console.error('Error uploading modal file:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(newIncident)
      // reset forms
      setNewIncident({ title: '', location: '', priority: 'medium', room: '', descripcion: '', media_urls: [], activo_id: null })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nueva Incidencia</h2>
          <button className="btn-icon btn-ghost" onClick={onClose} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2 mb-sm">
              <div className="input-group">
                <label className="input-label">Tipo de Incidencia</label>
                <select 
                  className="select"
                  value={newIncident.title}
                  onChange={e => setNewIncident({...newIncident, title: e.target.value})}
                  required
                >
                  <option value="">Seleccionar tipo...</option>
                  {tipos.map(t => (
                    <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Prioridad</label>
                <select 
                  className="select"
                  value={newIncident.priority}
                  onChange={e => setNewIncident({...newIncident, priority: e.target.value})}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>

            <div className="grid-2 mb-sm">
              <div className="input-group">
                <label className="input-label">Zona / Ubicación</label>
                <select 
                  className="select"
                  value={newIncident.location}
                  onChange={e => setNewIncident({...newIncident, location: e.target.value, room: ''})}
                  required
                >
                  <option value="">Seleccionar zona...</option>
                  {zonas.map(z => (
                    <option key={z.id} value={z.nombre}>{z.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Habitación (Opcional)</label>
                <select 
                  className="select"
                  value={newIncident.room || ''}
                  onChange={e => setNewIncident({...newIncident, room: e.target.value})}
                  disabled={!newIncident.location}
                >
                  <option value="">{newIncident.location ? `Cualquier hab. en ${newIncident.location}` : 'Seleccione zona primero'}</option>
                  {newIncident.location && habitaciones
                    .filter(h => h.zona_id === zonas.find(z => z.nombre === newIncident.location)?.id)
                    .map(h => (
                      <option key={h.id} value={h.nombre}>{h.nombre}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="input-group mb-sm">
              <label className="input-label">Descripción del Problema</label>
              <textarea 
                className="input"
                rows={2}
                placeholder="Detalla qué sucede..."
                value={newIncident.descripcion || ''}
                onChange={e => setNewIncident({...newIncident, descripcion: e.target.value})}
              />
            </div>

            <div className="input-group">
              <label className="input-label mb-sm">Archivos Adjuntos</label>
              <div className="flex flex-wrap gap-xs">
                {newIncident.media_urls?.map((url, i) => (
                  <div key={i} className="media-thumb glass rounded-md overflow-hidden border border-white/10 w-12 h-12 relative group">
                    <img src={url} alt="" className="object-cover w-full h-full" />
                    <button 
                      type="button"
                      className="absolute top-0 right-0 bg-danger text-white p-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setNewIncident(prev => ({
                        ...prev,
                        media_urls: prev.media_urls.filter((_, idx) => idx !== i)
                      }))}
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
                <label className="upload-box glass hover:border-accent transition-all rounded-md border-2 border-dashed border-white/10 w-12 h-12 flex items-center justify-center cursor-pointer">
                  {uploading ? (
                    <RefreshCw className="animate-spin text-accent" size={14} />
                  ) : (
                    <Plus size={14} className="text-muted" />
                  )}
                  <input type="file" hidden accept="image/*,video/*" onChange={handleModalFileUpload} disabled={uploading} />
                </label>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || uploading}>
              {isSubmitting ? 'Creando...' : 'Crear Incidencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
