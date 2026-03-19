import React, { useState } from 'react';
import { ClipboardList, Plus, Trash2, Calendar, Activity, CheckCircle, Clock, Layers, X, Repeat, ChevronRight, ChevronLeft, Circle, AlertTriangle, ShieldCheck, Building2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { configService } from '../../../services/configService';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Badge } from '../../ui/Badge';
import { Skeleton } from '../../ui/Skeleton';

interface MaintenanceManagerProps {
  maintenance: any[];
  templates: any[];
  categories?: any[]; // Dynamic categories from DB
  onMessage: (msg: { type: 'success' | 'error', text: string }) => void;
  onRefresh: () => void;
  activeHotelId: string | null;
}

export const MaintenanceManager: React.FC<MaintenanceManagerProps> = ({ 
  maintenance, 
  templates, 
  categories = [], 
  onMessage,
  onRefresh,
  activeHotelId
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'tareas' | 'plantillas' | 'categorias'>('tareas');
  const [isAddingMaint, setIsAddingMaint] = useState(false);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [isManagingCats, setIsManagingCats] = useState(false);
  
  // Dynamic categories state if not passed as prop
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  const [newMaint, setNewMaint] = useState({
    titulo: '',
    descripcion: '',
    frecuencia: 'mensual',
    proxima_fecha: new Date().toISOString().split('T')[0],
    categoria: '',
    subcategoria: '',
    checklist_items: [] as string[],
    hotel_id: activeHotelId || ''
  });

  const [newCheckItem, setNewCheckItem] = useState('');

  const [newCat, setNewCat] = useState({ nombre: '', subcategorias: [] as string[] });
  const [newSubItem, setNewSubItem] = useState('');

  // Execution State
  const [executingTask, setExecutingTask] = useState<any | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [inspectedRooms, setInspectedRooms] = useState<Record<string, any>>({});
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [inspectionChecklist, setInspectionChecklist] = useState<any[]>([]);

  // Fetch rooms for execution
  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const { data, error } = await supabase
        .from('habitaciones')
        .select('*, zonas(nombre)')
        .eq('hotel_id', activeHotelId)
        .order('nombre');
      if (error) throw error;
      setRooms(data || []);
    } catch (e) {
      console.error('Error fetching rooms:', e);
    } finally {
      setLoadingRooms(false);
    }
  };

  const startExecution = async (task: any) => {
    try {
      const { data, error } = await supabase
        .from('mantenimiento_ejecucion')
        .insert([{
          tarea_id: task.id,
          hotel_id: activeHotelId,
          tecnico_id: (await supabase.auth.getUser()).data.user?.id,
          estado: 'in_progress'
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      setExecutionId(data.id);
      setExecutingTask(task);
      fetchRooms();
      onMessage({ type: 'success', text: `Ejecución iniciada: ${task.titulo}` });
    } catch (e: any) {
      onMessage({ type: 'error', text: 'Error al iniciar ejecución: ' + e.message });
    }
  };

  const handleOpenInspection = (room: any) => {
    setSelectedRoom(room);
    const existing = inspectedRooms[room.id];
    if (existing) {
      setInspectionChecklist(existing.checklist);
    } else {
      // Prioritize task-specific checklist items, fallback to category subcategories
      const checklist = executingTask?.checklist_items?.length > 0 
        ? executingTask.checklist_items 
        : (dbCategories.find(c => c.nombre === executingTask?.categoria)?.subcategorias || []);
      
      // Default to 'bueno' status
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
    
    // Logic: Room is 'issue' if any item is 'malo' or 'regular'
    const hasBad = inspectionChecklist.some(i => i.status === 'malo');
    const hasRegular = inspectionChecklist.some(i => i.status === 'regular');
    
    let status: 'ok' | 'issue' = 'ok';
    if (hasBad || hasRegular) {
      status = 'issue';
    }
    try {
      const { error } = await supabase
        .from('mantenimiento_entidades')
        .insert([{
          ejecucion_id: executionId,
          entidad_id: selectedRoom.id,
          entidad_nombre: selectedRoom.nombre,
          entidad_tipo: 'habitacion',
          estado: status,
          checklist_resultados: inspectionChecklist,
          hotel_id: activeHotelId
        }]);
      if (error) throw error;
      setInspectedRooms(prev => ({
        ...prev,
        [selectedRoom.id]: { status, checklist: inspectionChecklist }
      }));
      setSelectedRoom(null);
      onMessage({ type: 'success', text: `Revisión guardada: ${selectedRoom.nombre}` });
    } catch (e: any) {
      onMessage({ type: 'error', text: 'Error al guardar revisión: ' + e.message });
    }
  };

  const finishExecution = async () => {
    if (!executionId) return;
    try {
      const { error } = await supabase
        .from('mantenimiento_ejecucion')
        .update({
          estado: 'completed',
          completado_at: new Date().toISOString()
        })
        .eq('id', executionId);
      if (error) throw error;
      setExecutingTask(null);
      setExecutionId(null);
      setInspectedRooms({});
      onRefresh();
      onMessage({ type: 'success', text: 'Mantenimiento finalizado con éxito.' });
    } catch (e: any) {
      onMessage({ type: 'error', text: 'Error al finalizar: ' + e.message });
    }
  };

  const fetchCategories = async () => {
    setLoadingCats(true);
    try {
      const { data, error } = await supabase
        .from('mantenimiento_categorias')
        .select('*')
        .order('nombre');
      if (error) throw error;
      setDbCategories(data || []);
    } catch (e: any) {
      console.error('Error fetching categories:', e);
    } finally {
      setLoadingCats(false);
    }
  };

  React.useEffect(() => {
    fetchCategories();
  }, [activeHotelId]);

  const [newTemplate, setNewTemplate] = useState({ nombre: '', items: [] as string[], hotel_id: activeHotelId || '' });
  const [newTemplateItem, setNewTemplateItem] = useState('');

  const handleAddTemplateItem = () => {
    if (!newTemplateItem.trim()) return;
    setNewTemplate(prev => ({
      ...prev,
      items: [...prev.items, newTemplateItem.trim()]
    }));
    setNewTemplateItem('');
  };

  React.useEffect(() => {
    if (activeHotelId) {
      setNewMaint(prev => ({ ...prev, hotel_id: activeHotelId }));
      setNewTemplate(prev => ({ ...prev, hotel_id: activeHotelId }));
    }
  }, [activeHotelId]);

  const handleAddMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configService.create('mantenimiento_preventivo', { ...newMaint, hotel_id: activeHotelId });
      onMessage({ type: 'success', text: 'Tarea de mantenimiento creada.' });
      setIsAddingMaint(false);
      setNewMaint({ 
        titulo: '', 
        descripcion: '', 
        frecuencia: 'mensual', 
        proxima_fecha: new Date().toISOString().split('T')[0], 
        categoria: '',
        subcategoria: '',
        checklist_items: [],
        hotel_id: activeHotelId || ''
      });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: error.message });
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.nombre.trim()) return;
    try {
      await configService.create('mantenimiento_plantillas', { ...newTemplate, hotel_id: activeHotelId });
      onMessage({ type: 'success', text: 'Plantilla creada.' });
      setIsAddingTemplate(false);
      setNewTemplate({ nombre: '', items: [], hotel_id: activeHotelId || '' });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: error.message });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.nombre.trim()) return;
    try {
      const { error } = await supabase
        .from('mantenimiento_categorias')
        .insert([{ ...newCat, hotel_id: activeHotelId }]);
      if (error) throw error;
      onMessage({ type: 'success', text: 'Categoría creada.' });
      setNewCat({ nombre: '', subcategorias: [] });
      setIsManagingCats(false);
      fetchCategories();
    } catch (error: any) {
      onMessage({ type: 'error', text: error.message });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
    try {
      const { error } = await supabase
        .from('mantenimiento_categorias')
        .delete()
        .eq('id', id);
      if (error) throw error;
      onMessage({ type: 'success', text: 'Categoría eliminada.' });
      fetchCategories();
    } catch (error: any) {
      onMessage({ type: 'error', text: error.message });
    }
  };

  const stats = {
    total: maintenance.length,
    templates: templates.length,
    urgent: maintenance.filter(m => {
      const diff = new Date(m.proxima_fecha).getTime() - new Date().getTime();
      return diff < 86400000 * 3;
    }).length
  };

  const loading = !activeHotelId || (maintenance.length === 0 && templates.length === 0 && dbCategories.length === 0);

  return (
    <div className="maintenance-redesign animate-fade-in flex flex-col gap-xl">
      <div className="v-stats-grid">
        <div className="v-stat-card v-glass-card">
          <div className="flex flex-col">
            <span className="v-stat-label">Programas Activos</span>
            <div className="flex items-end gap-sm mt-xs">
              <span className="v-stat-value text-indigo-400">{loading ? <Skeleton width="40px" height="32px" /> : stats.total}</span>
              <Calendar size={20} className="text-indigo-400/50 mb-1" />
            </div>
          </div>
        </div>
        
        <div className="v-stat-card v-glass-card">
          <div className="flex flex-col">
            <span className="v-stat-label">Plantillas</span>
            <div className="flex items-end gap-sm mt-xs">
              <span className="v-stat-value text-purple-400">{loading ? <Skeleton width="40px" height="32px" /> : stats.templates}</span>
              <ClipboardList size={20} className="text-purple-400/50 mb-1" />
            </div>
          </div>
        </div>

        <div className="v-stat-card v-glass-card">
          <div className="flex flex-col">
            <span className="v-stat-label">Próximos 3 días</span>
            <div className="flex items-end gap-sm mt-xs">
              <span className={`v-stat-value ${stats.urgent > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                {loading ? <Skeleton width="40px" height="32px" /> : stats.urgent}
              </span>
              <Activity size={20} className={`${stats.urgent > 0 ? 'text-orange-400/50' : 'text-emerald-400/50'} mb-1`} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-md">
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
          <button 
            onClick={() => setActiveSubTab('tareas')} 
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeSubTab === 'tareas' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-white'}`}
          >
            <Calendar size={16} /> Tareas Programadas
          </button>
          <button 
            onClick={() => setActiveSubTab('plantillas')} 
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeSubTab === 'plantillas' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-white'}`}
          >
            <ClipboardList size={16} /> Plantillas
          </button>
          <button 
            onClick={() => setActiveSubTab('categorias')} 
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeSubTab === 'categorias' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-white'}`}
          >
            <Layers size={16} /> Categorías
          </button>
        </div>
        
        <div className="flex gap-md">
          <Button 
            variant="primary" 
            onClick={() => activeSubTab === 'tareas' ? setIsAddingMaint(true) : activeSubTab === 'plantillas' ? setIsAddingTemplate(true) : setIsManagingCats(true)} 
            icon={Plus}
            className="rounded-xl font-bold uppercase tracking-wider text-xs px-6 py-3"
          >
            {activeSubTab === 'tareas' ? 'Nueva Tarea' : activeSubTab === 'plantillas' ? 'Nueva Plantilla' : 'Añadir Categoría'}
          </Button>
        </div>
      </div>

      {executingTask ? (
        <div className="animate-fade-in">
          <div className="v-glass-card p-lg mb-xl border-accent/20 flex flex-col md:flex-row justify-between items-center gap-lg">
             <div className="flex items-center gap-lg">
                <div className="p-4 bg-accent/20 text-accent rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                   <Activity size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">{executingTask.titulo}</h2>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={12} /> {rooms.length} HABITACIONES TOTALES
                  </p>
                </div>
             </div>
             <button 
              onClick={finishExecution} 
              className="px-8 py-3.5 bg-white text-black font-black rounded-2xl hover:scale-105 transition-all text-xs uppercase tracking-widest shadow-xl"
             >
               Finalizar Sesión
             </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {loadingRooms ? (
              Array(12).fill(0).map((_, i) => (
                <div key={i} className="v-glass-card p-lg flex flex-col items-center gap-3">
                  <Skeleton variant="circle" width="48px" height="48px" />
                  <Skeleton width="60%" height="20px" />
                </div>
              ))
            ) : rooms.map(room => {
              const inspection = inspectedRooms[room.id];
              return (
                <button
                  key={room.id}
                  onClick={() => handleOpenInspection(room)}
                  className={`relative p-lg rounded-3xl border transition-all flex flex-col items-center gap-3 group ${
                    inspection?.status === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30' : 
                    inspection?.status === 'issue' ? 'bg-orange-500/10 border-orange-500/30' : 
                    'v-glass-card hover:border-accent/40 hover:scale-105'
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-all shadow-lg ${
                    inspection?.status === 'ok' ? 'bg-emerald-500 text-white' : 
                    inspection?.status === 'issue' ? 'bg-amber-500 text-white' : 'bg-white/5 text-muted group-hover:bg-accent group-hover:text-white'
                  }`}>
                    {inspection?.status === 'issue' ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
                  </div>
                  <span className="text-lg font-black text-white tracking-tighter">{room.nombre}</span>
                  {inspection && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle size={16} className={inspection.status === 'ok' ? 'text-emerald-400' : 'text-amber-400'} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : activeSubTab === 'tareas' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="v-glass-card p-xl flex flex-col gap-4">
                <Skeleton variant="circle" width="48px" height="48px" />
                <Skeleton width="80%" height="28px" />
                <Skeleton width="100%" height="40px" />
                <Skeleton width="100%" height="48px" />
              </div>
            ))
          ) : maintenance.map(m => (
            <div key={m.id} className="v-glass-card group p-xl flex flex-col relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-accent/10 transition-all" />
              <div className="flex justify-between items-start mb-lg">
                <div className="p-3.5 rounded-2xl bg-accent/10 text-accent shadow-inner"><Calendar size={24} /></div>
                <Badge variant="success" className="bg-accent/20 text-accent border-accent/20 text-[10px] tracking-tighter">ACTIVA</Badge>
              </div>
              <h4 className="text-xl font-black text-white mb-2 leading-tight">{m.titulo}</h4>
              <p className="text-xs text-muted mb-8 line-clamp-2 leading-relaxed">{m.descripcion || 'Sin descripción detallada para esta tarea.'}</p>
              
              <div className="flex items-center gap-4 mt-auto">
                <button 
                  onClick={() => startExecution(m)}
                  className="flex-1 py-3.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                >
                  <Activity size={14} /> Iniciar Tarea
                </button>
                <button 
                  onClick={() => configService.delete('mantenimiento_preventivo', m.id).then(onRefresh)} 
                  className="p-3.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-muted hover:text-rose-400 border border-white/5 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : activeSubTab === 'plantillas' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="v-glass-card p-xl">
                <Skeleton width="100%" height="24px" />
                <Skeleton width="60%" height="16px" className="mt-2" />
              </div>
            ))
          ) : templates.map(t => (
            <div key={t.id} className="v-glass-card group p-xl border-white/5 hover:border-accent/30 transition-all">
              <div className="flex justify-between items-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center shadow-inner">
                  <ClipboardList size={22} />
                </div>
                <span className="text-[10px] font-black text-white bg-purple-500/20 px-3 py-1 rounded-full uppercase tracking-tighter">
                  {t.items?.length || 0} Puntos de revisión
                </span>
              </div>
              <h4 className="text-lg font-black text-white mb-6 group-hover:text-accent transition-colors">{t.nombre}</h4>
              <div className="flex justify-end pt-4 border-t border-white/5">
                <button onClick={() => configService.delete('mantenimiento_plantillas', t.id).then(onRefresh)} className="p-2.5 rounded-xl hover:bg-rose-500/10 text-muted hover:text-rose-400 transition-all"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
             Array(3).fill(0).map((_, i) => <Skeleton key={i} height="120px" className="v-glass-card" />)
          ) : dbCategories.map(cat => (
            <div key={cat.id} className="v-glass-card group p-xl border-white/5 hover:border-accent/30 transition-all">
              <div className="flex justify-between items-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
                  <Layers size={22} />
                </div>
                <span className="text-[10px] font-black text-white bg-amber-500/20 px-3 py-1 rounded-full uppercase tracking-tighter">
                  {cat.subcategorias?.length || 0} Subcategorías
                </span>
              </div>
              <h4 className="text-lg font-black text-white mb-6 group-hover:text-accent transition-colors">{cat.nombre}</h4>
              <div className="flex justify-end pt-4 border-t border-white/5">
                <button onClick={() => handleDeleteCategory(cat.id)} className="p-2.5 rounded-xl hover:bg-rose-500/10 text-muted hover:text-rose-400 transition-all"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={isAddingMaint} onClose={() => setIsAddingMaint(false)} title="Nueva Programación" maxWidth="750px">
        <form onSubmit={handleAddMaint} className="maint-premium-form p-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <div className="flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <label className="text-xs font-bold text-muted uppercase">Título</label>
                <input type="text" required value={newMaint.titulo} onChange={e => setNewMaint({...newMaint, titulo: e.target.value})} className="premium-input" />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="text-xs font-bold text-muted uppercase">Descripción</label>
                <textarea value={newMaint.descripcion} onChange={e => setNewMaint({...newMaint, descripcion: e.target.value})} className="premium-textarea" rows={3} />
              </div>
            </div>
            <div className="flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <label className="text-xs font-bold text-muted uppercase">Frecuencia</label>
                <select value={newMaint.frecuencia} onChange={e => setNewMaint({...newMaint, frecuencia: e.target.value})} className="premium-select">
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                </select>
              </div>
              <div className="flex flex-col gap-xs">
                <label className="text-xs font-bold text-muted uppercase">Categoría</label>
                <select value={newMaint.categoria} onChange={e => setNewMaint({...newMaint, categoria: e.target.value})} className="premium-select">
                  <option value="">Seleccione...</option>
                   {dbCategories.map(cat => <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-xs mt-md">
                <label className="text-xs font-bold text-muted uppercase">Checklist Personalizado</label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    placeholder="Añadir punto al checklist..." 
                    value={newCheckItem} 
                    onChange={e => setNewCheckItem(e.target.value)} 
                    className="premium-input flex-1"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newCheckItem.trim()) {
                          setNewMaint(prev => ({ ...prev, checklist_items: [...prev.checklist_items, newCheckItem.trim()] }));
                          setNewCheckItem('');
                        }
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    onClick={() => {
                      if (newCheckItem.trim()) {
                        setNewMaint(prev => ({ ...prev, checklist_items: [...prev.checklist_items, newCheckItem.trim()] }));
                        setNewCheckItem('');
                      }
                    }} 
                    icon={Plus} 
                    variant="ghost"
                  />
                </div>
                
                {/* Sugerencias Rápidas */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Cama', 'Sofá', 'Mesa', 'Ducha', 'TV', 'Minibar', 'Climatización'].map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        if (!newMaint.checklist_items.includes(item)) {
                          setNewMaint(prev => ({ ...prev, checklist_items: [...prev.checklist_items, item] }));
                        }
                      }}
                      className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-muted hover:text-white transition-all"
                    >
                      + {item}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                  {newMaint.checklist_items.map((item, i) => (
                    <Badge key={i} className="flex gap-1 items-center bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                      {item}
                      <X size={12} className="cursor-pointer hover:text-white" onClick={() => setNewMaint({ ...newMaint, checklist_items: newMaint.checklist_items.filter((_, idx) => idx !== i) })} />
                    </Badge>
                  ))}
                  {newMaint.checklist_items.length === 0 && (
                    <span className="text-[10px] text-muted italic">Se usarán los puntos por defecto de la categoría si no añades personalizados.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-md mt-xl">
            <Button variant="ghost" onClick={() => setIsAddingMaint(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Crear Tarea</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAddingTemplate} onClose={() => setIsAddingTemplate(false)} title="Nueva Plantilla" maxWidth="500px">
        <form onSubmit={handleAddTemplate} className="p-lg flex flex-col gap-lg">
          <input type="text" placeholder="Nombre de plantilla" required value={newTemplate.nombre} onChange={e => setNewTemplate({...newTemplate, nombre: e.target.value})} className="premium-input" />
          <div className="flex gap-2">
            <input type="text" placeholder="Añadir punto..." value={newTemplateItem} onChange={e => setNewTemplateItem(e.target.value)} className="premium-input flex-1" />
            <Button type="button" onClick={handleAddTemplateItem} icon={Plus} />
          </div>
          <div className="flex flex-wrap gap-2">
            {newTemplate.items.map((item, i) => <Badge key={i} className="flex gap-1 items-center">{item}<X size={12} className="cursor-pointer" onClick={() => setNewTemplate({...newTemplate, items: newTemplate.items.filter((_, idx) => idx !== i)})} /></Badge>)}
          </div>
          <Button variant="primary" type="submit">Guardar</Button>
        </form>
      </Modal>

      <Modal isOpen={isManagingCats} onClose={() => setIsManagingCats(false)} title="Nueva Categoría" maxWidth="500px">
        <form onSubmit={handleCreateCategory} className="p-lg flex flex-col gap-lg">
          <input type="text" placeholder="Nombre de categoría" required value={newCat.nombre} onChange={e => setNewCat({...newCat, nombre: e.target.value})} className="premium-input" />
          <div className="flex gap-2">
            <input type="text" placeholder="Subcategoría..." value={newSubItem} onChange={e => setNewSubItem(e.target.value)} className="premium-input flex-1" />
            <Button type="button" onClick={() => { if(newSubItem.trim()) { setNewCat({...newCat, subcategorias: [...newCat.subcategorias, newSubItem.trim()]}); setNewSubItem(''); }}} icon={Plus} />
          </div>
          <div className="flex flex-wrap gap-2">
            {newCat.subcategorias.map((sub, i) => <Badge key={i} className="flex gap-1 items-center">{sub}<X size={12} className="cursor-pointer" onClick={() => setNewCat({...newCat, subcategorias: newCat.subcategorias.filter((_, idx) => idx !== i)})} /></Badge>)}
          </div>
          <Button variant="primary" type="submit">Crear</Button>
        </form>
      </Modal>

      <Modal isOpen={!!selectedRoom} onClose={() => setSelectedRoom(null)} title={`Habitación ${selectedRoom?.nombre}`} maxWidth="500px">
        <div className="p-lg flex flex-col gap-lg">
          <div className="flex flex-col gap-md">
            {inspectionChecklist.map((item, idx) => (
              <div key={idx} className="p-md rounded-2xl border border-white/5 bg-white/5 flex flex-col gap-sm">
                <div className="flex justify-between items-center px-xs">
                  <span className="font-bold text-white uppercase text-xs">{item.name}</span>
                  {item.status === 'bueno' && <Badge className="bg-emerald-500 text-white text-[10px]">BUEN ESTADO</Badge>}
                  {item.status === 'regular' && <Badge className="bg-amber-500 text-white text-[10px]">ESTADO MEDIO</Badge>}
                  {item.status === 'malo' && <Badge className="bg-rose-500 text-white text-[10px]">MAL ESTADO</Badge>}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleToggleItemStatus(idx, 'bueno')}
                    className={`py-2 rounded-xl text-[10px] font-black transition-all ${item.status === 'bueno' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-muted hover:text-white'}`}
                  >
                    BUENO
                  </button>
                  <button 
                    onClick={() => handleToggleItemStatus(idx, 'regular')}
                    className={`py-2 rounded-xl text-[10px] font-black transition-all ${item.status === 'regular' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/5 text-muted hover:text-white'}`}
                  >
                    MEDIO
                  </button>
                  <button 
                    onClick={() => handleToggleItemStatus(idx, 'malo')}
                    className={`py-2 rounded-xl text-[10px] font-black transition-all ${item.status === 'malo' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-muted hover:text-white'}`}
                  >
                    MALO
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="primary" onClick={handleSaveInspection}>Guardar Revisión</Button>
        </div>
      </Modal>

      <style>{`
        .premium-input, .premium-textarea, .premium-select {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px; padding: 0.75rem 1rem; color: white; width: 100%; transition: all 0.2s;
        }
        .premium-input:focus, .premium-textarea:focus, .premium-select:focus {
          outline: none; border-color: #6366f1; background: rgba(255, 255, 255, 0.05);
        }
        .premium-select option { background: #111; color: white; }
      `}</style>
    </div>
  );
};
