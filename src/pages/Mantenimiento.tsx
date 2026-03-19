import { useState, useEffect } from 'react'
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Plus, 
  X,
  ListChecks,
  AlertTriangle,
  History,
  ChevronRight,
  ClipboardList,
  User,
  MapPin,
  PlusCircle,
  MessageSquare,
  Play
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

// Tipos locales
type TaskStatus = 'pendiente' | 'completada' | 'cancelada';
type ItemState = 'ok' | 'aviso' | 'grave';

export default function MantenimientoTareas() {
  const { activeHotelId } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTask, setCurrentTask] = useState<any | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'pendientes' | 'historial'>('pendientes')
  const [plans, setPlans] = useState<any[]>([])

  useEffect(() => {
    fetchTasks()
    fetchPlans()
  }, [activeHotelId, view])

  const fetchTasks = async () => {
    if (!activeHotelId) return
    setLoading(true)
    try {
      const query = supabase
        .from('mantenimiento_tareas')
        .select(`
          *,
          plan:mantenimiento_planes(nombre, items_base)
        `)
        .eq('hotel_id', activeHotelId)

      if (view === 'pendientes') {
        query.eq('estado', 'pendiente').order('fecha_programada', { ascending: true })
      } else {
        query.eq('estado', 'completada').order('completada_en', { ascending: false }).limit(20)
      }

      const { data } = await query
      setTasks(data || [])
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
     if (!activeHotelId) return;
     const { data } = await supabase.from('mantenimiento_planes').select('*').eq('hotel_id', activeHotelId);
     setPlans(data || []);
  }

  const handleStartTask = (task: any) => {
    setCurrentTask(task)
    // Inicializar items desde el plan (items_base)
    const initialItems = task.plan.items_base.map((name: string) => ({
      nombre_item: name,
      estado: 'ok',
      observacion: '',
      es_manual: false
    }))
    setItems(initialItems)
  }

  const handleAddItem = () => {
    if (!newItemName.trim()) return
    setItems([...items, {
      nombre_item: newItemName,
      estado: 'ok',
      observacion: '',
      es_manual: true
    }])
    setNewItemName('')
  }

  const handleUpdateItem = (index: number, updates: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    setItems(newItems)
  }

  const handleFinishTask = async () => {
    if (!currentTask) return
    setSaving(true)
    try {
      const hotelId = activeHotelId;
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // 1. Guardar cada item en mantenimiento_items_log
      const itemLogs = items.map(item => ({
        tarea_id: currentTask.id,
        nombre_item: item.nombre_item,
        estado: item.estado,
        observacion: item.observacion,
        es_manual: item.es_manual
      }))

      const { error: logErr } = await supabase.from('mantenimiento_items_log').insert(itemLogs)
      if (logErr) throw logErr

      // 2. Marcar tarea como completada
      const { error: taskErr } = await supabase
        .from('mantenimiento_tareas')
        .update({
          estado: 'completada',
          completada_en: new Date().toISOString(),
          usuario_id: userId
        })
        .eq('id', currentTask.id)

      if (taskErr) throw taskErr

      alert('✅ Tarea finalizada con éxito.')
      setCurrentTask(null)
      fetchTasks()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Lanzar un plan (Generar tareas para todo su scope)
  const handleLaunchPlan = async (plan: any) => {
     if (!confirm(`¿Generar tareas para todas las ubicaciones del plan "${plan.nombre}"?`)) return;
     setLoading(true);
     try {
        const tareasParaInsertar: any[] = [];
        const hoy = new Date().toISOString().split('T')[0];

        plan.scope.forEach((zona: any) => {
           zona.espacios.forEach((espacio: string) => {
              tareasParaInsertar.push({
                 hotel_id: activeHotelId,
                 plan_id: plan.id,
                 zona_nombre: zona.zona,
                 espacio_nombre: espacio,
                 fecha_programada: hoy,
                 estado: 'pendiente'
              });
           });
        });

        if (tareasParaInsertar.length === 0) {
           alert('El plan no tiene ubicaciones configuradas.');
           return;
        }

        const { error } = await supabase.from('mantenimiento_tareas').insert(tareasParaInsertar);
        if (error) throw error;

        alert(`🚀 Se han generado ${tareasParaInsertar.length} tareas nuevas.`);
        fetchTasks();
     } catch (err: any) {
        alert('Error: ' + err.message);
     } finally {
        setLoading(false);
     }
  }

  return (
    <div className="v-tasks-page p-md md:p-xl animate-fade-in custom-scrollbar h-screen overflow-y-auto pb-[100px]">
      {/* HEADER */}
      <div className="v-page-header mb-xl bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
        <div className="flex flex-col gap-xs">
          <h1 className="v-page-title flex items-center gap-md">
            <ClipboardList className="text-accent" size={40} />
            Mantenimiento Operativo (V5)
          </h1>
          <p className="v-page-subtitle uppercase text-[10px] font-black tracking-[0.2em] opacity-40">Gestión de Tareas por Alcance Hierárquico</p>
        </div>

        <div className="flex gap-md bg-black/20 p-2 rounded-3xl border border-white/5">
           <button 
             onClick={() => setView('pendientes')}
             className={`px-8 py-3 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all ${view === 'pendientes' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:bg-white/5'}`}
           >
             <Clock className="inline-block mr-2" size={14} /> Pendientes
           </button>
           <button 
             onClick={() => setView('historial')}
             className={`px-8 py-3 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all ${view === 'historial' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:bg-white/5'}`}
           >
             <History className="inline-block mr-2" size={14} /> Historial
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
         {/* SIDEBAR: LANZAR PLANES */}
         <div className="lg:col-span-3 space-y-md">
            <h3 className="text-[10px] font-black uppercase text-muted tracking-widest px-md mb-md">Lanzar Planes Maestros</h3>
            {plans.map(plan => (
               <button
                  key={plan.id}
                  onClick={() => handleLaunchPlan(plan)}
                  className="w-full text-left p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/5 transition-all group flex flex-col gap-2"
               >
                  <div className="flex justify-between items-center w-full">
                     <span className="font-black text-sm text-white">{plan.nombre}</span>
                     <Play size={16} className="text-accent opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                  <div className="flex gap-2">
                     <span className="text-[9px] font-black text-muted uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-lg">{plan.frecuencia}</span>
                     <span className="text-[9px] font-black text-accent uppercase tracking-widest border border-accent/20 px-2 py-0.5 rounded-lg">{plan.scope?.length} Zonas</span>
                  </div>
               </button>
            ))}
         </div>

         {/* LISTADO DE TAREAS */}
         <div className="lg:col-span-9">
            {loading ? (
               <div className="flex items-center justify-center p-20">
                  <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                  {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onStart={() => handleStartTask(task)} isHistory={view === 'historial'} />
                  ))}
                  {tasks.length === 0 && (
                     <div className="col-span-full py-40 flex flex-col items-center justify-center text-muted border-2 border-dashed border-white/5 rounded-[4rem] bg-white/[0.01]">
                        <ListChecks size={64} className="mb-md opacity-10" />
                        <p className="font-black text-sm uppercase tracking-widest opacity-30">No hay tareas pendientes</p>
                        <p className="text-[10px] uppercase font-bold tracking-widest mt-2 opacity-20">Lanza un plan desde el panel lateral</p>
                     </div>
                  )}
               </div>
            )}
         </div>
      </div>

      {/* MODAL DE CHECKLIST */}
      {currentTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-md bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="v-glass-card w-full max-w-2xl shadow-[0_0_50px_rgba(99,102,241,0.2)] border-white/10 p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-[3rem]">
              <div className="p-xl border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                 <div className="flex items-center gap-md">
                    <div className="p-4 bg-accent/20 text-accent rounded-3xl">
                       <ClipboardList size={28} />
                    </div>
                    <div>
                       <span className="badge badge-accent text-[9px] font-black uppercase tracking-widest mb-xs">{currentTask.plan?.nombre}</span>
                       <h3 className="text-2xl font-black">
                          <span className="text-muted text-lg mr-2 font-normal italic">{currentTask.zona_nombre}</span>
                          {currentTask.espacio_nombre}
                       </h3>
                    </div>
                 </div>
                 <button onClick={() => setCurrentTask(null)} className="p-2 text-muted hover:text-white"><X size={24} /></button>
              </div>

              <div className="p-xl space-y-md overflow-y-auto custom-scrollbar flex-1">
                 {items.map((item, idx) => (
                   <div key={idx} className={`p-5 rounded-[2rem] border transition-all ${item.es_manual ? 'bg-accent/5 border-accent/20' : 'bg-white/5 border-white/5'}`}>
                      <div className="flex justify-between items-center gap-md mb-md">
                         <div className="flex items-center gap-md">
                            <div className={`p-2 rounded-xl ${item.estado === 'ok' ? 'bg-success/10 text-success' : item.estado === 'aviso' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                               {item.es_manual ? <PlusCircle size={16} /> : <CheckCircle2 size={16} />}
                            </div>
                            <span className="font-bold text-white text-sm">{item.nombre_item}</span>
                         </div>
                         
                         <div className="flex bg-black/20 p-1 rounded-2xl border border-white/5">
                            {(['ok', 'aviso', 'grave'] as ItemState[]).map(s => (
                              <button
                                key={s}
                                onClick={() => handleUpdateItem(idx, { estado: s })}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${item.estado === s ? (s === 'ok' ? 'bg-success text-white' : s === 'aviso' ? 'bg-warning text-black' : 'bg-danger text-white') : 'text-muted hover:bg-white/5'}`}
                              >
                                {s}
                              </button>
                            ))}
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-sm bg-black/20 p-3 px-5 rounded-[1.5rem] border border-white/5">
                         <MessageSquare size={14} className="text-muted" />
                         <input 
                           className="bg-transparent border-none text-xs text-white placeholder-muted focus:ring-0 w-full font-bold"
                           placeholder="Observaciones adicionales..."
                           value={item.observacion}
                           onChange={e => handleUpdateItem(idx, { observacion: e.target.value })}
                         />
                      </div>
                   </div>
                 ))}

                 <div className="p-6 border-2 border-dashed border-white/5 rounded-[2.5rem] flex gap-md">
                    <input 
                      className="v-input bg-white/5 flex-1 rounded-2xl"
                      placeholder="Identificar otro elemento / hallazgo..."
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleAddItem()}
                    />
                    <Button onClick={handleAddItem} variant="primary" icon={Plus} className="rounded-2xl px-6">Añadir</Button>
                 </div>
              </div>

              <div className="p-xl bg-white/[0.02] border-t border-white/5">
                 <Button 
                   onClick={handleFinishTask}
                   className="v-btn-accent w-full py-6 text-sm font-black tracking-widest uppercase flex items-center justify-center gap-md rounded-[2rem] shadow-2xl shadow-accent/40"
                   loading={saving}
                 >
                   <ShieldCheck size={24} />
                   Completar Inspección Técnica
                 </Button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .v-glass-card { background: rgba(18, 18, 18, 0.3); backdrop-filter: blur(40px); }
        .badge-accent { background: var(--color-accent); color: white; }
        .v-btn-accent { background: var(--color-accent); color: white; }
      `}</style>
    </div>
  )
}

function TaskCard({ task, onStart, isHistory }: { task: any, onStart: () => void, isHistory?: boolean }) {
  return (
    <Card className="p-0 overflow-hidden group hover:translate-y-[-8px] transition-all border-white/5 bg-white/[0.01] rounded-[2.5rem] shadow-xl hover:shadow-accent/5">
       <div className="p-xl border-b border-white/5 bg-white/[0.01] flex justify-between items-start">
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-accent uppercase tracking-widest">{task.zona_nombre}</span>
               <ChevronRight size={10} className="text-muted" />
             </div>
             <h4 className="text-3xl font-black text-white tracking-tighter leading-none">{task.espacio_nombre}</h4>
          </div>
          {isHistory ? (
             <div className="p-2 bg-success/20 text-success rounded-xl">
                <CheckCircle2 size={24} />
             </div>
          ) : (
             <div className="p-2 bg-accent/20 text-accent rounded-xl shadow-lg ring-1 ring-accent/20">
                <Clock size={24} />
             </div>
          )}
       </div>

       <div className="p-xl space-y-md bg-gradient-to-br from-white/[0.02] to-transparent">
          <div className="flex items-center gap-md">
             <div className="p-3 bg-white/5 rounded-2xl">
                <ListChecks size={20} className="text-muted" />
             </div>
             <div>
                <p className="text-[9px] font-black text-muted uppercase tracking-[0.2em]">Plan Asociado</p>
                <p className="font-bold text-sm text-white">{task.plan?.nombre}</p>
             </div>
          </div>
          
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
             <div className="flex items-center gap-2 text-muted">
                <Calendar size={12} /> {isHistory ? new Date(task.completada_en).toLocaleDateString() : new Date(task.fecha_programada).toLocaleDateString()}
             </div>
             {isHistory && (
                <div className="flex items-center gap-2 text-success">
                   <User size={12} /> Revisado
                </div>
             )}
          </div>
       </div>

       {!isHistory && (
          <button 
             onClick={onStart}
             className="w-full py-5 bg-accent/10 hover:bg-accent text-accent hover:text-white font-black text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-3 group/btn"
          >
             Iniciar Checklist Técnico <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
       )}
    </Card>
  )
}
