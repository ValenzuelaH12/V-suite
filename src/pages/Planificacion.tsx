import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { dbService } from '../lib/db'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { 
  Plus, 
  Search, 
  MapPin, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  Download, 
  Printer, 
  ExternalLink,
  MessageSquare,
  FileText,
  FileSpreadsheet,
  X,
  AlertTriangle,
  History,
  User,
  Edit3,
  Trash2,
  Check,
  Layers,
  ShieldCheck,
  Layout,
  LayoutGrid,
  Circle,
  Save,
  ThumbsUp,
  AlertCircle,
  XCircle
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import 'moment/locale/es'
import confetti from 'canvas-confetti'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

moment.locale('es')
const localizer = momentLocalizer(moment)

// Fix for Vite/ESM double default export issue
const dndHOC = (withDragAndDrop as any).default || withDragAndDrop
const DnDCalendar = dndHOC(Calendar)

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function Planificacion() {
  const { profile, activeHotelId } = useAuth()
  const toast = useToast()
  const [tasks, setTasks] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [completingTask, setCompletingTask] = useState<any>(null)
  const [dbCategories, setDbCategories] = useState<any[]>([])
  const [roomFilter, setRoomFilter] = useState<'all' | 'pending' | 'done'>('all')
  
  // -- ESTADOS PARA EJECUCIÓN DETALLADA --
  const [isDetailedMode, setIsDetailedMode] = useState(false)
  const [rooms, setRooms] = useState<any[]>([])
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [inspectedRooms, setInspectedRooms] = useState<Record<string, any>>({})
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [inspectionChecklist, setInspectionChecklist] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const [editForm, setEditForm] = useState({ titulo: '', descripcion: '', frecuencia: '', proxima_fecha: '' })
  const [allElements, setAllElements] = useState([])
  const [selectedElements, setSelectedElements] = useState([])
  const [notes, setNotes] = useState('')
  const [view, setView] = useState(Views.MONTH)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [creatingTask, setCreatingTask] = useState(null)
  const [newForm, setNewForm] = useState({ titulo: '', descripcion: '', frecuencia: 'eventual', tipo: 'mantenimiento', foto_url: '', checklist_items: [] as string[] })
  const [uploading, setUploading] = useState(false)
  const [newCheckItem, setNewCheckItem] = useState('')

  // Formatear tareas para el calendario
  const events = tasks.map(t => ({
    id: t.id,
    title: t.titulo,
    start: new Date(t.proxima_fecha + 'T09:00:00'),
    end: new Date(t.proxima_fecha + 'T10:00:00'),
    allDay: true,
    resource: t
  }))

  const eventStyleGetter = (event) => {
    const overdue = isOverdue(event.resource.proxima_fecha)
    const type = event.resource.tipo || 'mantenimiento'
    
    let baseColor = 'rgba(99, 102, 241, 0.2)'
    let textColor = '#a5b4fc'
    let borderColor = 'rgba(99, 102, 241, 0.4)'

    if (overdue) {
      baseColor = 'rgba(239, 68, 68, 0.2)'
      textColor = '#fca5a5'
      borderColor = 'rgba(239, 68, 68, 0.4)'
    } else if (type === 'evento') {
      baseColor = 'rgba(16, 185, 129, 0.2)'
      textColor = '#6ee7b7'
      borderColor = 'rgba(16, 185, 129, 0.4)'
    } else if (type === 'revision') {
      baseColor = 'rgba(168, 85, 247, 0.2)'
      textColor = '#d8b4fe'
      borderColor = 'rgba(168, 85, 247, 0.4)'
    }

    return {
      style: {
        backgroundColor: baseColor,
        color: textColor,
        border: borderColor,
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: '600',
        padding: '2px 6px'
      }
    }
  }

  const onEventDrop = async ({ event, start }) => {
    const newDate = moment(start).format('YYYY-MM-DD')
    
    // Si la fecha es igual, no hacer nada
    if (newDate === event.resource.proxima_fecha) return

    try {
      const { error } = await supabase
        .from('mantenimiento_preventivo')
        .update({ proxima_fecha: newDate })
        .eq('id', event.id)
        .eq('hotel_id', activeHotelId)

      if (error) throw error
      
      toast.success(`Tarea "${event.title}" reprogramada para el ${newDate}`)
      fetchTasks()
    } catch (error: any) {
      toast.error('Error al reprogramar: ' + error.message)
    }
  }

  const handleSelectSlot = ({ start }) => {
    const dateStr = moment(start).format('YYYY-MM-DD')
    setCreatingTask({ fecha: dateStr })
    setNewForm({ 
      titulo: '', 
      descripcion: '', 
      frecuencia: 'eventual',
      tipo: 'mantenimiento',
      foto_url: '',
      checklist_items: []
    })
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = {
        titulo: newForm.titulo,
        descripcion: newForm.descripcion,
        frecuencia: newForm.frecuencia,
        proxima_fecha: creatingTask.fecha,
        tipo: newForm.tipo,
        foto_url: newForm.foto_url,
        checklist_items: newForm.checklist_items,
        hotel_id: activeHotelId
      }

      const { error } = await supabase
        .from('mantenimiento_preventivo')
        .insert([payload])

      if (error) throw error
      
      toast.success('Nueva tarea creada en el calendario')
      setCreatingTask(null)
      fetchTasks()
    } catch (error: any) {
      toast.error('Error al crear: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // -- FUNCIONES EJECUCIÓN DETALLADA --
  const handleStartDetailedExecution = async (task: any) => {
    try {
      setLoading(true);
      
      // 1. Buscar si ya existe una ejecución en progreso para esta tarea y este hotel
      const { data: existingExec } = await supabase
        .from('mantenimiento_ejecucion')
        .select('*')
        .eq('tarea_id', task.id)
        .eq('hotel_id', activeHotelId)
        .eq('estado', 'in_progress')
        .maybeSingle();

      let execId = existingExec?.id;

      if (!execId) {
        // 2. Si no existe, crear una nueva
        const { data: newExec, error: execError } = await supabase
          .from('mantenimiento_ejecucion')
          .insert([{
            tarea_id: task.id,
            hotel_id: activeHotelId,
            tecnico_id: profile?.id,
            estado: 'in_progress'
          }])
          .select()
          .single();

        if (execError) throw execError;
        execId = newExec.id;
        toast.info("Iniciando nueva sesión de mantenimiento");
      } else {
        toast.info("Resumiendo sesión de mantenimiento guardada");
      }
      
      setExecutionId(execId);
      setExecutingTaskId(task.id);
      setIsDetailedMode(true);
      setInspectedRooms({});
      
      // 3. Cargar las entidades ya revisadas en esta ejecución
      const { data: entities } = await supabase
        .from('mantenimiento_entidades')
        .select('*')
        .eq('ejecucion_id', execId);
      
      if (entities?.length) {
        const mapped = entities.reduce((acc: any, ent: any) => {
          acc[ent.entidad_id] = { status: ent.estado, checklist: ent.checklist_resultados };
          return acc;
        }, {});
        setInspectedRooms(mapped);
      }
    } catch (error: any) {
      toast.error("Error al iniciar ejecución: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndExit = () => {
    setIsDetailedMode(false);
    setExecutionId(null);
    setExecutingTaskId(null);
    setInspectedRooms({});
    setCompletingTask(null);
    toast.success("Progreso guardado localmente (Sesión sigue activa en la nube)");
  };

  const handleOpenInspection = (room: any) => {
    setSelectedRoom(room);
    const existing = inspectedRooms[room.id];
    if (existing) {
      setInspectionChecklist(existing.checklist);
    } else {
      const task = tasks.find(t => t.id === executingTaskId);
      // Fallback: item-specific checklist OR category items
      const checklist = (task?.checklist_items?.length > 0) 
        ? task.checklist_items 
        : (dbCategories.find(c => c.nombre === task?.categoria)?.subcategorias || []);
      
      setInspectionChecklist(checklist.map((name: string) => ({ name, status: 'bueno' })));
    }
  };

  const handleToggleItemStatus = (index: number, newStatus: 'bueno' | 'regular' | 'malo') => {
    const updated = [...inspectionChecklist];
    updated[index].status = newStatus;
    setInspectionChecklist(updated);
  };

  const handleSaveInspection = async () => {
    if (!selectedRoom || !executionId) return;
    
    const hasBad = inspectionChecklist.some(i => i.status === 'malo');
    const hasRegular = inspectionChecklist.some(i => i.status === 'regular');
    let status: 'ok' | 'issue' = (hasBad || hasRegular) ? 'issue' : 'ok';

    try {
      const { error } = await supabase
        .from('mantenimiento_entidades')
        .upsert([{
          ejecucion_id: executionId,
          entidad_id: selectedRoom.id,
          entidad_nombre: selectedRoom.nombre,
          entidad_tipo: 'habitacion',
          estado: status,
          checklist_resultados: inspectionChecklist,
          hotel_id: activeHotelId
        }], { onConflict: 'ejecucion_id,entidad_id' });

      if (error) throw error;
      
      setInspectedRooms(prev => ({
        ...prev,
        [selectedRoom.id]: { status, checklist: inspectionChecklist }
      }));
      setSelectedRoom(null);
      toast.success(`Habitación ${selectedRoom.nombre} guardada`);
    } catch (error: any) {
      toast.error("Error al guardar: " + error.message);
    }
  };

  const handleFinishDetailedExecution = async () => {
    if (!executionId) return;

    const pendingCount = rooms.length - Object.keys(inspectedRooms).length;
    if (pendingCount > 0) {
      const proceed = window.confirm(`Atención: Aún faltan ${pendingCount} unidades por revisar. ¿Estás absolutamente seguro de que deseas FINALIZAR TODA la tarea semestral y programar la siguiente fecha? (Esta acción no se puede deshacer)`);
      if (!proceed) return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('mantenimiento_ejecucion')
        .update({ 
          estado: 'completed',
          completado_at: new Date().toISOString()
        })
        .eq('id', executionId);

      if (error) throw error;
      
      // Complete parent task and schedule next
      await executeStandardCompletion();
      toast.success("Mantenimiento finalizado con éxito");
      
      // Reset detailed mode states
      setIsDetailedMode(false);
      setExecutionId(null);
      setExecutingTaskId(null);
      setInspectedRooms({});
      setCompletingTask(null);
    } catch (error: any) {
      toast.error("Error al finalizar: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const executeStandardCompletion = async () => {
    if (!completingTask) return
    const todayString = new Date().toISOString().split('T')[0]
    const nextDate = calculateNextDate(todayString, completingTask.frecuencia)
    
    const { error: histError } = await supabase
      .from('historial_mantenimiento')
      .insert([{
        tarea_id: completingTask.id,
        completado_por: profile.id,
        notas: isDetailedMode ? 'Inspección detallada completada.' : notes,
        items_completados: isDetailedMode ? [] : selectedElements,
        hotel_id: activeHotelId
      }])
    
    if (histError) throw histError
    
    const { error: taskError } = await supabase
      .from('mantenimiento_preventivo')
      .update({ proxima_fecha: nextDate, ultima_ejecucion: new Date().toISOString() })
      .eq('id', completingTask.id)
      .eq('hotel_id', activeHotelId)
    
    if (taskError) throw taskError
    
    setMsg({ type: 'success', text: `Tarea "${completingTask.titulo}" completada. Próxima revisión: ${nextDate}` })
    
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#10b981', '#f59e0b']
    })

    fetchTasks()
    fetchHistory()
  }

  const handleCompleteTask = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await executeStandardCompletion();
      setCompletingTask(null)
      setSelectedElements([])
      setNotes('')
    } catch (error: any) {
      setMsg({ type: 'error', text: `Error al completar tarea: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchHistory()
    fetchElements()
    fetchCategories()
    if (activeHotelId) {
       // Fetch rooms for detailed maintenance
       supabase.from('habitaciones').select('*').eq('hotel_id', activeHotelId).order('nombre')
         .then(({ data }) => setRooms(data || []));
    }
  }, [activeHotelId])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('mantenimiento_categorias').select('*').order('nombre');
      if (error) throw error;
      setDbCategories(data || []);
    } catch (e: any) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchTasks = async () => {
    try {
      const cached = await dbService.getAll('mantenimiento')
      if (cached && cached.length > 0 && loading) {
        setTasks(cached)
      }

      let query = supabase
        .from('mantenimiento_preventivo')
        .select('*')
        .order('proxima_fecha', { ascending: true })
      
      if (activeHotelId) query = query.eq('hotel_id', activeHotelId);
      
      const { data, error } = await query
      if (error) throw error
      setTasks(data || [])
      await dbService.putBatch('mantenimiento', data || [])
    } catch (error) {
      console.error('Error fetching maintenance:', error)
    }
  }

  const fetchHistory = async () => {
    try {
      let query = supabase
        .from('historial_mantenimiento')
        .select(`
          *,
          tarea:tarea_id (titulo, frecuencia),
          perfil:completado_por (nombre)
        `)
        .order('completado_el', { ascending: false })
        .limit(20)
      
      if (activeHotelId) query = query.eq('hotel_id', activeHotelId);

      const { data, error } = await query
      if (error) throw error
      setHistory(data || [])
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchElements = async () => {
    try {
      let query = supabase.from('elementos_mantenimiento').select('*')
      if (activeHotelId) query = query.eq('hotel_id', activeHotelId)
      const { data, error } = await query
      if (error) throw error
      setAllElements(data || [])
    } catch (error) {
      console.error('Error fetching elements:', error)
    }
  }

  const calculateNextDate = (currentDate, frequency) => {
    const date = new Date(currentDate)
    switch (frequency) {
      case 'diaria': date.setDate(date.getDate() + 1); break;
      case 'semanal': date.setDate(date.getDate() + 7); break;
      case 'mensual': date.setMonth(date.getMonth() + 1); break;
      case 'trimestral': date.setMonth(date.getMonth() + 3); break;
      case 'semestral': date.setMonth(date.getMonth() + 6); break;
      case 'anual': date.setFullYear(date.getFullYear() + 1); break;
      default: date.setDate(date.getDate() + 1);
    }
    return date.toISOString().split('T')[0]
  }

  const openEditModal = (task) => {
    setEditingTask(task)
    setEditForm({
      titulo: task.titulo || '',
      descripcion: task.descripcion || '',
      frecuencia: task.frecuencia || 'mensual',
      proxima_fecha: task.proxima_fecha || ''
    })
  }

  const handleUpdateTask = async (e) => {
    e.preventDefault()
    if (!editingTask) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('mantenimiento_preventivo')
        .update({
          titulo: editForm.titulo,
          descripcion: editForm.descripcion,
          frecuencia: editForm.frecuencia,
          proxima_fecha: editForm.proxima_fecha
        })
        .eq('id', editingTask.id)
        .eq('hotel_id', activeHotelId)
      if (error) throw error
      setMsg({ type: 'success', text: `Tarea "${editForm.titulo}" actualizada correctamente.` })
      setEditingTask(null)
      fetchTasks()
    } catch (error) {
      setMsg({ type: 'error', text: `Error al actualizar: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTask = async (task) => {
    if (!confirm(`¿Eliminar la tarea "${task.titulo}"? Esta acción no se puede deshacer.`)) return
    try {
      const { error } = await supabase
        .from('mantenimiento_preventivo')
        .delete()
        .eq('id', task.id)
        .eq('hotel_id', activeHotelId)
      if (error) throw error
      setMsg({ type: 'success', text: `Tarea "${task.titulo}" eliminada.` })
      fetchTasks()
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message)
    }
  }

  // --- Exportar reportes ---
  const exportToCSV = () => {
    const headers = ['Título', 'Descripción', 'Frecuencia', 'Próxima Fecha', 'Última Ejecución']
    const csvData = tasks.map(t => [
      `"${(t.titulo || '').replace(/"/g, '""')}"`,
      `"${(t.descripcion || '').replace(/"/g, '""')}"`,
      t.frecuencia,
      t.proxima_fecha,
      t.ultima_ejecucion ? new Date(t.ultima_ejecucion).toLocaleDateString() : 'Nunca'
    ])
    let csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n')

    if (history.length > 0) {
      csvContent += '\n\nHistorial de Ejecuciones\nTarea,Fecha,Usuario,Notas\n'
      csvContent += history.map(h => [
        `"${h.tarea?.titulo || ''}"`,
        new Date(h.completado_el).toLocaleString(),
        `"${h.perfil?.nombre || ''}"`,
        `"${(h.notas || '').replace(/"/g, '""')}"`
      ].join(',')).join('\n')
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Mantenimiento_VSuite_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    setShowExportMenu(false)
  }

  const exportToICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//V-Suite//HotelOps//ES\n"
    tasks.forEach(task => {
      const start = moment(task.proxima_fecha).format('YYYYMMDD')
      icsContent += "BEGIN:VEVENT\n"
      icsContent += `SUMMARY:${task.titulo}\n`
      icsContent += `DTSTART;VALUE=DATE:${start}\n`
      icsContent += `DESCRIPTION:${task.descripcion || ''}\n`
      icsContent += "END:VEVENT\n"
    })
    icsContent += "END:VCALENDAR"
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `Calendario_Hotel_${moment().format('YYYY-MM-DD')}.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowExportMenu(false)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Reporte de Mantenimiento Preventivo', 14, 22)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`V-Suite — ${new Date().toLocaleDateString()}`, 14, 30)

    const tableData = tasks.map(t => [
      t.titulo,
      t.frecuencia,
      t.proxima_fecha,
      t.ultima_ejecucion ? new Date(t.ultima_ejecucion).toLocaleDateString() : 'Nunca',
      isOverdue(t.proxima_fecha) ? '⚠ Vencida' : '✓ Al día'
    ])

    autoTable(doc, {
      startY: 36,
      head: [['Tarea', 'Frecuencia', 'Próxima', 'Última', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 9 }
    })

    if (history.length > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY || 80
      doc.setFontSize(14)
      doc.setTextColor(0)
      doc.text('Historial de Ejecuciones', 14, finalY + 12)

      const histData = history.map(h => [
        h.tarea?.titulo || '',
        new Date(h.completado_el).toLocaleString(),
        h.perfil?.nombre || '',
        (h.items_completados || []).join(', '),
        h.notas || ''
      ])

      autoTable(doc, {
        startY: finalY + 16,
        head: [['Tarea', 'Fecha', 'Usuario', 'Elementos', 'Notas']],
        body: histData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 8 }
      })
    }

    doc.save(`Mantenimiento_VSuite_${new Date().toISOString().split('T')[0]}.pdf`)
    setShowExportMenu(false)
  }

  const isOverdue = (dateString) => {
    const today = new Date().toISOString().split('T')[0]
    return dateString <= today
  }

  const generarCertificadoIndividual = async (h) => {
    const doc = new jsPDF()
    const hotelName = activeHotelId ? `Hotel ID: ${activeHotelId}` : 'Hotel Central'
    
    // Configuración inicial
    doc.setFillColor(34, 40, 49)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.text('CERTIFICADO DE MANTENIMIENTO', 105, 18, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Sistema de Gestión de Operaciones - ${hotelName}`, 105, 28, { align: 'center' })

    // Información General
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Detalles del Servicio', 14, 55)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Tarea: ${h.tarea?.titulo}`, 14, 65)
    doc.text(`Técnico: ${h.perfil?.nombre}`, 14, 70)
    doc.text(`Fecha/Hora: ${new Date(h.completado_el).toLocaleString()}`, 14, 75)
    doc.text(`ID Registro: ${h.id.substring(0, 8)}...`, 14, 80)

    // Checklist
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Puntos Verificados', 14, 95)
    
    const tableData = (h.items_completados || []).map(item => [item, '✓ Correcto'])
    autoTable(doc, {
      startY: 100,
      head: [['Punto de Inspección', 'Estado']],
      body: tableData.length > 0 ? tableData : [['Sin elementos especificados', '-']],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] }
    })

    const finalY = (doc as any).lastAutoTable?.finalY || 120

    // Notas
    if (h.notes) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Notas / Observaciones:', 14, finalY + 15)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(h.notas || 'Sin observaciones.', 14, finalY + 22)
    }

    doc.save(`Certificado_${h.tarea?.titulo}_${new Date(h.completado_el).getTime()}.pdf`)
  }

  const handleClearHistory = async () => {
    if (!confirm('¿Borrar TODO el historial de mantenimiento de este hotel? Esta acción no se puede deshacer.')) return
    try {
      const { error } = await supabase.from('historial_mantenimiento').delete().eq('hotel_id', activeHotelId)
      if (error) throw error
      setHistory([])
      setMsg({ type: 'success', text: 'Historial borrado correctamente.' })
    } catch (error: any) {
      toast.error('Error al borrar historial: ' + error.message)
    }
  }

  const moveNext = () => {
    if (view === Views.MONTH) setCurrentDate(moment(currentDate).add(1, 'month').toDate())
    else if (view === Views.WEEK) setCurrentDate(moment(currentDate).add(1, 'week').toDate())
    else setCurrentDate(moment(currentDate).add(1, 'day').toDate())
  }

  const movePrev = () => {
    if (view === Views.MONTH) setCurrentDate(moment(currentDate).subtract(1, 'month').toDate())
    else if (view === Views.WEEK) setCurrentDate(moment(currentDate).subtract(1, 'week').toDate())
    else setCurrentDate(moment(currentDate).subtract(1, 'day').toDate())
  }

  return (
    <div className="v-calendar-container">
      <div className="page-header mb-xl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Planificación de Mantenimiento</h1>
          <p className="page-subtitle">Revisiones preventivas y tareas recurrentes</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-secondary flex items-center gap-sm" onClick={() => setShowExportMenu(!showExportMenu)}>
            <Download size={18} />
            <span>Exportar</span>
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-sm w-48 glass-card border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 animate-fade-in" style={{ top: '100%' }}>
              <button className="w-full text-left px-md py-sm hover:bg-white/5 flex items-center gap-sm transition-colors text-sm" onClick={exportToCSV}>
                <FileSpreadsheet size={16} className="text-success" /> Descargar CSV
              </button>
              <button className="w-full text-left px-md py-sm hover:bg-white/5 flex items-center gap-sm transition-colors text-sm border-t border-white/5" onClick={exportToPDF}>
                <FileText size={16} className="text-danger" /> Descargar PDF
              </button>
              <button className="w-full text-left px-md py-sm hover:bg-white/5 flex items-center gap-sm transition-colors text-sm border-t border-white/5" onClick={exportToICS}>
                <CalendarIcon size={16} className="text-accent" /> Sincronizar (.ics)
              </button>
            </div>
          )}
        </div>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'success' ? 'success' : 'danger'} mb-lg`}>
          <span>{msg.text}</span>
        </div>
      )}

      {/* V-CALENDAR INTERACTIVO */}
      <section className="mb-xl glass-card overflow-hidden">
        <div className="cal-header">
          <div className="flex items-center gap-md">
            <button className="btn-icon btn-ghost" onClick={movePrev}><ChevronLeft size={20} /></button>
            <div className="cal-title">
              <h2>{moment(currentDate).format('MMMM YYYY')}</h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setCurrentDate(new Date())}>Hoy</button>
            </div>
            <button className="btn-icon btn-ghost" onClick={moveNext}><ChevronRight size={20} /></button>
          </div>
          
          <div className="flex gap-xs bg-black/20 p-xs rounded-lg">
            <button className={`btn btn-xs ${view === Views.MONTH ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView(Views.MONTH)}>Mes</button>
            <button className={`btn btn-xs ${view === Views.WEEK ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView(Views.WEEK)}>Semana</button>
            <button className={`btn btn-xs ${view === Views.DAY ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView(Views.DAY)}>Día</button>
            <button className={`btn btn-xs ${view === Views.AGENDA ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView(Views.AGENDA)}>Agenda</button>
          </div>
        </div>

        <div className="v-calendar-container" style={{ height: '500px' }}>
          <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%', padding: '1rem' }}
            messages={{
              next: "Sig.",
              previous: "Ant.",
              today: "Hoy",
              month: "Mes",
              week: "Semana",
              day: "Día",
              agenda: "Agenda",
              date: "Fecha",
              time: "Hora",
              event: "Evento",
              noEventsInRange: "No hay tareas en este rango"
            }}
            selectable
            resizable
            onEventDrop={onEventDrop}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={(e) => setCompletingTask(e.resource)}
            eventPropGetter={eventStyleGetter}
            view={view}
            onView={setView}
            date={currentDate}
            onNavigate={setCurrentDate}
            toolbar={false} // Usamos nuestro toolbar custom arriba
          />
        </div>
      </section>

      <div className="grid-2 gap-xl">
        {/* TAREAS PROGRAMADAS */}
        <section>
          <div className="section-header mb-md flex items-center gap-sm">
            <Clock className="text-accent" size={20} />
            <h2 className="text-lg">Tareas Programadas</h2>
          </div>
          <div className="flex flex-column gap-md">
            {tasks.length === 0 ? (
              <div className="glass-card p-xl text-center text-muted">
                No hay tareas programadas. Configúralas en el panel de Administración.
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={`glass-card p-lg ${isOverdue(task.proxima_fecha) ? 'border-l-4 border-danger' : 'border-l-4 border-accent'}`}>
                  <div className="flex gap-md items-start">
                    {task.foto_url && (
                      <div className="task-thumbnail" style={{ flexShrink: 0 }}>
                        <img src={task.foto_url} alt={task.titulo} className="w-16 h-16 rounded-md object-cover border border-white/10" />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-sm mb-xs">
                        <h3 className="font-bold">{task.titulo}</h3>
                        <span className="badge badge-secondary text-xs">{task.frecuencia}</span>
                      </div>
                      <p className="text-sm text-muted mb-sm">{task.descripcion}</p>
                      <div className="flex items-center gap-md text-xs">
                        <span className={`flex items-center gap-xs ${isOverdue(task.proxima_fecha) ? 'text-danger font-bold' : 'text-muted'}`}>
                          <Clock size={12} /> Próxima: {task.proxima_fecha}
                        </span>
                        {task.ultima_ejecucion && (
                          <span className="flex items-center gap-xs text-muted">
                            <CheckCircle size={12} /> Última: {new Date(task.ultima_ejecucion).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-xs" style={{ flexShrink: 0 }}>
                      <button className="btn-icon btn-ghost" onClick={() => openEditModal(task)} title="Editar tarea"
                        style={{ color: '#6366f1' }}>
                        <Edit3 size={16} />
                      </button>
                      <button className="btn-icon btn-ghost" onClick={() => handleDeleteTask(task)} title="Eliminar tarea"
                        style={{ color: '#ef4444' }}>
                        <Trash2 size={16} />
                      </button>
                      <button className={`btn ${isOverdue(task.proxima_fecha) ? 'btn-primary' : 'btn-secondary'} btn-sm flex items-center gap-xs`}
                        onClick={() => setCompletingTask(task)}>
                        <Check size={16} /> Completar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* HISTORIAL */}
        <section>
          <div className="section-header mb-md flex items-center gap-sm" style={{ justifyContent: 'space-between' }}>
            <div className="flex items-center gap-sm">
              <History className="text-accent" size={20} />
              <h2 className="text-lg">Historial Reciente</h2>
            </div>
            {history.length > 0 && (
              <button className="btn-icon btn-ghost" onClick={handleClearHistory} title="Borrar historial"
                style={{ color: '#ef4444' }}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <div className="glass-card overflow-hidden">
            <div className="p-none scroll-y" style={{maxHeight: '600px'}}>
              {history.length === 0 ? (
                <div className="p-xl text-center text-muted">Aún no hay registros en el historial.</div>
              ) : (
                <table className="config-table">
                  <thead><tr><th>Tarea</th><th>Fecha</th><th>Usuario</th><th className="text-right">Acción</th></tr></thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id}>
                        <td>
                          <div className="flex flex-column">
                            <span className="font-bold">{h.tarea?.titulo}</span>
                            <div className="flex flex-wrap gap-xs mt-xs">
                              {h.items_completados?.map((item, idx) => (
                                <span key={idx} className="badge badge-success text-xxs py-none px-xs">
                                  <Check size={8} /> {item}
                                </span>
                              ))}
                            </div>
                            <span className="text-xs text-muted italic mt-xs">{h.notas}</span>
                          </div>
                        </td>
                        <td className="text-xs text-muted">{new Date(h.completado_el).toLocaleString()}</td>
                        <td>
                          <div className="flex items-center gap-xs text-xs">
                            <User size={12} /> {h.perfil?.nombre}
                          </div>
                        </td>
                        <td className="text-right">
                          <button 
                            className="btn btn-xs btn-ghost text-accent flex items-center gap-xs ml-auto"
                            onClick={() => generarCertificadoIndividual(h)}
                            title="Descargar Certificado PDF"
                          >
                            <FileText size={12} />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* MODAL CREAR TAREA (Desde Calendario) */}
      {creatingTask && (
        <div className="modal-overlay" onClick={() => setCreatingTask(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Añadir a Calendario ({moment(creatingTask.fecha).format('DD/MM')})</h2>
              <button className="btn-icon btn-ghost" onClick={() => setCreatingTask(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                <div className="input-group mb-md">
                  <label className="input-label">Título del Trabajo / Evento</label>
                  <input className="input" type="text" value={newForm.titulo} required autoFocus
                    placeholder="Ej: Revisión Calderas, Evento Corporativo..."
                    onChange={e => setNewForm({...newForm, titulo: e.target.value})} />
                </div>
                <div className="input-group mb-md">
                  <label className="input-label">Tipo de Actividad</label>
                  <div className="flex gap-sm">
                    <button type="button" 
                      className={`btn btn-sm flex-1 ${newForm.tipo === 'mantenimiento' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setNewForm({...newForm, tipo: 'mantenimiento'})}>Mantenimiento</button>
                    <button type="button" 
                      className={`btn btn-sm flex-1 ${newForm.tipo === 'evento' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setNewForm({...newForm, tipo: 'evento'})}>Evento</button>
                    <button type="button" 
                      className={`btn btn-sm flex-1 ${newForm.tipo === 'revision' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setNewForm({...newForm, tipo: 'revision'})}>Revisión</button>
                  </div>
                </div>
                <div className="input-group mb-md">
                  <label className="input-label">Descripción / Detalles</label>
                  <textarea className="input" rows={3} value={newForm.descripcion}
                    placeholder="Detalles adicionales sobre el trabajo..."
                    onChange={e => setNewForm({...newForm, descripcion: e.target.value})}></textarea>
                </div>
                <div className="input-group mb-md">
                  <label className="input-label">Foto Adjunta (Opcional)</label>
                  <input type="file" accept="image/*" className="input" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploading(true)
                      try {
                        const fileExt = file.name.split('.').pop()
                        const fileName = `${Math.random()}.${fileExt}`
                        const filePath = `calendar-assets/${fileName}`
                        const { error: uploadError } = await supabase.storage.from('maintenance_assets').upload(filePath, file)
                        if (uploadError) throw uploadError
                        const { data: { publicUrl } } = supabase.storage.from('maintenance_assets').getPublicUrl(filePath)
                        setNewForm({...newForm, foto_url: publicUrl})
                        toast.success('Foto subida correctamente')
                      } catch (error: any) {
                        toast.error('Error al subir: ' + error.message)
                      } finally {
                        setUploading(false)
                      }
                    }} />
                  {newForm.foto_url && (
                    <div className="mt-sm relative w-full h-32 rounded-lg overflow-hidden border border-white/10">
                      <img src={newForm.foto_url} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" className="absolute top-2 right-2 bg-danger p-1 rounded-full text-white"
                        onClick={() => setNewForm({...newForm, foto_url: ''})}><X size={12} /></button>
                    </div>
                  )}
                </div>
                <div className="input-group mb-md">
                  <label className="input-label">Frecuencia</label>
                  <select className="select" value={newForm.frecuencia}
                    onChange={e => setNewForm({...newForm, frecuencia: e.target.value})}>
                    <option value="eventual">Evento Único (Sin frecuencia)</option>
                    <option value="diaria">Diaria</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>

                {newForm.tipo === 'mantenimiento' && (
                  <div className="input-group mt-md border-t border-white/5 pt-md">
                    <label className="input-label">Checklist de Habitación (Opcional)</label>
                    <div className="flex gap-sm mb-sm">
                      <input 
                        type="text" 
                        className="input flex-1" 
                        placeholder="Añadir ítem (Cama, TV, etc.)"
                        value={newCheckItem}
                        onChange={e => setNewCheckItem(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newCheckItem.trim()) {
                              setNewForm(prev => ({ ...prev, checklist_items: [...prev.checklist_items, newCheckItem.trim()] }));
                              setNewCheckItem('');
                            }
                          }
                        }}
                      />
                      <button type="button" className="btn btn-secondary px-md" 
                        onClick={() => {
                          if (newCheckItem.trim()) {
                            setNewForm(prev => ({ ...prev, checklist_items: [...prev.checklist_items, newCheckItem.trim()] }));
                            setNewCheckItem('');
                          }
                        }}><Plus size={18} /></button>
                    </div>

                    <div className="flex flex-wrap gap-xs mb-md">
                      {['Cama', 'Sofá', 'Ducha', 'TV', 'Mesa'].map(item => (
                        <button key={item} type="button" 
                          className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10"
                          onClick={() => {
                            if (!newForm.checklist_items.includes(item)) {
                              setNewForm(prev => ({ ...prev, checklist_items: [...prev.checklist_items, item] }));
                            }
                          }}>+ {item}</button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-xs max-h-24 overflow-y-auto">
                      {newForm.checklist_items.map((item, i) => (
                        <div key={i} className="flex items-center gap-xs bg-accent/20 text-accent px-sm py-xs rounded text-xs border border-accent/30">
                          {item}
                          <X size={12} className="cursor-pointer hover:text-white" 
                            onClick={() => setNewForm({...newForm, checklist_items: newForm.checklist_items.filter((_, idx) => idx !== i)})} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setCreatingTask(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary ml-md" disabled={loading}>
                  {loading ? 'Creando...' : 'Guardar en Calendario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COMPLETAR TAREA */}
      {completingTask && (
        <div className="modal-overlay" onClick={() => setCompletingTask(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar Ejecución</h2>
              <button className="btn-icon btn-ghost" onClick={() => setCompletingTask(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCompleteTask}>
              <div className="modal-body">
                <div className="bg-accent-5 p-md rounded-md mb-md">
                  <h3 className="font-bold text-accent mb-xs">{completingTask.titulo}</h3>
                  <p className="text-sm opacity-80">{completingTask.descripcion || 'Sin descripción adicional.'}</p>
                </div>
                <div className="input-group">
                  <label className="input-label">Notas o Comentarios de la Revisión</label>
                  <textarea className="input" rows={3} placeholder="Escribe si encontraste algo inusual..."
                    value={notes} onChange={e => setNotes(e.target.value)}></textarea>
                </div>

                {completingTask.checklist_items?.length > 0 && (
                  <div className="mt-md p-md bg-amber-500/10 border border-amber-500/20 rounded-md">
                    <div className="flex items-center gap-sm text-amber-400 mb-xs">
                      <AlertTriangle size={16} />
                      <span className="font-bold text-sm">Inspección Detallada Requerida</span>
                    </div>
                    <p className="text-xs text-muted mb-md">Esta tarea tiene un checklist específico de habitaciones que debe completarse desde el panel de Mantenimiento para un registro detallado de estados.</p>
                    <button type="button" className="btn btn-sm btn-secondary w-full" onClick={() => {
                       // En un entorno real esto cambiaría la pestaña en Configuracion.tsx
                       // Por ahora informamos al usuario
                       toast.info("Usa la pestaña 'Mantenimiento' en Configuración para esta inspección detallada.");
                    }}>Ir a Panel de Mantenimiento</button>
                  </div>
                )}

                <div className="mt-lg">
                  <label className="input-label mb-sm">Elementos Revisados:</label>
                  <div className="bg-neutral-5 rounded-md border-dashed-accent p-md">
                    {allElements.filter(e => e.tarea_id === completingTask.id).length === 0 ? (
                      <p className="text-sm text-muted italic">Esta tarea no tiene sub-elementos configurados.</p>
                    ) : (
                      <div className="grid-2 gap-sm">
                        {allElements.filter(e => e.tarea_id === completingTask.id).map(element => (
                          <label key={element.id} className="flex items-center gap-md p-sm rounded-md cursor-pointer">
                            <input type="checkbox" className="checkbox-custom"
                              checked={selectedElements.includes(element.nombre)}
                              onChange={(e) => e.target.checked 
                                ? setSelectedElements([...selectedElements, element.nombre]) 
                                : setSelectedElements(selectedElements.filter(name => name !== element.nombre))} />
                            <span className="text-sm">{element.nombre}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted mt-lg">
                  Al confirmar, la tarea se programará automáticamente para la siguiente fecha ({completingTask.frecuencia}).
                </p>

                {/* BOTÓN PARA MODO DETALLADO */}
                {!isDetailedMode && (
                  <div className="mt-md pt-md border-t border-white/5">
                    <button 
                      type="button" 
                      className="btn btn-secondary w-full flex items-center justify-center gap-sm py-md"
                      onClick={() => handleStartDetailedExecution(completingTask)}
                    >
                      <Layers size={18} />
                      Iniciar Inspección Detallada por Habitación
                    </button>
                    <p className="text-[10px] text-muted text-center mt-xs">Usa este modo para registrar el estado individual de cada habitación.</p>
                  </div>
                )}

                {/* VISTA DE EJECUCIÓN DETALLADA (GRID DE HABITACIONES) */}
                {isDetailedMode && (
                  <div className="mt-lg border-t border-white/5 pt-lg space-y-lg">
                    <div className="flex flex-col gap-md">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-xxs text-accent font-black tracking-widest uppercase mb-1">PROGRESO DE REVISIÓN</span>
                          <h3 className="text-xl font-black text-white">Inspección de Unidades</h3>
                        </div>
                        <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                           <span className="text-xs text-white font-bold">{Object.keys(inspectedRooms).length} <span className="text-muted">/ {rooms.length}</span></span>
                        </div>
                      </div>

                      {/* FILTROS Y BÚSQUEDA */}
                      <div className="flex flex-col gap-sm">
                        <div className="flex p-1.5 bg-black/40 rounded-[1.25rem] border border-white/5">
                          {[
                            { id: 'all', label: 'Todas', icon: LayoutGrid },
                            { id: 'pending', label: 'Pendientes', icon: Clock },
                            { id: 'done', label: 'Revisadas', icon: ShieldCheck }
                          ].map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setRoomFilter(t.id as any)}
                              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${
                                roomFilter === t.id ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <t.icon size={12} />
                              {t.label}
                            </button>
                          ))}
                        </div>

                        <div className="relative group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" size={16} />
                          <input 
                            type="text" 
                            placeholder="Buscar por número o nombre..." 
                            className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 h-12 text-sm text-white placeholder:text-muted focus:border-accent/30 focus:bg-white/[0.08] transition-all outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-md custom-scrollbar custom-grid-animate">
                      {rooms
                        .filter(r => r.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
                        .filter(r => {
                          if (roomFilter === 'pending') return !inspectedRooms[r.id];
                          if (roomFilter === 'done') return !!inspectedRooms[r.id];
                          return true;
                        })
                        .map(room => {
                          const inspection = inspectedRooms[room.id];
                          return (
                            <button
                              key={room.id}
                              type="button"
                              onClick={() => handleOpenInspection(room)}
                              className={`relative group flex flex-col items-center justify-center p-4 rounded-[2rem] border transition-all duration-500 overflow-hidden ${
                                inspection?.status === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30' : 
                                inspection?.status === 'issue' ? 'bg-amber-500/10 border-amber-500/30' : 
                                'bg-white/5 border-white/5 hover:border-white/10'
                              }`}
                            >
                              {/* Background Glow */}
                              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${
                                inspection?.status === 'ok' ? 'from-emerald-500 to-transparent' : 
                                inspection?.status === 'issue' ? 'from-amber-500 to-transparent' : 'from-white to-transparent'
                              }`} />

                              <div className={`mb-3 p-3 rounded-2xl transition-all duration-300 transform group-hover:scale-110 ${
                                inspection?.status === 'ok' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : 
                                inspection?.status === 'issue' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40' : 
                                'bg-white/10 text-muted group-hover:bg-white/20'
                              }`}>
                                {inspection?.status === 'issue' ? <AlertTriangle size={20} /> : 
                                 inspection?.status === 'ok' ? <ShieldCheck size={20} /> : <div className="w-5 h-5 flex items-center justify-center"><Circle size={8} fill="currentColor" /></div>}
                              </div>

                              <span className="text-sm font-black text-white tracking-tight leading-none mb-1">{room.nombre}</span>
                              <span className={`text-[9px] font-black uppercase tracking-widest ${
                                inspection ? 'text-white/40' : 'text-muted/40'
                              }`}>
                                {inspection ? 'REVISADO' : 'PENDIENTE'}
                              </span>

                              {inspection && (
                                <div className="absolute top-3 right-3 animate-in zoom-in-50 duration-500">
                                   <div className={`w-2.5 h-2.5 rounded-full ${inspection.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'} ring-4 ring-black/20`} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                    </div>

                    <div className="flex flex-col gap-3 mt-lg pt-lg border-t border-white/5">
                      <button 
                        type="button" 
                        className={`w-full h-14 rounded-2xl font-black tracking-widest uppercase text-xs flex items-center justify-center gap-3 transition-opacity ${
                          Object.keys(inspectedRooms).length < rooms.length 
                          ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30' 
                          : 'bg-accent text-white shadow-xl shadow-accent/20'
                        }`}
                        onClick={handleFinishDetailedExecution}
                        disabled={loading}
                      >
                        {loading ? 'Finalizando...' : (
                          <>
                            <CheckCircle size={18} />
                            {Object.keys(inspectedRooms).length < rooms.length 
                              ? `FINALIZAR TODO (${Object.keys(inspectedRooms).length}/${rooms.length} LISTAS)` 
                              : 'FINALIZAR Y PROGRAMAR SIGUIENTE'}
                          </>
                        )}
                      </button>

                      <button 
                        type="button" 
                        className="w-full h-12 rounded-2xl bg-white/5 text-muted hover:text-white hover:bg-white/10 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-white/5"
                        onClick={handleSaveAndExit}
                      >
                        <Save size={16} />
                        GUARDAR PROGRESO Y CONTINUAR LUEGO
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {!isDetailedMode && (
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setCompletingTask(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary ml-md" disabled={loading}>
                    {loading ? 'Guardando...' : 'Confirmar Ejecución'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL INSPECCIÓN INDIVIDUAL (DENTRO DE EJECUCIÓN DETALLADA) */}
      {selectedRoom && (
        <div className="modal-overlay z-[100] backdrop-blur-md" onClick={() => setSelectedRoom(null)}>
          <div className="modal-content max-w-lg bg-[#0a0a0f]/95 border border-white/10 ring-1 ring-white/5 shadow-2xl overflow-hidden rounded-[2.5rem] animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="modal-header border-b border-white/5 py-lg px-xl bg-gradient-to-r from-accent/10 to-transparent">
              <div className="flex flex-col">
                <span className="text-[10px] text-accent font-black tracking-[0.2em] uppercase mb-1">INSPECCIÓN DE UNIDAD</span>
                <h2 className="text-2xl font-black text-white tracking-tight">Habitación {selectedRoom.nombre}</h2>
              </div>
              <button className="p-2.5 rounded-2xl bg-white/5 text-muted hover:text-white hover:bg-white/10 transition-all" onClick={() => setSelectedRoom(null)}><X size={20} /></button>
            </div>

            <div className="modal-body p-xl flex flex-col gap-sm overflow-y-auto custom-scrollbar" style={{ maxHeight: '60vh' }}>
              {inspectionChecklist.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <History size={64} className="text-muted mb-6 opacity-5 animate-pulse" />
                  <p className="text-base text-muted font-medium max-w-[240px] leading-relaxed">No hay elementos configurados para esta unidad.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {inspectionChecklist.map((item, idx) => (
                    <div key={idx} className="group flex items-center gap-4 p-4 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
                      <div className="flex-1 flex flex-col">
                        <span className="font-bold text-white text-base tracking-tight group-hover:translate-x-1 transition-transform">{item.name}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${
                          item.status === 'bueno' ? 'text-emerald-500' :
                          item.status === 'regular' ? 'text-amber-500' : 'text-rose-500'
                        }`}>
                          {item.status === 'bueno' ? 'Estado Cámara' : item.status === 'regular' ? 'Requiere Atención' : 'Defecto Crítico'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 p-1.5 bg-black/40 rounded-2xl border border-white/5">
                        <button 
                          type="button"
                          onClick={() => handleToggleItemStatus(idx, 'bueno')}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                            item.status === 'bueno' 
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                              : 'text-muted hover:text-white hover:bg-white/5'
                          }`}
                          title="Bueno"
                        >
                          <ThumbsUp size={16} className={item.status === 'bueno' ? 'animate-bounce' : ''} />
                          <span className="text-[10px] font-black">OK</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => handleToggleItemStatus(idx, 'regular')}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                            item.status === 'regular' 
                              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                              : 'text-muted hover:text-white hover:bg-white/5'
                          }`}
                          title="Regular"
                        >
                          <AlertCircle size={16} className={item.status === 'regular' ? 'animate-pulse' : ''} />
                          <span className="text-[10px] font-black">FIX</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => handleToggleItemStatus(idx, 'malo')}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                            item.status === 'malo' 
                              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                              : 'text-muted hover:text-white hover:bg-white/5'
                          }`}
                          title="Malo"
                        >
                          <XCircle size={16} className={item.status === 'malo' ? 'animate-pulse' : ''} />
                          <span className="text-[10px] font-black">BAD</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-xl border-t border-white/5 bg-black/40 backdrop-blur-xl">
              <button 
                type="button" 
                className="w-full h-16 rounded-[2rem] bg-accent text-white font-black tracking-widest uppercase text-sm flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-accent/20 cursor-pointer disabled:opacity-50"
                onClick={handleSaveInspection}
                disabled={loading}
              >
                {loading ? (
                    <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <>
                        <ShieldCheck size={24} />
                        FINALIZAR INSPECCIÓN DE ÉSTA HABITACIÓN
                    </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR TAREA */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Tarea</h2>
              <button className="btn-icon btn-ghost" onClick={() => setEditingTask(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateTask}>
              <div className="modal-body">
                <div className="input-group mb-md">
                  <label className="input-label">Título</label>
                  <input className="input" type="text" value={editForm.titulo} required
                    onChange={e => setEditForm({...editForm, titulo: e.target.value})} />
                </div>
                <div className="input-group mb-md">
                  <label className="input-label">Descripción</label>
                  <textarea className="input" rows={3} value={editForm.descripcion}
                    onChange={e => setEditForm({...editForm, descripcion: e.target.value})}></textarea>
                </div>
                <div className="input-group mb-md">
                  <label className="input-label">Frecuencia</label>
                  <select className="select" value={editForm.frecuencia}
                    onChange={e => setEditForm({...editForm, frecuencia: e.target.value})}>
                    <option value="diaria">Diaria</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Próxima Fecha Programada</label>
                  <input className="input" type="date" value={editForm.proxima_fecha} required
                    onChange={e => setEditForm({...editForm, proxima_fecha: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingTask(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary ml-md" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .planificacion-page { padding: var(--spacing-sm); }
        .grid-2 { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: var(--spacing-xl); }
        @media (max-width: 1024px) { .grid-2 { grid-template-columns: 1fr; } }
        .border-l-4 { border-left-width: 4px; }
        .scroll-y { overflow-y: auto; }
        .text-xxs { font-size: 0.65rem; }
        .py-none { padding-top: 0; padding-bottom: 0; }
        .checkbox-custom { width: 1.25rem; height: 1.25rem; accent-color: var(--color-accent); }
        .bg-accent-5 { background: rgba(99, 102, 241, 0.05); }
        .bg-neutral-5 { background: rgba(255,255,255,0.03); }
        .border-dashed-accent { border: 1px dashed rgba(99, 102, 241, 0.3); }
        .cursor-pointer { cursor: pointer; }
        .room-chip-btn { border: 1px solid transparent; }
        .room-chip-btn:hover { transform: scale(1.05); }
        .rbc-event { cursor: pointer; }
        .export-dropdown {
          position: absolute;
          right: 0;
          top: 100%;
          margin-top: 0.5rem;
          width: 12rem;
          background: rgba(17, 17, 40, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          overflow: hidden;
          z-index: 20;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: fadeIn 0.15s ease;
        }
        .export-item {
          width: 100%;
          text-align: left;
          padding: 0.6rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--color-text-primary);
          transition: background 0.15s;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .export-item:hover { background: rgba(255,255,255,0.05); }
        .export-item:last-child { border-bottom: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        /* Calendario Custom */
        .cal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(0, 0, 0, 0.2);
        }
        .cal-title { display: flex; align-items: center; gap: 1rem; }
        .cal-title h2 { font-size: 1.1rem; font-weight: 700; text-transform: capitalize; }

        /* V-Calendar Override */
        .v-calendar-container .rbc-month-view,
        .v-calendar-container .rbc-time-view {
          border: none;
          background: transparent;
        }
        .v-calendar-container .rbc-off-range-bg {
          background: rgba(0, 0, 0, 0.15);
        }
        .v-calendar-container .rbc-header {
          padding: 12px;
          font-weight: 700;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--color-text-muted);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .v-calendar-container .rbc-month-row {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .v-calendar-container .rbc-day-bg {
          border-left: 1px solid rgba(255, 255, 255, 0.05);
        }
        .v-calendar-container .rbc-today {
          background: rgba(99, 102, 241, 0.05);
        }
        .v-calendar-container .rbc-event {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .v-calendar-container .rbc-event:hover {
          transform: translateY(-2px);
        }
        .v-calendar-container .rbc-show-more {
          background: rgba(255, 255, 255, 0.1);
          color: var(--color-accent);
          font-weight: 700;
          font-size: 0.7rem;
          border-radius: 4px;
        }
        .v-calendar-container .rbc-addons-dnd-dragged-event {
          opacity: 0.5;
        }

        /* Agenda View Styling */
        .v-calendar-container .rbc-agenda-view {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .v-calendar-container .rbc-agenda-table {
          color: var(--color-text-primary);
        }
        .v-calendar-container .rbc-agenda-table thead > tr > th {
          background: rgba(99, 102, 241, 0.1);
          color: var(--color-accent);
          text-transform: uppercase;
          font-size: 0.75rem;
          padding: 12px;
          border-bottom: 2px solid rgba(99, 102, 241, 0.2);
        }
        .v-calendar-container .rbc-agenda-date-cell, 
        .v-calendar-container .rbc-agenda-time-cell {
          font-weight: 700;
          color: var(--color-text-muted);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }
        .v-calendar-container .rbc-agenda-event-cell {
          padding: 10px;
        }
        .v-calendar-container .rbc-agenda-empty {
          padding: 40px;
          text-align: center;
          color: var(--color-text-muted);
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
