import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Filter, Search, MoreVertical, MapPin, Clock, X, CheckCircle, Image as ImageIcon, Video, Paperclip, MessageSquare, History, AlertCircle, RefreshCw, Download, FileText, FileSpreadsheet, Trash2, Check, Sparkles, ImageIcon as LucideImageIcon, List, Columns } from 'lucide-react'
import { aiService, AIAnalysisResult } from '../services/aiService'
import { IncidentKanban } from '../components/features/inspections/IncidentKanban'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { dbService } from '../lib/db'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { incidentService } from '../services/incidentService'
import { useIncidents, useIncidentMutation } from '../hooks/useIncidents'
import { useZones, useRooms, useIncidentTypes, useUsers } from '../hooks/useConfig'

export default function Incidencias() {
  const { user, profile, activeHotelId } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('activas')
  const [viewMode, setViewMode] = useState<'list'|'board'>('board')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const location = useLocation()
  const [newIncident, setNewIncident] = useState({ title: '', location: '', priority: 'medium', room: '', descripcion: '', media_urls: [], activo_id: null })
  
  // React Query Hooks
  const { data: incidents = [], isLoading: incidentsLoading, refetch: refetchIncidents } = useIncidents(activeHotelId)
  const { data: zonas = [], isLoading: zonesLoading } = useZones(activeHotelId)
  const { data: habitaciones = [], isLoading: roomsLoading } = useRooms(activeHotelId)
  const { data: tipos = [], isLoading: typesLoading } = useIncidentTypes(activeHotelId)
  const { data: staff = [], isLoading: staffLoading } = useUsers(activeHotelId)
  const { createIncident, updateIncidentStatus, deleteIncident } = useIncidentMutation()

  const [selectedIncident, setSelectedIncident] = useState(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [incidentToDelete, setIncidentToDelete] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    fetchIncidents()
    fetchMetadata()

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('incidencias_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'incidencias',
        filter: activeHotelId ? `hotel_id=eq.${activeHotelId}` : undefined
      }, () => {
        fetchIncidents()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeHotelId])

  useEffect(() => {
    if (location.state?.prefillAsset) {
      setNewIncident(prev => ({
        ...prev,
        activo_id: location.state.prefillAsset,
        location: location.state.prefillLocation || prev.location
      }))
      setIsModalOpen(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const fetchMetadata = async () => {}; // No-op placeholder

  const fetchIncidents = async () => {
    refetchIncidents();
  };

  const loading = incidentsLoading || zonesLoading || roomsLoading || typesLoading || staffLoading;


  const handleCreateIncident = async (e) => {
    e.preventDefault()
    if (!newIncident.title || !newIncident.location || !user) return
    
    // Si hay una habitación seleccionada, la añadimos a la ubicación
    const finalLocation = newIncident.room 
      ? `${newIncident.location} - Hab. ${newIncident.room}`
      : newIncident.location

    try {
      if (activeHotelId) {
        await createIncident.mutateAsync({
          title: newIncident.title,
          location: finalLocation,
          priority: newIncident.priority as any,
          status: 'pendiente' as any,
          descripcion: newIncident.descripcion || '',
          media_urls: newIncident.media_urls || [],
          reporter_id: user.id,
          activo_id: newIncident.activo_id,
          hotel_id: activeHotelId,
          created_at: new Date().toISOString()
        })
      } else {
        // Si no hay hotelID (raro pero posible en super_admin), usamos supabase directo o manejamos el error
        const { error } = await supabase.from('incidencias').insert([{
          title: newIncident.title,
          location: finalLocation,
          priority: newIncident.priority,
          status: 'pendiente',
          descripcion: newIncident.descripcion || '',
          media_urls: newIncident.media_urls || [],
          reporter_id: user.id,
          activo_id: newIncident.activo_id,
          created_at: new Date().toISOString()
        }])
        if (error) throw error
      }
      
      setIsModalOpen(false)
      setNewIncident({ title: '', location: '', priority: 'medium', room: '', descripcion: '', media_urls: [], activo_id: null })
      toast.success('Incidencia creada correctamente')
    } catch (error) {
      console.error(error)
      toast.error('Error al crear incidencia') // Changed from addToast to toast.error
      // Soporte Offline: Cola de sincronización (re-added from original logic)
      try {
        const finalLocation = newIncident.room 
          ? `${newIncident.location} - Hab. ${newIncident.room}`
          : newIncident.location

        const offlinePayload: any = {
          title: newIncident.title,
          location: finalLocation,
          priority: newIncident.priority,
          status: 'pendiente',
          descripcion: newIncident.descripcion || '',
          media_urls: newIncident.media_urls || [],
          reporter_id: user.id,
          activo_id: newIncident.activo_id,
          created_at: new Date().toISOString()
        }
        if (activeHotelId) offlinePayload.hotel_id = activeHotelId;

        await dbService.addToSyncQueue({
          table: 'incidencias',
          action: 'insert',
          data: offlinePayload,
          timestamp: Date.now()
        })
        toast.info('Modo Offline: El reporte se sincronizará al recuperar la conexión.')
        setIsModalOpen(false)
        setNewIncident({ title: '', location: '', priority: 'medium', room: '', descripcion: '', media_urls: [], activo_id: null })
      } catch (dbError) {
        toast.error('Error crítico al guardar datos locales.')
      }
    }
  }

  const formattedIncidents = useMemo(() => {
    return incidents.map(inc => ({
      ...inc,
      time: new Date(inc.created_at).toLocaleDateString(),
      reporter: staff.find((s: any) => s.id === inc.reporter_id)?.nombre || 'Desconocido',
      assignee_name: staff.find((s: any) => s.id === inc.assigned_to)?.nombre || 'Sin asignar'
    }))
  }, [incidents, staff])

  const filteredIncidents = formattedIncidents.filter(inc => {
    if (activeTab === 'activas') return inc.status !== 'resuelto'
    if (activeTab === 'resueltas') return inc.status === 'resuelto'
    return true
  })

  const STATUS_DETAILS = {
    pendiente: { label: 'Pendiente', color: 'danger', icon: AlertCircle },
    revision: { label: 'Bajo Revisión', color: 'info', icon: Search },
    proceso: { label: 'En Proceso', color: 'warning', icon: Clock },
    espera: { label: 'En Espera', color: 'secondary', icon: Clock },
    resuelto: { label: 'Resuelto', color: 'success', icon: CheckCircle }
  }

  const handleModalFileUpload = async (e) => {
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

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateIncidentStatus.mutateAsync({ id, status: newStatus })
      toast.success('Estado actualizado')
      if (selectedIncident?.id === id) {
        setSelectedIncident(prev => ({ ...prev, status: newStatus }))
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Error al actualizar estado')
    }
  }

  const handleAssign = async (incidentId, userId) => {
    try {
      const { error } = await supabase
        .from('incidencias')
        .update({ assigned_to: userId })
        .eq('id', incidentId)
      
      if (error) throw error
      refetchIncidents()
      if (selectedIncident?.id === incidentId) {
        const selectedStaff = staff.find(s => s.id === userId)
        setSelectedIncident(prev => ({ ...prev, assigned_to: userId, assignee_name: selectedStaff?.nombre || 'Sin asignar' }))
      }
      toast.success('Personal asignado')
    } catch (error) {
      console.error('Error assigning incident:', error)
      toast.error('Error al asignar')
    }
  }

  const handleFileUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedIncident) return
    const file = e.target.files[0]
    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${selectedIncident.id}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `incidents/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('incidencias-media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('incidencias-media')
        .getPublicUrl(filePath)

      const currentUrls = selectedIncident.media_urls || []
      const newUrls = [...currentUrls, publicUrl]

      const { error: updateError } = await supabase
        .from('incidencias')
        .update({ media_urls: newUrls })
        .eq('id', selectedIncident.id)

      if (updateError) throw updateError

      setSelectedIncident(prev => ({ ...prev, media_urls: newUrls }))
      fetchIncidents()
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteIncident = (id) => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!selectedIncident) return
    const id = selectedIncident.id
    try {
      await deleteIncident.mutateAsync(id)
      
      setIsDetailPanelOpen(false)
      setSelectedIncident(null)
      setShowDeleteConfirm(false)
      toast.success('Incidencia eliminada correctamente.')
    } catch (error) {
      console.error('Error deleting incident:', error)
      toast.error('Error al eliminar: ' + error.message)
    }
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Título', 'Ubicación', 'Prioridad', 'Estado', 'Reportado por', 'Asignado a', 'Fecha']
    
    const csvData = filteredIncidents.map(inc => [
      inc.id,
      `"${inc.title.replace(/"/g, '""')}"`,
      `"${inc.location}"`,
      inc.priority === 'high' ? 'Alta' : inc.priority === 'medium' ? 'Media' : 'Baja',
      STATUS_DETAILS[inc.status]?.label || inc.status,
      `"${inc.reporter}"`,
      `"${inc.assignee_name}"`,
      inc.time
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `Incidencias_VSuite_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowExportMenu(false)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Reporte de Incidencias - V-Suite', 14, 22)
    
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString()}`, 14, 30)

    const tableData = filteredIncidents.map(inc => [
      inc.id,
      inc.title,
      inc.location,
      inc.priority === 'high' ? 'Alta' : inc.priority === 'medium' ? 'Media' : 'Baja',
      STATUS_DETAILS[inc.status]?.label || inc.status,
      inc.assignee_name
    ])

    autoTable(doc, {
      startY: 36,
      head: [['ID', 'Título', 'Ubicación', 'Prioridad', 'Estado', 'Asignado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 9 },
      margin: { top: 36 }
    })

    doc.save(`Incidencias_VSuite_${new Date().toISOString().split('T')[0]}.pdf`)
    setShowExportMenu(false)
  }

  const handleAIAnalysis = async () => {
    if (!selectedIncident?.media_urls?.[0]) return
    
    setIsAnalyzing(true)
    setAiResult(null)
    try {
      const result = await aiService.analyzeIncidentImage(
        selectedIncident.media_urls[0],
        selectedIncident.title
      )
      setAiResult(result)
    } catch (error: any) {
      console.error("DETALLE ERROR V-AI:", error)
      toast.error(`Error de IA: ${error.message || 'Error en el motor v-ai'}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="incidencias-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Incidencias</h1>
          <p className="page-subtitle">Control y seguimiento de reportes del hotel</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Nueva Incidencia</span>
        </button>
      </div>

      <div className="incidencias-toolbar glass-card">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'activas' ? 'active' : ''}`}
            onClick={() => setActiveTab('activas')}
          >
            Activas 
            <span className="badge badge-accent ml-sm">
              {formattedIncidents.filter(inc => inc.status !== 'resuelto').length}
            </span>
          </button>
          <button 
            className={`tab ${activeTab === 'resueltas' ? 'active' : ''}`}
            onClick={() => setActiveTab('resueltas')}
          >
            Resueltas
          </button>
          <button 
            className={`tab ${activeTab === 'todas' ? 'active' : ''}`}
            onClick={() => setActiveTab('todas')}
          >
            Todas
          </button>
        </div>

        <div className="toolbar-actions">
          <div className="search-bar variant-small">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Buscar por ID, título, habitación..." className="search-input" />
          </div>
          
          <button className="btn btn-secondary btn-icon">
            <Filter size={18} />
          </button>

          <div className="flex bg-white/5 rounded-lg p-1 mr-2 border border-white/10 hidden md:flex">
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-1.5 flex items-center gap-xs text-xs font-bold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'}`}
            >
              <List size={14} /> Lista
            </button>
            <button 
              onClick={() => setViewMode('board')} 
              className={`p-1.5 flex items-center gap-xs text-xs font-bold rounded-md transition-colors ${viewMode === 'board' ? 'bg-accent/20 text-accent ring-1 ring-accent/50 shadow-sm' : 'text-muted hover:text-white'}`}
            >
              <Columns size={14} /> Tablero
            </button>
          </div>

          <div className="relative">
            <button 
              className="btn btn-secondary flex items-center gap-sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download size={18} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-sm w-48 glass-card border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 animate-fade-in">
                <button 
                  className="w-full text-left px-md py-sm hover:bg-white/5 flex items-center gap-sm transition-colors text-sm"
                  onClick={exportToCSV}
                >
                  <FileSpreadsheet size={16} className="text-success" />
                  Descargar CSV
                </button>
                <button 
                  className="w-full text-left px-md py-sm hover:bg-white/5 flex items-center gap-sm transition-colors text-sm border-t border-white/5"
                  onClick={exportToPDF}
                >
                  <FileText size={16} className="text-danger" />
                  Descargar PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="mt-lg animate-fade-in">
          <IncidentKanban 
            incidents={filteredIncidents} 
            onUpdateStatus={handleUpdateStatus} 
            onClickIncident={(inc: any) => {
              setSelectedIncident(inc)
              setIsDetailPanelOpen(true)
            }}
          />
        </div>
      ) : (
        <div className="incidencias-grid mt-lg animate-fade-in">
        {filteredIncidents.map(inc => (
          <div key={inc.id} className="incident-card glass-card">
            <div className="card-top">
              <div className="badges">
                <span className={`badge priority-${inc.priority}`}>
                  {inc.priority === 'high' ? 'Alta' : inc.priority === 'medium' ? 'Media' : 'Baja'}
                </span>
                <span className="incident-id text-muted">#{inc.id}</span>
              </div>
              <button className="btn-ghost btn-icon btn-sm">
                <MoreVertical size={16} />
              </button>
            </div>
            
            <div 
              className="incident-content p-lg cursor-pointer group"
              onClick={() => {
                setSelectedIncident(inc)
                setIsDetailPanelOpen(true)
              }}
            >
              <div className="flex justify-between items-start mb-sm">
                <h3 className="incident-title px-0 py-none m-none">{inc.title}</h3>
                <span className={`badge priority-${inc.priority} text-[10px] py-none h-fit uppercase`}>
                  {inc.priority === 'high' ? 'Alta' : inc.priority === 'medium' ? 'Media' : 'Baja'}
                </span>
              </div>
              
              <div className="incident-details px-0">
                <div className="detail-item">
                  <MapPin size={14} className="text-muted" />
                  <span>{inc.location}</span>
                </div>
                <div className="detail-item">
                  <Clock size={14} className="text-muted" />
                  <span>{inc.time}</span>
                </div>
              </div>

              {inc.media_urls?.length > 0 && (
                <div className="media-preview-strip mt-md">
                  {inc.media_urls.slice(0, 3).map((url, i) => (
                    <div key={i} className="media-thumb glass rounded-sm overflow-hidden border border-white/10">
                      <img src={url} alt="" className="object-cover w-full h-full" />
                    </div>
                  ))}
                  {inc.media_urls.length > 3 && (
                    <div className="media-thumb-more glass rounded-sm flex items-center justify-center text-xs text-muted border border-white/10">
                      +{inc.media_urls.length - 3}
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-md text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-xs font-semibold uppercase tracking-wider">
                Ver detalles <MoreVertical size={10} />
              </div>
            </div>
            
            <div className="card-bottom border-t">
              <div className="reporter">
                <div className="avatar avatar-sm avatar-gradient">
                  {inc.reporter.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted truncate max-w-[80px]">{inc.reporter.split(' ')[0]}</span>
                  <span className="text-[9px] text-accent font-bold truncate max-w-[80px]">→ {inc.assignee_name}</span>
                </div>
              </div>
              
              <div className={`status-pill status-${STATUS_DETAILS[inc.status]?.color || 'secondary'}`}>
                {STATUS_DETAILS[inc.status]?.label || inc.status}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Incidencia</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateIncident}>
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
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Incidencia</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="text-danger flex items-center gap-sm">
                <Trash2 size={20} /> Confirmar Eliminación
              </h2>
            </div>
            <div className="modal-body py-lg">
              <p className="text-secondary leading-relaxed">
                ¿Estás completamente seguro de que deseas eliminar esta incidencia? 
                <br /><br />
                <span className="font-bold text-danger">Esta acción no se puede deshacer y borrará permanentemente todo el historial relacionado.</span>
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary flex-1" 
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary flex-1 bg-danger border-danger" 
                onClick={confirmDelete}
              >
                Confirmar Borrado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de Detalles (Slide-over) */}
      {isDetailPanelOpen && selectedIncident && (
        <div className="panel-overlay" onClick={() => setIsDetailPanelOpen(false)}>
          <div className="detail-panel glass-card" onClick={e => e.stopPropagation()}>
            <div className="panel-header border-b px-xl py-lg flex justify-between items-center">
              <div className="flex items-center gap-md">
                <span className={`status-dot bg-${STATUS_DETAILS[selectedIncident.status]?.color}`}></span>
                <h2 className="text-lg font-semibold">Incidencias / #{selectedIncident.id}</h2>
              </div>
              <button 
                className="btn-icon btn-ghost hover:bg-white/10 rounded-full h-10 w-10 flex items-center justify-center transition-colors" 
                onClick={() => setIsDetailPanelOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="panel-body p-xl overflow-y-auto">
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
                    onChange={(e) => handleAssign(selectedIncident.id, e.target.value)}
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
                    {Object.entries(STATUS_DETAILS).map(([key, details]) => (
                      <button 
                        key={key}
                        className={`status-option ${selectedIncident.status === key ? 'active' : ''} border-${details.color}`}
                        onClick={() => handleUpdateStatus(selectedIncident.id, key)}
                      >
                        <details.icon size={16} className={`text-${details.color}`} />
                        <span>{details.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="mb-xl p-lg glass rounded-2xl">
                <div className="flex justify-between items-center mb-lg">
                  <h3 className="section-title flex items-center gap-sm font-bold uppercase tracking-widest text-sm">
                    <LucideImageIcon size={18} className="text-accent" />
                    Multimedia y Archivos
                  </h3>
                  {selectedIncident.media_urls?.length > 0 && (
                    <button 
                      className="btn btn-xs btn-accent flex items-center gap-xs"
                      onClick={handleAIAnalysis}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      <span>{isAnalyzing ? 'Analizando...' : 'Analizar con V-AI'}</span>
                    </button>
                  )}
                </div>
                
                <div className="media-grid">
                  {selectedIncident.media_urls?.map((url, i) => (
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
                    <input type="file" hidden accept="image/*,video/*" onChange={handleFileUpload} disabled={uploading} />
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
                      {aiResult.materiales_sugeridos.map(m => (
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

              {/* Acceso a Chat de la Incidencia */}
              <button 
                className="btn btn-primary w-full mt-xl flex items-center justify-center gap-sm"
                onClick={() => {
                  // Navegar al chat con el canal de la incidencia seleccionado
                  navigate(`/chat?channel=inc_${selectedIncident.id}`)
                }}
              >
                <MessageSquare size={18} />
                <span>Abrir Chat de Coordinación</span>
              </button>

              {/* Botón Eliminar */}
              <div className="mt-xl pt-lg border-t border-white/5">
                <button 
                  className="btn btn-sm flex items-center gap-sm w-full justify-center" 
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                  onClick={() => handleDeleteIncident(selectedIncident.id)}
                >
                  <Trash2 size={16} /> Eliminar Incidencia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mb-md { margin-bottom: var(--spacing-md); }
        .incidencias-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-sm) var(--spacing-md);
          margin-bottom: var(--spacing-xl);
          animation: slideInUp 0.4s ease;
        }

        .tabs {
          display: flex;
          gap: var(--spacing-sm);
        }

        .tab {
          padding: 0.5rem 1rem;
          color: var(--color-text-secondary);
          font-weight: 500;
          font-size: var(--font-size-sm);
          border-bottom: 2px solid transparent;
          transition: all var(--transition-fast);
        }

        .tab:hover {
          color: var(--color-text-primary);
        }

        .tab.active {
          color: var(--color-accent);
          border-bottom-color: var(--color-accent);
        }

        .ml-sm { margin-left: var(--spacing-sm); }

        .toolbar-actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .variant-small .search-input {
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
        }

        .incidencias-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--spacing-lg);
          animation: slideInUp 0.5s ease;
        }

        .incident-card {
          display: flex;
          flex-direction: column;
          transition: all var(--transition-normal);
          overflow: hidden;
        }

        .media-preview-strip {
          display: flex;
          gap: 6px;
        }

        .media-thumb { width: 40px; height: 40px; }
        .media-thumb-more { width: 40px; height: 40px; }

        .status-pill {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
          text-transform: uppercase;
        }

        .status-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .status-info { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .status-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-secondary { background: rgba(255, 255, 255, 0.05); color: #9ca3af; }
        .status-success { background: rgba(16, 185, 129, 0.1); color: #10b981; }

        .panel-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.61);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
        }

        .detail-panel {
          width: 500px;
          max-width: 95vw;
          height: 100%;
          background: var(--color-bg-dark);
          animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--color-border);
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .status-selector-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: var(--spacing-sm);
        }

        .status-option {
          padding: var(--spacing-sm) var(--spacing-md);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: var(--font-size-sm);
          cursor: pointer;
          transition: all 0.2s;
        }



        .status-option {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          font-size: var(--font-size-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--color-text-secondary);
        }

        .status-option:hover { 
          background: rgba(255, 255, 255, 0.1); 
          transform: translateY(-2px);
          color: var(--color-text-primary);
        }

        .status-option.active { 
          background: rgba(99, 102, 241, 0.15);
          border-color: var(--color-accent);
          color: var(--color-text-primary);
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.25);
        }

        .status-option.active.border-danger { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); }
        .status-option.active.border-info { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2); }
        .status-option.active.border-warning { border-color: #f59e0b; background: rgba(245, 158, 11, 0.1); box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2); }
        .status-option.active.border-success { border-color: #10b981; background: rgba(16, 185, 129, 0.1); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2); }

        .m-none { margin: 0; }
        .py-none { padding-top: 0; padding-bottom: 0; }
        .px-none { padding-left: 0; padding-right: 0; }
        .px-0 { padding-left: 0; padding-right: 0; }
        .py-none { padding-top: 0; padding-bottom: 0; }
        .p-none { padding: 0; }
        .mt-sm { margin-top: 0.5rem; }
        .mb-sm { margin-bottom: 0.5rem; }
        .mb-lg { margin-bottom: 1.5rem; }
        .gap-xs { gap: 0.25rem; }
        .pb-xl { padding-bottom: 2rem; }
        .pb-lg { padding-bottom: 1.5rem; }
        .mb-xl { margin-bottom: 2rem; }

        .text-2xl { font-size: 1.5rem; }
        .text-3xl { font-size: 1.875rem; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .tracking-tight { letter-spacing: -0.025em; }
        .tracking-widest { letter-spacing: 0.1em; }
        .tracking-wider { letter-spacing: 0.05em; }
        
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .items-start { align-items: flex-start; }
        .justify-between { justify-content: space-between; }
        .gap-md { gap: 1rem; }
        .gap-sm { gap: 0.5rem; }
        .gap-xl { gap: 2rem; }
        .gap-lg { gap: 1.5rem; }
        .flex-wrap { flex-wrap: wrap; }
        .overflow-y-auto { overflow-y: auto; }
        .h-10 { height: 2.5rem; }
        .w-10 { width: 2.5rem; }
        .rounded-full { border-radius: 9999px; }
        .rounded-2xl { border-radius: 1rem; }
        .rounded-xl { border-radius: 0.75rem; }
        .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }

        .group-hover\:scale-110:hover { transform: scale(1.1); }
        .group-hover\:opacity-100:hover { opacity: 1; }

        .text-muted { color: var(--color-text-muted); }
        .text-secondary { color: var(--color-text-secondary); }
        .text-primary { color: var(--color-text-primary); }
        .text-accent { color: var(--color-accent); }
        .text-danger { color: #ef4444; }
        .text-info { color: #3b82f6; }
        .text-warning { color: #f59e0b; }
        .text-success { color: #10b981; }
        .bg-danger { background: #ef4444; }
        .bg-info { background: #3b82f6; }
        .bg-warning { background: #f59e0b; }
        .bg-success { background: #10b981; }
      `}</style>
    </div>
  )
}
