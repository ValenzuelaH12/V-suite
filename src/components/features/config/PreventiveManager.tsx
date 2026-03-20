import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  Trash2, 
  Edit3, 
  ClipboardCheck, 
  LayoutList,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PreventiveTemplate } from '../../../types';
import { preventivoService } from '../../../services/preventivoService';
import { PreventiveTemplateBuilder } from './PreventiveTemplateBuilder';

interface Props {
  activeHotelId: string | null;
  onMessage: (m: { type: 'success' | 'error', text: string }) => void;
  zones: any[];
  rooms: any[];
  assets: any[];
  onRefresh: () => void;
}

export const PreventiveManager = ({ activeHotelId, onMessage, zones, rooms, assets, onRefresh }: Props) => {
  const [templates, setTemplates] = useState<PreventiveTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTemplates = async () => {
    if (!activeHotelId) return;
    setLoading(true);
    try {
      const data = await preventivoService.getTemplates(activeHotelId);
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [activeHotelId]);

  if (!activeHotelId) return (
    <div className="v-glass-card p-xl text-center text-muted">
       <AlertCircle className="mx-auto mb-md opacity-20" size={48} />
       <p className="font-bold text-lg">Selección Requerida</p>
       <p className="text-sm">Selecciona un hotel para gestionar sus planes preventivos.</p>
    </div>
  );

  if (view === 'create') {
    return (
      <PreventiveTemplateBuilder 
        hotelId={activeHotelId}
        zones={zones}
        rooms={rooms}
        assets={assets}
        onRefresh={onRefresh}
        onSave={() => {
          setView('list');
          fetchTemplates();
          onMessage({ type: 'success', text: 'Procedimiento preventivo creado correctamente' });
        }}
        onCancel={() => setView('list')}
      />
    );
  }

  return (
    <div className="space-y-lg animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-sm">
            <ShieldCheck className="text-accent" />
            Gestión de Procedimientos Preventivos
          </h2>
          <p className="text-secondary text-sm">Define rutinas de inspección y mantenimiento periódico</p>
        </div>
        <Button onClick={() => setView('create')} className="shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <Plus size={18} /> Nuevo Procedimiento
        </Button>
      </div>

      <div className="v-glass-card p-sm flex items-center gap-sm border-white/5">
        <Search className="text-muted ml-sm" size={18} />
        <input 
          placeholder="Buscar procedimientos (ej: Filtros AC, Revisión Habitación...)" 
          className="bg-transparent border-none text-white p-sm flex-1 focus:outline-none placeholder:text-muted/50"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {loading ? (
           Array(3).fill(0).map((_, i) => <Card key={i} className="h-44 animate-pulse bg-white/5 border-white/5"><div /></Card>)
        ) : templates.filter(t => t.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map(template => (
          <Card key={template.id} className="group hover:border-accent/40 transition-all border-white/5 bg-white/5 hover:translate-y-[-2px]">
            <div className="p-lg flex flex-col h-full justify-between gap-md relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-accent/5 blur-3xl rounded-full" />
              
              <div className="flex justify-between items-start">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">{template.frecuencia}</span>
                    <h4 className="font-bold text-lg leading-tight group-hover:text-white transition-colors">{template.nombre}</h4>
                 </div>
                 <div className="p-sm bg-white/5 rounded-lg group-hover:bg-accent/10 transition-colors border border-white/5">
                    <ClipboardCheck className="text-muted group-hover:text-accent" size={20} />
                 </div>
              </div>

              <div className="space-y-sm">
                <div className="flex items-center gap-md text-[10px] text-muted uppercase font-bold tracking-wider">
                   <div className="flex items-center gap-1.5">
                      <LayoutList size={12} className="text-accent/60" />
                      <span>Checklist Dinámico</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-accent/60" />
                      <span>{template.frecuencia}</span>
                   </div>
                </div>
                {template.descripcion && (
                  <p className="text-xs text-muted line-clamp-2 italic">{template.descripcion}</p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-md mt-sm">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_5px_var(--color-success)]" />
                    <span className="text-[10px] text-muted font-bold uppercase tracking-widest">{template.tipo_objetivo}</span>
                 </div>
                 <div className="flex gap-sm">
                    <button className="p-sm rounded-lg hover:bg-white/5 text-muted hover:text-white transition-all"><Edit3 size={15} /></button>
                    <button className="p-sm rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-all"><Trash2 size={15} /></button>
                 </div>
              </div>
            </div>
          </Card>
        ))}

        {!loading && templates.length === 0 && (
          <div className="col-span-full py-xl text-center border-2 border-dashed border-white/10 rounded-2xl text-muted bg-white/5">
            <LayoutList size={56} className="mx-auto mb-md opacity-10" />
            <h3 className="font-bold text-white/50">Sin Procedimientos</h3>
            <p className="text-sm px-xl max-w-sm mx-auto my-sm">Aún no has configurado ninguna rutina preventiva. Crea la primera para empezar con el control operativo.</p>
            <Button variant="ghost" className="mt-md text-accent" onClick={() => setView('create')}>
              <Plus size={16} /> Crear Plantilla Inicial
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
