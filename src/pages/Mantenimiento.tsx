import { useState, useEffect } from 'react'
import { 
  ShieldCheck, 
  Wind, 
  Layers, 
  LayoutGrid, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  ChevronRight,
  Plus,
  Box,
  History,
  ThermometerSnowflake,
  Filter,
  X
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

// Tipos
type EstadoActivo = 'bueno' | 'regular' | 'malo' | 'mantenimiento' | 'fuera_servicio';

const ESTADO_CONFIG: Record<EstadoActivo, { label: string, color: string, icon: any }> = {
  bueno: { label: 'Bueno', color: 'success', icon: CheckCircle2 },
  regular: { label: 'Regular', color: 'warning', icon: AlertTriangle },
  malo: { label: 'Malo', color: 'danger', icon: AlertTriangle },
  mantenimiento: { label: 'En Mantenimiento', color: 'accent', icon: Clock },
  fuera_servicio: { label: 'Fuera de Servicio', color: 'neutral', icon: AlertTriangle }
}

export default function Mantenimiento() {
  const { activeHotelId } = useAuth()
  const [zones, setZones] = useState<any[]>([])
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [filters, setFilters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'zonas' | 'filtros'>('zonas')
  const [inspectingRoom, setInspectingRoom] = useState<any | null>(null)
  const [inspectionData, setInspectionData] = useState<any>({})
  const [filtersCleaned, setFiltersCleaned] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [activeHotelId])

  const handleStartInspection = (room: any) => {
    setInspectingRoom(room)
    // Inicializar estados con lo que ya tengan o 'bueno' por defecto
    const initialData: any = {}
    room.activos.forEach((a: any) => {
      initialData[a.id] = { estado: a.estado || 'bueno', observacion: '' }
    })
    setInspectionData(initialData)
  }

  const handleSaveInspection = async () => {
    if (!inspectingRoom) return
    setSaving(true)
    try {
      // 1. Crear cabecera de inspección
      const { data: ins, error: insErr } = await supabase
        .from('preventivo_inspecciones')
        .insert([{
          hotel_id: activeHotelId,
          habitacion_id: inspectingRoom.id,
          usuario_id: (await supabase.auth.getUser()).data.user?.id,
          comentarios: 'Inspección de rutina'
        }])
        .select()
        .single()

      if (insErr) throw insErr

      // 2. Crear detalles y actualizar activos
      const details = Object.entries(inspectionData).map(([activoId, data]: [string, any]) => ({
        inspeccion_id: ins.id,
        activo_id: activoId,
        estado_visto: data.estado,
        observacion: data.observacion
      }))

      await supabase.from('preventivo_detalles').insert(details)

      // Actualizar estados actuales de los activos
      for (const [activoId, data] of Object.entries(inspectionData) as any) {
        await supabase
          .from('activos')
          .update({ 
            estado: data.estado,
            ultima_inspeccion: new Date().toISOString()
          })
          .eq('id', activoId)
      }

      // 3. Si se marcaron filtros como limpios, actualizar mantenimiento_filtros
      if (filtersCleaned) {
        // Buscar si ya existe el registro de filtros para esta habitación
        const { data: existingFilter } = await supabase
          .from('mantenimiento_filtros')
          .select('id')
          .eq('habitacion_id', inspectingRoom.id)
          .single()

        const filterPayload = {
          hotel_id: activeHotelId,
          habitacion_id: inspectingRoom.id,
          ultima_limpieza: new Date().toISOString(),
          proxima_limpieza: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // +90 días
        }

        if (existingFilter) {
          await supabase.from('mantenimiento_filtros').update(filterPayload).eq('id', existingFilter.id)
        } else {
          await supabase.from('mantenimiento_filtros').insert([filterPayload])
        }
      }

      alert('✅ Inspección guardada con éxito.')
      setInspectingRoom(null)
      setFiltersCleaned(false)
      fetchRooms(selectedZone!)
      fetchData() // Recargar filtros también
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const fetchData = async () => {
    if (!activeHotelId) return
    setLoading(true)
    try {
      // Fetch Zonas
      const { data: zData } = await supabase.from('zonas').select('*').eq('hotel_id', activeHotelId)
      setZones(zData || [])
      if (zData?.length) setSelectedZone(zData[0].id)

      // Fetch Filtros Críticos
      const { data: fData } = await supabase
        .from('mantenimiento_filtros')
        .select('*, habitacion:habitaciones(nombre)')
        .eq('hotel_id', activeHotelId)
        .order('proxima_limpieza', { ascending: true })
      setFilters(fData || [])

      // Fetch Rooms for default zone
      if (zData?.[0]?.id) fetchRooms(zData[0].id)
    } finally {
      setLoading(false)
    }
  }

  const fetchRooms = async (zoneId: string) => {
    const { data: rData } = await supabase
      .from('habitaciones')
      .select(`
        *,
        activos:activos(id, nombre, estado, categoria)
      `)
      .eq('zona_id', zoneId)
    setRooms(rData || [])
  }

  const handleZoneSelect = (id: string) => {
    setSelectedZone(id)
    fetchRooms(id)
    setView('zonas')
  }

  return (
    <div className="v-preventivo-container p-md md:p-xl animate-fade-in custom-scrollbar">
      {/* HEADER */}
      <div className="v-page-header mb-xl">
        <div className="flex flex-col gap-xs">
          <h1 className="v-page-title flex items-center gap-sm">
            <ShieldCheck className="text-accent" size={32} />
            Mantenimiento Preventivo
          </h1>
          <p className="v-page-subtitle">Gestión jerárquica de espacios, objetos y filtros de aire</p>
        </div>

        <div className="flex gap-md">
           <button 
             onClick={() => setView('zonas')}
             className={`px-6 py-2.5 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all shadow-lg ${view === 'zonas' ? 'bg-accent text-white shadow-accent/20' : 'bg-white/5 text-muted hover:bg-white/10'}`}
           >
             <LayoutGrid className="inline-block mr-2" size={14} /> Vista de Zonas
           </button>
           <button 
             onClick={() => setView('filtros')}
             className={`px-6 py-2.5 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all shadow-lg ${view === 'filtros' ? 'bg-accent text-white shadow-accent/20' : 'bg-white/5 text-muted hover:bg-white/10'}`}
           >
             <ThermometerSnowflake className="inline-block mr-2" size={14} /> Control de Filtros
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        {/* SIDEBAR ZONAS */}
        <div className="lg:col-span-3 space-y-md">
           <h3 className="text-[10px] font-black uppercase text-muted tracking-widest px-md">Zonas / Plantas</h3>
           <div className="space-y-sm">
             {zones.map(z => (
               <button
                 key={z.id}
                 onClick={() => handleZoneSelect(z.id)}
                 className={`w-full text-left p-xl rounded-3xl transition-all border group flex items-center justify-between ${selectedZone === z.id ? 'bg-accent/10 border-accent/40 translate-x-1' : 'bg-white/[0.02] border-white/5 hover:bg-white/5'}`}
               >
                 <div className="flex items-center gap-md">
                   <div className={`p-3 rounded-2xl ${selectedZone === z.id ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-white/5 text-muted'}`}>
                     <Layers size={20} />
                   </div>
                   <span className={`font-black tracking-tight ${selectedZone === z.id ? 'text-white' : 'text-muted group-hover:text-white'}`}>{z.nombre}</span>
                 </div>
                 <ChevronRight size={18} className={selectedZone === z.id ? 'text-accent' : 'text-muted'} />
               </button>
             ))}
           </div>
        </div>

        {/* CONTENT AREA */}
        <div className="lg:col-span-9">
          {view === 'zonas' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
              {rooms.map(room => (
                <RoomCard key={room.id} room={room} onInspect={() => handleStartInspection(room)} />
              ))}
            </div>
          ) : (
            <div className="v-glass-card p-xl border-white/5">
               <h3 className="text-xl font-black mb-xl flex items-center gap-sm">
                 <Wind className="text-accent" /> Control de Filtros de Aire Críticos
               </h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-separate border-spacing-y-md">
                   <thead>
                     <tr className="text-muted text-[10px] uppercase font-black tracking-widest">
                       <th className="px-6 pb-2">Habitación</th>
                       <th className="px-6 pb-2">Última Limpieza</th>
                       <th className="px-6 pb-2">Próxima Revisión</th>
                       <th className="px-6 pb-2">Estado</th>
                       <th className="px-6 pb-2 text-right">Acción</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filters.map(f => (
                       <FilterRow key={f.id} filter={f} />
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* INSPECTION MODAL */}
      {inspectingRoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-md bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="v-glass-card w-full max-w-2xl shadow-[0_0_50px_rgba(99,102,241,0.2)] border-white/10 p-0 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-xl border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                 <div>
                   <span className="badge badge-accent text-[9px] font-black uppercase tracking-widest mb-xs">Inspección Preventiva</span>
                   <h3 className="text-2xl font-black">Habitación {inspectingRoom.nombre}</h3>
                 </div>
                 <button onClick={() => setInspectingRoom(null)} className="btn-icon btn-ghost"><X /></button>
              </div>

              <div className="p-xl space-y-xl overflow-y-auto custom-scrollbar flex-1">
                {inspectingRoom.activos?.map((activo: any) => (
                  <div key={activo.id} className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-md">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-md">
                           <div className="p-3 bg-accent/10 text-accent rounded-2xl">
                             <Box size={24} />
                           </div>
                           <div>
                              <h4 className="font-black text-lg">{activo.nombre}</h4>
                              <span className="text-[10px] text-muted uppercase font-bold tracking-widest">{activo.categoria}</span>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 md:grid-cols-5 gap-xs">
                        {(Object.entries(ESTADO_CONFIG) as any).map(([key, cfg]: any) => (
                          <button
                            key={key}
                            onClick={() => setInspectionData({
                              ...inspectionData,
                              [activo.id]: { ...inspectionData[activo.id], estado: key }
                            })}
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1 ${inspectionData[activo.id]?.estado === key ? 'bg-accent border-accent text-white' : 'bg-white/5 border-white/5 text-muted hover:bg-white/10'}`}
                          >
                             <cfg.icon size={16} />
                             <span className="text-[8px] font-black uppercase text-center leading-tight">{cfg.label}</span>
                          </button>
                        ))}
                     </div>

                     <input 
                       className="v-input bg-white/5 border-white/10 text-xs py-3 w-full"
                       placeholder="Agregar observación o incidencia..."
                       value={inspectionData[activo.id]?.observacion || ''}
                       onChange={e => setInspectionData({
                         ...inspectionData,
                         [activo.id]: { ...inspectionData[activo.id], observacion: e.target.value }
                       })}
                     />
                  </div>
                ))}

                {/* FILTRO DE AIRE EN MODAL */}
                <div className="p-6 bg-accent/5 rounded-3xl border border-accent/20 space-y-md">
                   <div className="flex items-center gap-md">
                      <div className="p-3 bg-accent text-white rounded-2xl">
                        <Wind size={24} />
                      </div>
                      <h4 className="font-black text-lg">Mantenimiento de Filtros (AC)</h4>
                   </div>
                   <p className="text-xs text-muted">¿Se ha realizado la limpieza o cambio de filtros en esta visita?</p>
                   <div className="flex gap-md">
                      <button 
                        onClick={() => setFiltersCleaned(false)}
                        className={`flex-1 h-12 rounded-2xl font-bold text-xs transition-all ${!filtersCleaned ? 'bg-white/10 text-white border border-white/20' : 'bg-white/5 text-muted hover:bg-white/10'}`}
                      >
                        No hoy
                      </button>
                      <button 
                        onClick={() => setFiltersCleaned(true)}
                        className={`flex-1 h-12 rounded-2xl font-bold text-xs transition-all ${filtersCleaned ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-white/5 text-muted hover:bg-white/10'}`}
                      >
                        Sí, Limpiados
                      </button>
                   </div>
                </div>
              </div>

              <div className="p-xl bg-white/[0.02] border-t border-white/5">
                 <Button 
                   onClick={handleSaveInspection}
                   className="btn-accent-glow w-full py-5 text-sm font-black tracking-widest uppercase flex items-center justify-center gap-sm"
                   loading={saving}
                 >
                   <ShieldCheck size={20} />
                   Finalizar Inspección y Guardar Estados
                 </Button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .v-preventivo-container { height: calc(100vh - var(--header-height)); overflow-y: auto; }
        .v-glass-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); }
      `}</style>
    </div>
  )
}

function RoomCard({ room, onInspect }: { room: any, onInspect: () => void }) {
  const activos = room.activos || []
  const malEstadoCount = activos.filter((a: any) => a.estado === 'malo' || a.estado === 'fuera_servicio').length

  return (
    <Card className={`p-0 overflow-hidden group hover:translate-y-[-4px] transition-all duration-300 border-white/5 ${malEstadoCount > 0 ? 'bg-danger/[0.02] border-danger/20' : 'hover:border-accent/30'}`}>
       <div className="p-xl border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
          <div>
            <h4 className="text-2xl font-black tracking-tighter">{room.nombre}</h4>
            <p className="text-muted text-[10px] font-bold uppercase tracking-widest">Capacidad: {room.capacidad} pax</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${malEstadoCount > 0 ? 'bg-danger/10 text-danger animate-pulse' : 'bg-success/10 text-success'}`}>
             {malEstadoCount > 0 ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
          </div>
       </div>

       <div className="p-xl space-y-md">
          <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest">
            <span>Objetos ({activos.length})</span>
            <span>Salud: {Math.round(((activos.length - (malEstadoCount || 0))/(activos.length || 1))*100)}%</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
             {activos.slice(0, 6).map((a: any) => {
                const conf = ESTADO_CONFIG[a.estado as EstadoActivo] || ESTADO_CONFIG.bueno
                const Icon = conf.icon
                return (
                  <div 
                    key={a.id} 
                    className={`p-2 px-3 rounded-xl border text-[10px] font-bold flex items-center gap-2 ${a.estado === 'bueno' ? 'bg-success/5 border-success/20 text-success' : 'bg-danger/5 border-danger/20 text-danger'}`}
                    title={`${a.nombre}: ${conf.label}`}
                  >
                     <Icon size={10} /> {a.nombre}
                  </div>
                )
             })}
             {activos.length > 6 && <span className="text-[10px] text-muted self-center">+{activos.length - 6} más</span>}
          </div>
       </div>

       <button 
         onClick={onInspect}
         className="w-full py-4 bg-white/5 hover:bg-accent text-accent hover:text-white font-black text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 group"
       >
         Inspeccionar Habitación <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
       </button>
    </Card>
  )
}

function FilterRow({ filter }: { filter: any }) {
  const isOverdue = new Date(filter.proxima_limpieza) < new Date()
  
  return (
    <tr className="bg-white/[0.02] group hover:bg-white/[0.05] transition-all">
       <td className="px-6 py-4 font-bold rounded-l-3xl border-y border-l border-white/5">
         <div className="flex items-center gap-md">
            <div className={`p-2 rounded-xl ${isOverdue ? 'bg-danger/10 text-danger animate-pulse' : 'bg-success/10 text-success'}`}>
               <Wind size={18} />
            </div>
            {filter.habitacion?.nombre}
         </div>
       </td>
       <td className="px-6 py-4 border-y border-white/5 text-xs text-muted font-bold">
         {new Date(filter.ultima_limpieza).toLocaleDateString()}
       </td>
       <td className={`px-6 py-4 border-y border-white/5 text-xs font-black ${isOverdue ? 'text-danger' : 'text-white'}`}>
         {new Date(filter.proxima_limpieza).toLocaleDateString()}
       </td>
       <td className="px-6 py-4 border-y border-white/5">
         {isOverdue ? (
            <span className="badge badge-danger text-[9px] font-black">PROX VENCIDO</span>
         ) : (
            <span className="badge badge-success text-[9px] font-black">AL DÍA</span>
         )}
       </td>
       <td className="px-6 py-4 border-y border-r border-white/5 rounded-r-3xl text-right">
          <Button variant="ghost" className="btn-icon text-muted hover:text-accent group-hover:scale-110 transition-all">
             <CheckCircle2 size={18} />
          </Button>
       </td>
    </tr>
  )
}
