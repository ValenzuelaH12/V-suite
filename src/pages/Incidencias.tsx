import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { aiService, AIAnalysisResult } from '../services/aiService'
import { IncidentKanban } from '../components/features/inspections/IncidentKanban'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useIncidents, useIncidentMutation } from '../hooks/useIncidents'
import { useZones, useRooms, useIncidentTypes, useUsers } from '../hooks/useConfig'
import { IncidentCard } from '../components/features/incidents/IncidentCard'
import { CreateIncidentModal } from '../components/features/incidents/CreateIncidentModal'
import { IncidentDetailPanel } from '../components/features/incidents/IncidentDetailPanel'
import { IncidentExportMenu } from '../components/features/incidents/IncidentExportMenu'
import { IncidentToolbar } from '../components/features/incidents/IncidentToolbar'
import { DeleteIncidentModal } from '../components/features/incidents/DeleteIncidentModal'
import { AlertCircle, Search, Clock, CheckCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import './Incidencias.css'

export const STATUS_DETAILS = {
  pendiente: { label: 'Pendiente', color: 'danger', icon: AlertCircle },
  revision: { label: 'Bajo Revisión', color: 'info', icon: Search },
  proceso: { label: 'En Proceso', color: 'warning', icon: Clock },
  espera: { label: 'En Espera', color: 'secondary', icon: Clock },
  resuelto: { label: 'Resuelto', color: 'success', icon: CheckCircle }
}

export default function Incidencias() {
  const { user, activeHotelId } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const location = useLocation()
  
  const [activeTab, setActiveTab] = useState('activas')
  const [viewMode, setViewMode] = useState<'list'|'board'>('board')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [initialIncidentData, setInitialIncidentData] = useState({})
  const [selectedIncident, setSelectedIncident] = useState<any>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null)

  // React Query Hooks
  const { data: incidents = [], refetch: refetchIncidents } = useIncidents(activeHotelId)
  const { data: zonas = [] } = useZones(activeHotelId)
  const { data: habitaciones = [] } = useRooms(activeHotelId)
  const { data: tipos = [] } = useIncidentTypes(activeHotelId)
  const { data: staff = [] } = useUsers(activeHotelId)
  const { createIncident, updateIncidentStatus, deleteIncident } = useIncidentMutation()

  useEffect(() => {
    const channel = supabase
      .channel('incidencias_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'incidencias',
        filter: activeHotelId ? `hotel_id=eq.${activeHotelId}` : undefined
      }, () => refetchIncidents())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeHotelId, refetchIncidents])

  useEffect(() => {
    if (location.state?.prefillAsset) {
      setInitialIncidentData({
        activo_id: location.state.prefillAsset,
        location: location.state.prefillLocation || ''
      })
      setIsModalOpen(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const handleCreateIncident = async (data: any) => {
    if (!data.title || !data.location || !user || !activeHotelId) return
    const finalLocation = data.room ? `${data.location} - Hab. ${data.room}` : data.location

    try {
      await createIncident.mutateAsync({
        title: data.title,
        location: finalLocation,
        priority: data.priority as any,
        status: 'pendiente' as any,
        descripcion: data.descripcion || '',
        media_urls: data.media_urls || [],
        reporter_id: user.id,
        activo_id: data.activo_id,
        hotel_id: activeHotelId,
        created_at: new Date().toISOString()
      })
      setIsModalOpen(false)
      setInitialIncidentData({})
      toast.success('Incidencia creada correctamente')
    } catch (error) {
      toast.error('Error al crear incidencia')
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

  const filteredIncidents = useMemo(() => {
    return formattedIncidents.filter(inc => {
      const matchesTab = activeTab === 'activas' ? inc.status !== 'resuelto' : (activeTab === 'resueltas' ? inc.status === 'resuelto' : true)
      if (!matchesTab) return false
      if (!searchTerm) return true
      const term = searchTerm.toLowerCase()
      return inc.title.toLowerCase().includes(term) || inc.location.toLowerCase().includes(term) || inc.id.toString().includes(term)
    })
  }, [formattedIncidents, activeTab, searchTerm])

  const confirmDelete = async () => {
    if (!selectedIncident) return
    try {
      await deleteIncident.mutateAsync(selectedIncident.id)
      setIsDetailPanelOpen(false)
      setSelectedIncident(null)
      setShowDeleteConfirm(false)
      toast.success('Incidencia eliminada')
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  const handleAIAnalysis = async () => {
    if (!selectedIncident?.media_urls?.[0]) return
    setIsAnalyzing(true)
    setAiResult(null)
    try {
      const result = await aiService.analyzeIncidentImage(selectedIncident.media_urls[0], selectedIncident.title)
      setAiResult(result)
    } catch (error: any) {
      toast.error(`Error V-AI: ${error.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Export Logic (Simplificada para el Facade)
  const handleExport = (type: 'pdf' | 'csv') => {
    if (type === 'pdf') {
       const doc = new jsPDF()
       doc.text('Reporte de Incidencias', 14, 22)
       autoTable(doc, {
         startY: 30,
         head: [['ID', 'Título', 'Ubicación', 'Estado']],
         body: filteredIncidents.map(inc => [inc.id, inc.title, inc.location, inc.status])
       })
       doc.save('incidencias.pdf')
    } else {
       const csv = 'ID,Título,Ubicación,Estado\n' + filteredIncidents.map(inc => `${inc.id},${inc.title},${inc.location},${inc.status}`).join('\n')
       const blob = new Blob([csv], { type: 'text/csv' })
       const url = URL.createObjectURL(blob)
       const a = document.createElement('a')
       a.href = url
       a.download = 'incidencias.csv'
       a.click()
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

      <IncidentToolbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeCount={formattedIncidents.filter(inc => inc.status !== 'resuelto').length}
      />

      {viewMode === 'board' ? (
        <div className="mt-lg animate-fade-in">
          <IncidentKanban 
            incidents={filteredIncidents} 
            onUpdateStatus={(id, status) => updateIncidentStatus.mutate({ id, status })} 
            onClickIncident={(inc: any) => {
              setSelectedIncident(inc)
              setIsDetailPanelOpen(true)
            }}
          />
        </div>
      ) : (
        <div className="incidencias-grid mt-lg animate-fade-in">
          {filteredIncidents.map((inc: any) => (
            <IncidentCard 
              key={inc.id} 
              inc={inc} 
              onClick={(incident) => {
                setSelectedIncident(incident)
                setIsDetailPanelOpen(true)
              }} 
              STATUS_DETAILS={STATUS_DETAILS} 
            />
          ))}
        </div>
      )}

      <CreateIncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateIncident}
        tipos={tipos}
        zonas={zonas}
        habitaciones={habitaciones}
        initialData={initialIncidentData}
      />

      <DeleteIncidentModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
      />

      {isDetailPanelOpen && selectedIncident && (
        <IncidentDetailPanel
          selectedIncident={selectedIncident}
          onClose={() => setIsDetailPanelOpen(false)}
          staff={staff}
          STATUS_DETAILS={STATUS_DETAILS}
          onAssign={(id, userId) => supabase.from('incidencias').update({ assigned_to: userId }).eq('id', id).then(() => refetchIncidents())}
          onUpdateStatus={(id, status) => updateIncidentStatus.mutate({ id, status })}
          onDelete={() => setShowDeleteConfirm(true)}
          onAIAnalysis={handleAIAnalysis}
          aiResult={aiResult}
          isAnalyzing={isAnalyzing}
          onNavigateToChat={() => navigate(`/chat?channel=inc_${selectedIncident.id}`)}
          onFileUpload={() => refetchIncidents()}
        />
      )}
    </div>
  )
}
