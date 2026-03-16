import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { 
  CheckCircle, Clock, 
  History, User, Check, X, ChevronLeft, ChevronRight,
  Download, FileText, FileSpreadsheet, Edit3, Trash2
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import 'moment/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

moment.locale('es')
const localizer = momentLocalizer(moment)
const DnDCalendar = withDragAndDrop(Calendar)

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function Planificacion() {
  const { profile } = useAuth()
  const toast = useToast()
  const [tasks, setTasks] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [completingTask, setCompletingTask] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [editForm, setEditForm] = useState({ titulo: '', descripcion: '', frecuencia: '', proxima_fecha: '' })
  const [allElements, setAllElements] = useState([])
  const [selectedElements, setSelectedElements] = useState([])
  const [notes, setNotes] = useState('')
  const [view, setView] = useState(Views.MONTH)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showExportMenu, setShowExportMenu] = useState(false)

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
    return {
      style: {
        backgroundColor: overdue ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
        color: overdue ? '#fca5a5' : '#a5b4fc',
        border: overdue ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
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

      if (error) throw error
      
      toast.success(`Tarea "${event.title}" reprogramada para el ${newDate}`)
      fetchTasks()
    } catch (error: any) {
      toast.error('Error al reprogramar: ' + error.message)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchHistory()
    fetchElements()
  }, [])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('mantenimiento_preventivo')
        .select('*')
        .order('proxima_fecha')
      if (error) throw error
      setTasks(data)
    } catch (error) {
      console.error('Error fetching maintenance:', error)
    }
  }

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('historial_mantenimiento')
        .select(`
          *,
          tarea:tarea_id (titulo, frecuencia),
          perfil:completado_por (nombre)
        `)
        .order('completado_el', { ascending: false })
        .limit(20)
      if (error) throw error
      setHistory(data)
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchElements = async () => {
    try {
      const { data, error } = await supabase.from('elementos_mantenimiento').select('*')
      if (error) throw error
      setAllElements(data)
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

  const handleCompleteTask = async (e) => {
    e.preventDefault()
    if (!completingTask) return
    setLoading(true)
    try {
      const todayString = new Date().toISOString().split('T')[0]
      const nextDate = calculateNextDate(todayString, completingTask.frecuencia)
      const { error: histError } = await supabase
        .from('historial_mantenimiento')
        .insert([{
          tarea_id: completingTask.id,
          completado_por: profile.id,
          notas: notes,
          items_completados: selectedElements
        }])
      if (histError) throw histError
      const { error: taskError } = await supabase
        .from('mantenimiento_preventivo')
        .update({ proxima_fecha: nextDate, ultima_ejecucion: new Date().toISOString() })
        .eq('id', completingTask.id)
      if (taskError) throw taskError
      setMsg({ type: 'success', text: `Tarea "${completingTask.titulo}" completada. Próxima revisión: ${nextDate}` })
      setCompletingTask(null)
      setSelectedElements([])
      setNotes('')
      fetchTasks()
      fetchHistory()
    } catch (error) {
      setMsg({ type: 'error', text: `Error al completar tarea: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  // --- Editar tarea ---
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

  const handleClearHistory = async () => {
    if (!confirm('¿Borrar TODO el historial de mantenimiento? Esta acción no se puede deshacer.')) return
    try {
      const { error } = await supabase.from('historial_mantenimiento').delete().neq('id', 0)
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
    <div className="planificacion-page animate-fade-in">
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
            <div className="export-dropdown">
              <button className="export-item" onClick={exportToCSV}>
                <FileSpreadsheet size={16} style={{ color: '#10b981' }} /> Descargar CSV
              </button>
              <button className="export-item" onClick={exportToPDF}>
                <FileText size={16} style={{ color: '#ef4444' }} /> Descargar PDF
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
                  <div className="flex justify-between items-start">
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
                  <thead><tr><th>Tarea</th><th>Fecha</th><th>Usuario</th></tr></thead>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </div>

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
                  <textarea className="input" rows="3" placeholder="Escribe si encontraste algo inusual..."
                    value={notes} onChange={e => setNotes(e.target.value)}></textarea>
                </div>
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
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setCompletingTask(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary ml-md" disabled={loading}>
                  {loading ? 'Guardando...' : 'Confirmar Ejecución'}
                </button>
              </div>
            </form>
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
                  <textarea className="input" rows="3" value={editForm.descripcion}
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
      `}</style>
    </div>
  )
}
