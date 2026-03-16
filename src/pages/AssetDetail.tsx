import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Settings, 
  History, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  ArrowLeft,
  Wrench,
  ExternalLink,
  ChevronRight,
  Info,
  MapPin
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import moment from 'moment'

export default function AssetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const toast = useToast()
  
  const [asset, setAsset] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info')

  useEffect(() => {
    fetchAssetData()
  }, [id])

  async function fetchAssetData() {
    try {
      setLoading(true)
      // 1. Obtener datos del activo
      const { data: assetData, error: assetError } = await supabase
        .from('activos')
        .select(`
          *,
          zona:zonas(nombre),
          habitacion:habitaciones(nombre)
        `)
        .eq('id', id)
        .single()

      if (assetError) throw assetError
      setAsset(assetData)

      // 2. Obtener historial (incidencias y mantenimientos)
      const [incRes, maintRes] = await Promise.all([
        supabase
          .from('incidencias')
          .select('*, reporter:perfiles(nombre)')
          .eq('activo_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('historial_mantenimiento')
          .select('*, tarea:mantenimiento_preventivo(titulo), completado_por_perfil:perfiles(nombre)')
          .eq('activo_id', id)
          .order('completado_el', { ascending: false })
      ])

      const combinedHistory = [
        ...(incRes.data || []).map(i => ({ ...i, type: 'incident' })),
        ...(maintRes.data || []).map(m => ({ ...m, type: 'maintenance' }))
      ].sort((a, b) => new Date(b.created_at || b.completado_el).getTime() - new Date(a.created_at || a.completado_el).getTime())

      setHistory(combinedHistory)
    } catch (error) {
      console.error('Error fetching asset:', error)
      toast.error('No se pudo cargar la información del activo')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-6 flex flex-col items-center justify-center text-center">
        <AlertTriangle size={64} className="text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Activo no encontrado</h1>
        <p className="text-gray-400 mb-6">El código escaneado no coincide con ningún equipo registrado.</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-indigo-600 rounded-lg text-white">Volver al inicio</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex flex-col font-['Outfit']">
      {/* Header Premium */}
      <header className="px-6 py-5 bg-[#12121a]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate leading-tight">{asset.nombre}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
              {asset.tipo}
            </span>
          </div>
        </div>
        <div className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                asset.estado === 'operativo' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                asset.estado === 'averiado' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            }`}>
               <div className={`w-2 h-2 rounded-full animate-pulse ${
                 asset.estado === 'operativo' ? 'bg-green-400' :
                 asset.estado === 'averiado' ? 'bg-red-400' : 'bg-yellow-400'
               }`} />
               <span className="text-xs font-bold uppercase tracking-wide">
                 {asset.estado}
               </span>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pt-8 pb-32 max-w-2xl mx-auto w-full">
        {/* Modern Tabs */}
        <div className="flex p-1.5 bg-white/5 backdrop-blur-md rounded-2xl mb-8 border border-white/5">
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 ${
              activeTab === 'info' 
                ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Info size={19} /> Ficha Técnica
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 ${
              activeTab === 'history' 
                ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History size={19} /> Historial
          </button>
        </div>

        {activeTab === 'info' ? (
          <div className="space-y-8 animate-fade-in">
            {/* Modular Info Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-3xl group hover:bg-white/[0.05] transition-all">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                  <MapPin size={20} />
                </div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Ubicación</p>
                <p className="font-bold text-lg text-white">
                  {asset.zona?.nombre || asset.location || 'N/A'}
                </p>
                {asset.habitacion && (
                  <div className="mt-2 flex items-center gap-1.5 text-indigo-400/80 bg-indigo-500/5 w-fit px-2 py-0.5 rounded-lg border border-indigo-500/10">
                    <span className="text-[10px] font-black">HAB {asset.habitacion.nombre}</span>
                  </div>
                )}
              </div>
              
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-3xl group hover:bg-white/[0.05] transition-all">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                  <Clock size={20} />
                </div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Última Revisión</p>
                <p className="font-bold text-lg text-white">
                  {history.find(h => h.type === 'maintenance')?.completado_el 
                    ? moment(history.find(h => h.type === 'maintenance')?.completado_el).format('DD/MM/YY') 
                    : 'Pendiente'}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-emerald-400/80 bg-emerald-500/5 w-fit px-2 py-0.5 rounded-lg border border-emerald-500/10">
                  <span className="text-[10px] font-black">ESTADO ÓPTIMO</span>
                </div>
              </div>
            </div>

            {/* Manual Quick Action */}
            {asset.manual_url && (
              <a 
                href={asset.manual_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="relative overflow-hidden group flex items-center justify-between p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-3xl active:scale-[0.98] transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                
                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-[0_8px_16px_rgba(79,70,229,0.3)] group-hover:rotate-6 transition-transform">
                    <FileText size={28} />
                  </div>
                  <div>
                    <p className="font-black text-lg text-white">Manual Técnico</p>
                    <p className="text-sm text-indigo-400/90 font-medium">Especificaciones y diagramas PDF</p>
                  </div>
                </div>
                <ExternalLink size={20} className="text-indigo-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform relative z-10" />
              </a>
            )}

            {/* Enhanced Specifications Sheet */}
            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[32px] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none">
                <Settings size={120} />
              </div>

              <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></div>
                Ficha Técnica Detallada
              </h3>
              
              <div className="grid gap-5 relative z-10">
                {Object.entries(asset.especificaciones || {}).length > 0 ? (
                    Object.entries(asset.especificaciones).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between items-center py-4 border-b border-white/[0.03]">
                            <span className="text-gray-500 font-bold text-xs uppercase tracking-wider capitalize">{key.replace('_', ' ')}</span>
                            <span className="text-sm font-black text-white bg-white/5 px-3 py-1 rounded-lg border border-white/5">{String(value)}</span>
                        </div>
                    ))
                ) : (
                    <div className="py-12 text-center">
                      <p className="text-gray-500 text-sm font-medium italic">Sin especificaciones técnicas registradas.</p>
                      <button className="mt-4 text-xs font-bold text-indigo-400 hover:underline">Completar ficha técnica</button>
                    </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {history.length === 0 ? (
              <div className="py-24 text-center">
                <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-gray-700 border border-white/5 rotate-12">
                  <History size={48} />
                </div>
                <p className="text-gray-500 font-bold text-lg">Historial vacío</p>
                <p className="text-sm text-gray-600 mt-2">No hay registros de mantenimiento para este equipo.</p>
              </div>
            ) : (
              <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-indigo-500 before:via-white/10 before:to-transparent">
                {history.map((item, idx) => (
                  <div key={idx} className="relative group">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[29px] top-1.5 w-4 h-4 rounded-full border-4 border-[#0a0a0f] z-10 ${
                      item.type === 'incident' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    }`} />
                    
                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl group-hover:bg-white/[0.05] transition-all group-hover:translate-x-1">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-black text-white text-md tracking-tight leading-tight">
                            {item.type === 'incident' ? item.title : (item.tarea?.titulo || 'Mant. Preventivo')}
                          </p>
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded mt-1.5 inline-block">
                            {item.type === 'incident' ? 'INCIDENCIA' : 'MANTENIMIENTO'}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded-lg">
                          {moment(item.created_at || item.completado_el).format('DD MMM YYYY')}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-400 font-medium leading-relaxed mb-5 italic border-l-2 border-white/5 pl-4 ml-1">
                        "{item.descripcion || item.notas || 'Sin observaciones detalladas.'}"
                      </p>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-indigo-500/20">
                          {(item.reporter?.nombre || item.completado_por_perfil?.nombre || 'S')[0]}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Responsable</p>
                          <p className="text-xs font-bold text-white">{item.reporter?.nombre || item.completado_por_perfil?.nombre || 'Sistema V-Suite'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modern Floating Action Button */}
      <div className="fixed bottom-8 left-6 right-6 z-50">
        <button 
          onClick={() => navigate('/incidencias', { state: { prefillAsset: asset.id, prefillLocation: asset.zona?.nombre } })}
          className="w-full h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-lg rounded-2xl shadow-[0_20px_40px_rgba(79,70,229,0.4)] flex items-center justify-center gap-4 transition-all active:scale-[0.97] border border-white/10"
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Wrench size={22} className="animate-bounce" />
          </div>
          Reportar Intervención
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .font-['Outfit'] { font-family: 'Outfit', sans-serif; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
