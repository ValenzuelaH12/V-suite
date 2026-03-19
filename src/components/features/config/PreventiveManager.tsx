import { useState } from 'react';
import { ShieldCheck, Plus, Trash2, Calendar, ListChecks, MapPin, Box, ChevronRight, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';

const FRECUENCIAS = [
  { id: 'diaria', name: 'Diaria' },
  { id: 'semanal', name: 'Semanal' },
  { id: 'quincenal', name: 'Quincenal' },
  { id: 'mensual', name: 'Mensual' },
  { id: 'trimestral', name: 'Trimestral' },
  { id: 'semestral', name: 'Semestral' },
  { id: 'anual', name: 'Anual' },
];

export const PreventiveManager = ({ 
  activeHotelId, 
  onMessage, 
  planes, 
  onRefresh 
}: { 
  activeHotelId: string | null, 
  onMessage: (msg: { type: 'success' | 'error', text: string }) => void,
  planes: any[],
  onRefresh: () => void
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newPlan, setNewPlan] = useState({
    nombre: '',
    frecuencia: 'mensual',
    items_base: ['Revisión General'],
    scope: [] as { zona: string, espacios: string[] }[]
  });

  // States para Editores Auxiliares
  const [tempItem, setTempItem] = useState('');
  const [tempZona, setTempZona] = useState('');
  const [tempEspacio, setTempEspacio] = useState('');
  const [activeZonaIdx, setActiveZonaIdx] = useState<number | null>(null);

  // --- Handlers Scope ---
  const handleAddZona = () => {
    if (!tempZona.trim()) return;
    setNewPlan({ ...newPlan, scope: [...newPlan.scope, { zona: tempZona.trim(), espacios: [] }] });
    setTempZona('');
  };

  const handleRemoveZona = (idx: number) => {
    const newScope = [...newPlan.scope];
    newScope.splice(idx, 1);
    setNewPlan({ ...newPlan, scope: newScope });
    if (activeZonaIdx === idx) setActiveZonaIdx(null);
  };

  const handleAddEspacio = (zonaIdx: number) => {
    if (!tempEspacio.trim()) return;
    const newScope = [...newPlan.scope];
    newScope[zonaIdx].espacios = [...newScope[zonaIdx].espacios, tempEspacio.trim()];
    setNewPlan({ ...newPlan, scope: newScope });
    setTempEspacio('');
  };

  const handleRemoveEspacio = (zIdx: number, eIdx: number) => {
    const newScope = [...newPlan.scope];
    newScope[zIdx].espacios.splice(eIdx, 1);
    setNewPlan({ ...newPlan, scope: newScope });
  };

  // --- Handlers Items ---
  const handleAddItem = () => {
    if (!tempItem.trim()) return;
    setNewPlan({ ...newPlan, items_base: [...newPlan.items_base, tempItem.trim()] });
    setTempItem('');
  };

  const handleRemoveItem = (idx: number) => {
    const list = [...newPlan.items_base];
    list.splice(idx, 1);
    setNewPlan({ ...newPlan, items_base: list });
  };

  const handleSavePlan = async () => {
    if (!newPlan.nombre || newPlan.scope.length === 0) {
      onMessage({ type: 'error', text: 'Nombre y Alcance (Zonas) son obligatorios' });
      return;
    }
    try {
      const { error } = await supabase
        .from('mantenimiento_planes')
        .insert([{ ...newPlan, hotel_id: activeHotelId }]);

      if (error) throw error;
      onMessage({ type: 'success', text: 'Plan jerárquico guardado' });
      setIsAdding(false);
      onRefresh();
    } catch (err: any) {
      onMessage({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este plan maestro?')) return;
    const { error } = await supabase.from('mantenimiento_planes').delete().eq('id', id);
    if (error) onMessage({ type: 'error', text: error.message });
    else onRefresh();
  };

  return (
    <div className="space-y-xl animate-fade-in">
      {/* HEADER */}
      <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 flex justify-between items-center shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-xl">
          <div className="p-4 bg-accent/20 text-accent rounded-3xl ring-1 ring-accent/30 shadow-lg shadow-accent/10">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Preventivos de Alto Nivel</h3>
            <p className="text-xs text-muted font-black tracking-[0.2em] uppercase mt-2 opacity-60">Configuración Jerárquica de Mantenimiento</p>
          </div>
        </div>
        <Button onClick={() => setIsAdding(true)} icon={Plus} className="v-btn-accent px-10 py-5 text-sm font-black uppercase tracking-widest rounded-[2rem]">
          Crear Nuevo Plan
        </Button>
      </div>

      {isAdding ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
           {/* INFO BÁSICA Y ITEMS */}
           <div className="lg:col-span-4 space-y-lg">
              <Card className="p-xl bg-white/[0.02] border-white/10 space-y-xl">
                 <h4 className="text-xs font-black uppercase text-accent tracking-[0.2em]">Paso 1: Definición</h4>
                 <div className="space-y-lg">
                    <div className="input-group">
                       <label className="input-label">Nombre del Operativo</label>
                       <input className="v-input bg-white/5 border-white/5 focus:border-accent/50 text-sm" placeholder="Ej: Auditoría Planta de Osmosis" value={newPlan.nombre} onChange={e => setNewPlan({...newPlan, nombre: e.target.value})} />
                    </div>
                    <div className="input-group">
                       <label className="input-label">Frecuencia</label>
                       <select className="v-input bg-white/5 border-white/5 focus:border-accent/50 text-sm" value={newPlan.frecuencia} onChange={e => setNewPlan({...newPlan, frecuencia: e.target.value as any})}>
                          {FRECUENCIAS.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                       </select>
                    </div>
                 </div>
              </Card>

              <Card className="p-xl bg-white/[0.02] border-white/10 space-y-xl">
                 <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-accent tracking-[0.2em]">Paso 2: Checklist</h4>
                    <span className="badge badge-accent text-[9px] font-black">{newPlan.items_base.length} ITEMS</span>
                 </div>
                 <div className="flex gap-2">
                    <input className="v-input bg-white/5 border-white/5 text-xs py-3" placeholder="Elemento a revisar..." value={tempItem} onChange={e => setTempItem(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddItem()} />
                    <button onClick={handleAddItem} className="p-3 bg-accent text-white rounded-2xl hover:scale-105 active:scale-95 transition-all"><Plus size={18} /></button>
                 </div>
                 <div className="flex flex-wrap gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {newPlan.items_base.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/5 p-2 px-4 rounded-2xl text-[10px] font-black text-white group hover:border-accent/30 transition-all">
                         {item}
                         <button onClick={() => handleRemoveItem(i)} className="text-danger opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                      </div>
                    ))}
                 </div>
              </Card>

              <div className="flex gap-md pt-md">
                 <Button variant="ghost" className="flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-3xl" onClick={() => setIsAdding(false)}>Cancelar</Button>
                 <Button className="v-btn-accent flex-[2] py-4 text-xs font-black uppercase tracking-widest rounded-3xl shadow-xl shadow-accent/20" onClick={handleSavePlan}>Guardar Plan</Button>
              </div>
           </div>

           {/* ALCANCE JERÁRQUICO */}
           <div className="lg:col-span-8">
              <Card className="h-full bg-white/[0.03] border-accent/20 border-2 border-dashed p-0 overflow-hidden flex flex-col min-h-[600px]">
                 <div className="p-xl bg-accent/5 border-b border-white/5">
                    <h4 className="text-xl font-black text-white flex items-center gap-md">
                       <MapPin className="text-accent" /> Paso 3: Configurar Alcance Jerárquico
                    </h4>
                    <p className="text-xs text-muted font-bold tracking-widest uppercase mt-2">Añade zonas y los espacios que contienen</p>
                 </div>

                 <div className="flex-1 p-xl grid grid-cols-1 md:grid-cols-2 gap-xl overflow-hidden">
                    {/* COLUMNA ZONAS */}
                    <div className="space-y-md border-r border-white/5 pr-xl overflow-y-auto custom-scrollbar">
                       <div className="flex gap-2">
                          <input className="v-input bg-black/20 border-white/5 text-xs py-4" placeholder="Nueva Zona (ej: Planta 1)..." value={tempZona} onChange={e => setTempZona(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddZona()} />
                          <button onClick={handleAddZona} className="p-4 bg-white/5 text-white rounded-3xl hover:bg-white/10 transition-all">
                             <Plus size={20} />
                          </button>
                       </div>
                       
                       <div className="space-y-sm">
                          {newPlan.scope.map((z, idx) => (
                             <div 
                                key={idx} 
                                onClick={() => setActiveZonaIdx(idx)}
                                className={`p-5 rounded-[2rem] border transition-all cursor-pointer group flex justify-between items-center ${activeZonaIdx === idx ? 'bg-accent/10 border-accent/40 ring-1 ring-accent/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                             >
                                <div className="flex items-center gap-md">
                                   <div className={`p-3 rounded-2xl ${activeZonaIdx === idx ? 'bg-accent text-white shadow-lg' : 'bg-white/10 text-muted'}`}>
                                      <Box size={18} />
                                   </div>
                                   <div>
                                      <p className={`font-black tracking-tight ${activeZonaIdx === idx ? 'text-white' : 'text-muted'}`}>{z.zona}</p>
                                      <p className="text-[9px] font-black text-muted uppercase tracking-[0.1em]">{z.espacios.length} espacios</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-md">
                                   <button onClick={(e) => { e.stopPropagation(); handleRemoveZona(idx); }} className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                   <ChevronRight size={20} className={activeZonaIdx === idx ? 'text-accent' : 'text-muted'} />
                                </div>
                             </div>
                          ))}
                          {newPlan.scope.length === 0 && (
                             <div className="py-20 text-center opacity-20 flex flex-col items-center">
                                <MapPin size={48} className="mb-md" />
                                <p className="font-black text-[10px] uppercase tracking-widest">Sin zonas añadidas</p>
                             </div>
                          )}
                       </div>
                    </div>

                    {/* COLUMNA ESPACIOS */}
                    <div className="space-y-md overflow-y-auto custom-scrollbar">
                       {activeZonaIdx !== null ? (
                          <>
                             <div className="p-6 bg-accent/5 rounded-[2rem] border border-accent/10 mb-xl flex justify-between items-center">
                                <div>
                                   <p className="text-[10px] font-black text-accent uppercase tracking-widest">Gestionando Espacios en:</p>
                                   <p className="text-xl font-black text-white">{newPlan.scope[activeZonaIdx].zona}</p>
                                </div>
                                <button onClick={() => setActiveZonaIdx(null)} className="p-2 text-muted hover:text-white"><X size={20} /></button>
                             </div>

                             <div className="flex gap-2">
                                <input className="v-input bg-black/20 border-white/5 text-xs py-4" placeholder="Nuevo Espacio (ej: Hab 101, Calderas)..." value={tempEspacio} onChange={e => setTempEspacio(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddEspacio(activeZonaIdx)} />
                                <button onClick={() => handleAddEspacio(activeZonaIdx)} className="p-4 bg-accent text-white rounded-3xl hover:bg-accent/80 transition-all">
                                   <Plus size={20} />
                                </button>
                             </div>

                             <div className="grid grid-cols-1 gap-2">
                                {newPlan.scope[activeZonaIdx].espacios.map((e, eIdx) => (
                                   <div key={eIdx} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center group hover:border-white/20 transition-all">
                                      <span className="text-xs font-black text-white italic tracking-tight">{e}</span>
                                      <button onClick={() => handleRemoveEspacio(activeZonaIdx, eIdx)} className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all"><X size={16} /></button>
                                   </div>
                                ))}
                                {newPlan.scope[activeZonaIdx].espacios.length === 0 && (
                                   <div className="py-10 text-center opacity-20">
                                      <p className="font-black text-[9px] uppercase tracking-widest italic">Añade espacios a esta zona...</p>
                                   </div>
                                )}
                             </div>
                          </>
                       ) : (
                          <div className="h-full flex flex-col items-center justify-center opacity-20">
                             <Box size={48} className="mb-md" />
                             <p className="font-black text-[10px] uppercase tracking-widest text-center">Selecciona una zona para<br/>gestionar sus espacios</p>
                          </div>
                       )}
                    </div>
                 </div>
              </Card>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-xl">
           {planes.map(plan => (
             <Card key={plan.id} className="p-xl bg-white/[0.01] hover:bg-white/[0.03] transition-all group border-white/10 rounded-[2.5rem] relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-8">
                   <button onClick={() => handleDelete(plan.id)} className="p-3 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all bg-danger/5 rounded-2xl">
                      <Trash2 size={20} />
                   </button>
                </div>

                <div className="flex flex-col h-full">
                   <div className="p-4 bg-accent/20 text-accent rounded-3xl self-start mb-xl ring-1 ring-accent/20 shadow-lg">
                      <ListChecks size={28} />
                   </div>
                   
                   <h4 className="text-2xl font-black text-white mb-2 tracking-tighter">{plan.nombre}</h4>
                   <div className="flex items-center gap-sm text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-xl">
                      <Calendar size={12} className="text-accent" />
                      Frecuencia <span className="text-white bg-accent/20 px-2 py-0.5 rounded-lg">{plan.frecuencia}</span>
                   </div>

                   <div className="mt-auto space-y-md">
                      <div className="p-6 bg-black/20 rounded-3xl border border-white/5">
                         <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-3">Alcance Jerárquico</p>
                         <div className="flex flex-wrap gap-2">
                           {plan.scope?.slice(0, 3).map((s: any, i: number) => (
                             <div key={i} className="px-3 py-1 bg-white/5 rounded-xl text-[9px] font-black text-muted border border-white/10 flex items-center gap-2">
                               <MapPin size={8} /> {s.zona} ({s.espacios.length})
                             </div>
                           ))}
                           {plan.scope?.length > 3 && <span className="text-[9px] text-accent font-black">+{plan.scope.length - 3}</span>}
                         </div>
                      </div>

                      <div className="flex gap-1 overflow-hidden">
                         {plan.items_base?.slice(0, 5).map((item: string, i: number) => (
                           <div key={i} className="h-1 flex-1 bg-accent/50 rounded-full" title={item} />
                         ))}
                         {plan.items_base?.length > 5 && <div className="h-1 flex-1 bg-accent/20 rounded-full" />}
                      </div>
                      <p className="text-[9px] font-bold text-muted uppercase tracking-[0.1em]">{plan.items_base?.length} items en checklist</p>
                   </div>
                </div>
             </Card>
           ))}
           {planes.length === 0 && (
             <div className="md:col-span-3 py-40 flex flex-col items-center justify-center text-muted border-4 border-dashed border-white/5 rounded-[4rem] bg-white/[0.01]">
                <ShieldCheck size={64} className="mb-xl opacity-10" />
                <p className="font-black text-lg uppercase tracking-[0.3em] opacity-30">Página de Preventivos Vacía</p>
                <p className="text-xs uppercase font-black tracking-widest mt-2 opacity-20">Empieza creando el primer plan técnico</p>
             </div>
           )}
        </div>
      )}

      <style>{`
        .v-btn-accent { background: var(--color-accent); color: white; shadow: 0 10px 30px -10px var(--color-accent); }
        .v-btn-accent:hover { filter: brightness(1.1); scale: 1.02; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  );
};
