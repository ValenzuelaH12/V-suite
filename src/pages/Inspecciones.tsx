import { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { preventivoService } from '../services/preventivoService';
import { PreventiveRevision } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { InspeccionChecklist } from '../components/features/inspections/InspeccionChecklist';

export default function Inspecciones() {
  const { activeHotelId, user } = useAuth();
  const [revisions, setRevisions] = useState<PreventiveRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRevision, setActiveRevision] = useState<PreventiveRevision | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'habitacion' | 'zona' | 'activo'>('all');

  const fetchData = async () => {
    if (!activeHotelId) return;
    setLoading(true);
    try {
      // Sincronizar tareas del día
      await preventivoService.reconcileRevisions(activeHotelId);
      // Obtener pendientes
      const data = await preventivoService.getPendingRevisions(activeHotelId);
      setRevisions(data);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeHotelId]);

  const handleStart = async (rev: PreventiveRevision) => {
    try {
      if (!user) return;
      await preventivoService.startRevision(rev.id, user.id);
      setActiveRevision(rev);
    } catch (error) {
       console.error('Error starting revision:', error);
       alert('Error al iniciar la inspección.');
    }
  };

  const filteredRevisions = revisions.filter(rev => {
    const matchesSearch = rev.ubicacion_nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (rev.plantilla?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || rev.entidad_tipo === filterType;
    return matchesSearch && matchesType;
  });

  if (activeRevision) {
    return (
      <InspeccionChecklist 
        revision={activeRevision}
        onComplete={() => {
          setActiveRevision(null);
          fetchData();
        }}
        onCancel={() => setActiveRevision(null)}
      />
    );
  }

  if (!activeHotelId) {
    return (
      <div className="flex flex-col items-center justify-center p-xl text-muted h-[60vh]">
        <AlertCircle size={48} className="mb-md opacity-20" />
        <p className="font-bold">Acceso Denegado</p>
        <p className="text-sm">Selecciona un hotel para ver las inspecciones.</p>
      </div>
    );
  }

  return (
    <div className="p-md md:p-xl space-y-lg animate-fade-in max-w-4xl mx-auto pb-[100px]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-sm">
            <ClipboardCheck className="text-accent" size={28} />
            Inspecciones
          </h1>
          <p className="text-secondary text-sm">Tareas preventivas y operativos del día</p>
        </div>
        <div className="bg-accent/10 p-md rounded-xl border border-accent/20 hidden md:block text-right">
           <div className="text-[10px] font-bold text-accent uppercase tracking-widest">Pendientes Hoy</div>
           <div className="text-2xl font-black text-white">{revisions.length}</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-md">
        <div className="v-glass-card flex-1 p-sm flex items-center gap-sm border-white/5">
          <Search className="text-muted ml-sm" size={18} />
          <input 
            placeholder="Buscar por ubicación o plan..."
            className="bg-transparent border-none text-white p-sm flex-1 focus:outline-none placeholder:text-muted/50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-sm">
           <select 
             className="select bg-white/5 border-white/10 text-sm h-[50px]"
             value={filterType}
             onChange={e => setFilterType(e.target.value as any)}
           >
             <option value="all">Todos los tipos</option>
             <option value="habitacion">Habitaciones</option>
             <option value="zona">Zonas Comunes</option>
             <option value="activo">Equipamiento</option>
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-md">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
             <Card key={i} className="h-28 animate-pulse bg-white/5 border-white/5"><div /></Card>
          ))
        ) : filteredRevisions.length > 0 ? (
          filteredRevisions.map((rev) => (
            <Card key={rev.id} className="group hover:border-accent/30 transition-all border-white/5 bg-white/5 overflow-hidden">
              <div className="flex items-stretch">
                <div className={`w-1.5 ${
                  rev.plantilla?.frecuencia === 'diaria' ? 'bg-accent' : 
                  rev.plantilla?.frecuencia === 'semanal' ? 'bg-success' : 'bg-warning'
                }`} />
                
                <div className="flex-1 p-lg flex flex-col md:flex-row justify-between items-center gap-md">
                  <div className="flex items-center gap-lg w-full md:w-auto">
                    <div className="flex flex-col gap-1">
                       <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{rev.plantilla?.frecuencia}</span>
                       <h3 className="text-xl font-bold group-hover:text-white transition-colors">{rev.ubicacion_nombre}</h3>
                       <p className="text-xs text-secondary flex items-center gap-2">
                          <ShieldCheck size={14} className="text-accent/60" />
                          {rev.plantilla?.nombre}
                       </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-md w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-md md:pt-0">
                    <div className="flex flex-col text-left md:text-right">
                       <span className="text-[10px] text-muted font-bold uppercase tracking-widest">Status</span>
                       <span className={`text-[10px] font-bold uppercase ${rev.estado === 'en_proceso' ? 'text-accent' : 'text-warning'}`}>
                          {rev.estado === 'en_proceso' ? 'EN CURSO' : 'PENDIENTE'}
                       </span>
                    </div>
                    <Button onClick={() => handleStart(rev)} className="btn-sm shadow-lg shadow-accent/10">
                      <span>{rev.estado === 'en_proceso' ? 'Continuar' : 'Comenzar'}</span>
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-24 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 animate-fade-in">
            <ClipboardCheck size={64} className="mx-auto mb-md opacity-10" />
            <h3 className="font-bold text-white/50 text-xl tracking-tight">¡Todo al día!</h3>
            <p className="text-sm text-muted max-w-xs mx-auto mt-xs">No hay inspecciones pendientes en este hotel para los criterios seleccionados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
