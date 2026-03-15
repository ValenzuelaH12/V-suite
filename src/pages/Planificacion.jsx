import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { 
  ClipboardList, CheckCircle, Calendar, Clock, AlertCircle, 
  History, User, Check, Trash2, ArrowRight, X 
} from 'lucide-react'

export default function Planificacion() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [completingTask, setCompletingTask] = useState(null)
  const [allElements, setAllElements] = useState([])
  const [selectedElements, setSelectedElements] = useState([])
  const [notes, setNotes] = useState('')

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

      // 1. Guardar en historial
      const { error: histError } = await supabase
        .from('historial_mantenimiento')
        .insert([{
          tarea_id: completingTask.id,
          completado_por: profile.id,
          notas: notes,
          items_completados: selectedElements
        }])
      
      if (histError) throw histError

      // 2. Actualizar tarea original con nueva fecha
      const { error: taskError } = await supabase
        .from('mantenimiento_preventivo')
        .update({
          proxima_fecha: nextDate,
          ultima_ejecucion: new Date().toISOString()
        })
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

  const isOverdue = (dateString) => {
    const today = new Date().toISOString().split('T')[0]
    return dateString <= today
  }

  return (
    <div className="planificacion-page animate-fade-in">
      <div className="page-header mb-xl">
        <div>
          <h1 className="page-title">Planificación de Mantenimiento</h1>
          <p className="page-subtitle">Revisiones preventivas y tareas recurrentes</p>
        </div>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'success' ? 'success' : 'danger'} mb-lg`}>
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid-2 gap-xl">
        {/* TAREAS PROGRAMADAS */}
        <section>
          <div className="section-header mb-md flex items-center gap-sm">
            <Calendar className="text-accent" size={20} />
            <h2 className="text-lg">Tareas Programadas</h2>
          </div>
          
          <div className="flex flex-column gap-md">
            {tasks.length === 0 ? (
              <div className="glass-card p-xl text-center text-muted">
                No hay tareas programadas. Configúralas en el panel de Administración.
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={`glass-card p-lg flex justify-between items-center ${isOverdue(task.proxima_fecha) ? 'border-l-4 border-danger' : 'border-l-4 border-accent'}`}>
                  <div>
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
                  <button 
                    className={`btn ${isOverdue(task.proxima_fecha) ? 'btn-primary' : 'btn-secondary'} btn-sm flex items-center gap-xs`}
                    onClick={() => setCompletingTask(task)}
                  >
                    <Check size={16} /> Completar
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ÚLTIMAS EJECUCIONES */}
        <section>
          <div className="section-header mb-md flex items-center gap-sm">
            <History className="text-accent" size={20} />
            <h2 className="text-lg">Historial Reciente</h2>
          </div>
          
          <div className="glass-card overflow-hidden">
            <div className="p-none scroll-y" style={{maxHeight: '600px'}}>
              {history.length === 0 ? (
                <div className="p-xl text-center text-muted">Aún no hay registros en el historial.</div>
              ) : (
                <table className="config-table">
                  <thead>
                    <tr><th>Tarea</th><th>Fecha</th><th>Usuario</th></tr>
                  </thead>
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
                <div className="bg-accent/5 p-md rounded-md mb-md">
                  <h3 className="font-bold text-accent mb-xs">{completingTask.titulo}</h3>
                  <p className="text-sm opacity-80">{completingTask.descripcion || 'Sin descripción adicional.'}</p>
                </div>
                <div className="input-group">
                  <label className="input-label">Notas o Comentarios de la Revisión</label>
                  <textarea 
                    className="input" 
                    rows="3" 
                    placeholder="Escribe si encontraste algo inusual..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  ></textarea>
                </div>

                <div className="mt-lg">
                  <label className="input-label mb-sm">Elementos Revisados:</label>
                  <div className="bg-neutral/5 rounded-md border border-dashed border-accent/30 p-md">
                    {allElements.filter(e => e.tarea_id === completingTask.id).length === 0 ? (
                      <p className="text-sm text-muted italic">Esta tarea no tiene sub-elementos configurados.</p>
                    ) : (
                      <div className="grid-2 gap-sm">
                        {allElements.filter(e => e.tarea_id === completingTask.id).map(element => (
                          <label key={element.id} className="flex items-center gap-md p-sm hover:bg-accent/5 rounded-md cursor-pointer transition-colors border border-transparent hover:border-accent/10">
                            <input 
                              type="checkbox" 
                              className="checkbox-custom"
                              checked={selectedElements.includes(element.nombre)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedElements([...selectedElements, element.nombre])
                                } else {
                                  setSelectedElements(selectedElements.filter(name => name !== element.nombre))
                                }
                              }}
                            />
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

      <style>{`
        .planificacion-page { padding: var(--spacing-sm); }
        .grid-2 { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: var(--spacing-xl); }
        @media (max-width: 1024px) { .grid-2 { grid-template-columns: 1fr; } }
        .border-l-4 { border-left-width: 4px; }
        .scroll-y { overflow-y: auto; }
        .text-xxs { font-size: 0.65rem; }
        .py-none { padding-top: 0; padding-bottom: 0; }
        .checkbox-custom { width: 1.25rem; height: 1.25rem; accent-color: var(--color-accent); }
      `}</style>
    </div>
  )
}
