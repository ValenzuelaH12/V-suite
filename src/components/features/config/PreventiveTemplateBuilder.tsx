import { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  ChevronUp, 
  Settings,
  ShieldCheck,
  Save,
  X,
  PlusCircle,
  Hash,
  AlertOctagon,
  Type,
  Box
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { 
  PreventiveFrequency, 
  PreventiveTargetType, 
  PreventiveResponseType, 
  PreventiveCriticality 
} from '../../../types';
import { preventivoService } from '../../../services/preventivoService';
import { configService } from '../../../services/configService';

interface ItemEntry {
  id: string;
  texto: string;
  tipo_respuesta: PreventiveResponseType;
  criticidad: PreventiveCriticality;
  orden: number;
}

interface CategoryEntry {
  id: string;
  nombre: string;
  orden: number;
  items: ItemEntry[];
  isExpanded: boolean;
}

interface Props {
  hotelId: string;
  zones: any[];
  rooms: any[];
  assets: any[];
  onSave: () => void;
  onCancel: () => void;
  onRefresh: () => void;
}

export const PreventiveTemplateBuilder = ({ hotelId, zones, rooms, assets, onSave, onCancel, onRefresh }: Props) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [frecuencia, setFrecuencia] = useState<PreventiveFrequency>('semanal');
  const [targetType, setTargetType] = useState<PreventiveTargetType>('habitacion');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]); // IDS de habs/zonas/activos
  const [categories, setCategories] = useState<CategoryEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Modales de creación rápida
  const [showQuickAdd, setShowQuickAdd] = useState<'none' | 'zona' | 'habitacion' | 'activo'>('none');
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddZoneId, setQuickAddZoneId] = useState('');
  const [quickAddRoomId, setQuickAddRoomId] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Confirmación de borrado personalizada
  const [entityToDelete, setEntityToDelete] = useState<{ id: string, name: string } | null>(null);

  const addCategory = () => {
    const newCat: CategoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      nombre: '',
      orden: categories.length,
      items: [],
      isExpanded: true
    };
    setCategories([...categories, newCat]);
  };

  const removeCategory = (catId: string) => {
    setCategories(categories.filter(c => c.id !== catId));
  };

  const addItem = (catId: string) => {
    setCategories(categories.map(cat => {
      if (cat.id === catId) {
        const newItem: ItemEntry = {
          id: Math.random().toString(36).substr(2, 9),
          texto: '',
          tipo_respuesta: 'ok_nok',
          criticidad: 'baja',
          orden: cat.items.length
        };
        return { ...cat, items: [...cat.items, newItem] };
      }
      return cat;
    }));
  };

  const removeItem = (catId: string, itemId: string) => {
    setCategories(categories.map(cat => {
      if (cat.id === catId) {
        return { ...cat, items: cat.items.filter(i => i.id !== itemId) };
      }
      return cat;
    }));
  };

  const updateItem = (catId: string, itemId: string, field: keyof ItemEntry, value: any) => {
    setCategories(categories.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          items: cat.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
        };
      }
      return cat;
    }));
  };

  const handleSave = async () => {
    if (!nombre || categories.length === 0) {
      alert('Por favor, rellena el nombre y añade al menos una categoría.');
      return;
    }

    if (selectedTargets.length === 0) {
      alert('Por favor, selecciona al menos un objetivo (habitación, zona o activo) para este plan.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Crear plantilla y estructura
      const newTemplate = await preventivoService.createTemplate(
        { hotel_id: hotelId, nombre, descripcion, frecuencia, tipo_objetivo: targetType },
        categories
      );

      // 2. Guardar asignaciones
      const assignments = selectedTargets.map(targetId => ({
        entidad_tipo: targetType,
        entidad_id: targetId
      }));
      await preventivoService.saveAssignments(newTemplate.id, hotelId, assignments);

      onSave();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar la plantilla.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTarget = (id: string) => {
    if (selectedTargets.includes(id)) {
      setSelectedTargets(selectedTargets.filter(t => t !== id));
    } else {
      setSelectedTargets([...selectedTargets, id]);
    }
  };

  const handleDeleteEntity = async () => {
    if (!entityToDelete) return;
    
    try {
      const table = targetType === 'habitacion' ? 'habitaciones' : 
                    targetType === 'zona' ? 'zonas' : 'activos';
      
      console.log(`Ejecutando delete en tabla: ${table}, id: ${entityToDelete.id}`);
      await configService.delete(table, entityToDelete.id);
      
      setSelectedTargets(prev => prev.filter(t => t !== entityToDelete.id));
      onRefresh();
      setEntityToDelete(null);
    } catch (error: any) {
      console.error('Error detallado al borrar:', error);
      alert(`No se pudo borrar: ${error.message || 'Error de conexión o de integridad de datos'}`);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddName) return;
    
    setIsQuickAdding(true);
    try {
      if (showQuickAdd === 'zona') {
        const res = await configService.create('zonas', { nombre: quickAddName, hotel_id: hotelId });
        setSelectedTargets(prev => [...prev, res.id]);
      } else if (showQuickAdd === 'habitacion') {
        const res = await configService.create('habitaciones', { nombre: quickAddName, zona_id: quickAddZoneId, hotel_id: hotelId });
        setSelectedTargets(prev => [...prev, res.id]);
      } else if (showQuickAdd === 'activo') {
        const res = await configService.create('activos', { 
          nombre: quickAddName, 
          tipo: 'maquinaria', 
          zona_id: quickAddZoneId, 
          habitacion_id: quickAddRoomId, 
          hotel_id: hotelId 
        });
        setSelectedTargets(prev => [...prev, res.id]);
      }
      
      setQuickAddName('');
      setShowQuickAdd('none');
      onRefresh();
    } catch (error) {
      console.error('Error in quick add:', error);
      alert('Error al crear el nuevo elemento.');
    } finally {
      setIsQuickAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-lg animate-fade-in pb-xl">
      <div className="v-glass-card p-lg flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-md">
          <div className="p-sm bg-accent/10 rounded-lg text-accent">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Nuevo Procedimiento Preventivo</h2>
            <p className="text-secondary text-xs">Define el checklist y la frecuencia operativa</p>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
            <X size={18} /> Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : <Save size={18} />}
            <span>Guardar y Publicar</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Basic Config & Assignments */}
        <div className="lg:col-span-1 flex flex-col gap-lg">
          <Card className="p-lg space-y-md">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted border-b border-white/5 pb-sm">Configuración Básica</h3>
            
            <div className="space-y-sm">
              <label className="text-xs font-bold text-secondary uppercase">Nombre del Procedimiento</label>
              <input 
                className="input w-full" 
                placeholder="Ej: Revisión AC Semanal"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
              />
            </div>

            <div className="space-y-sm">
              <label className="text-xs font-bold text-secondary uppercase">Frecuencia Operativa</label>
              <select 
                className="select w-full"
                value={frecuencia}
                onChange={e => setFrecuencia(e.target.value as PreventiveFrequency)}
              >
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
                <option value="checkout">Al cambiar a LIMP (Takhys Style)</option>
              </select>
            </div>

            <div className="space-y-sm">
              <label className="text-xs font-bold text-secondary uppercase">¿A qué se aplica?</label>
              <select 
                className="select w-full"
                value={targetType}
                onChange={e => {
                  setTargetType(e.target.value as PreventiveTargetType);
                  setSelectedTargets([]); // Reset selection on type change
                }}
              >
                <option value="habitacion">Habitaciones</option>
                <option value="zona">Zonas Comunes</option>
                <option value="activo">Equipamiento (Activos)</option>
              </select>
            </div>
          </Card>

          <Card className="p-lg flex-1 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-md pb-sm border-b border-white/5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted">Destinatarios</h3>
              <button 
                className="text-[10px] text-accent font-bold hover:underline"
                onClick={() => {
                  const all = targetType === 'habitacion' ? rooms : targetType === 'zona' ? zones : assets;
                  setSelectedTargets(selectedTargets.length === all.length ? [] : all.map((x: any) => x.id));
                }}
              >
                {selectedTargets.length > 0 ? 'Desmarcar todo' : 'Marcar todo'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-sm space-y-1">
              {(targetType === 'habitacion' ? rooms : targetType === 'zona' ? zones : assets).map((item: any) => (
                <div 
                  key={item.id} 
                  className={`flex items-center gap-sm p-sm rounded-lg transition-colors group ${selectedTargets.includes(item.id) ? 'bg-accent/10 border border-accent/20' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <label className="flex-1 flex items-center gap-sm cursor-pointer">
                    <input 
                      type="checkbox"
                      className="checkbox"
                      checked={selectedTargets.includes(item.id)}
                      onChange={() => toggleTarget(item.id)}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{item.nombre}</span>
                      {targetType === 'habitacion' && (
                        <span className="text-[10px] text-muted">{zones.find(z => z.id === item.zona_id)?.nombre || 'Zona desconocida'}</span>
                      )}
                      {targetType === 'activo' && (
                        <span className="text-[10px] text-muted">{zones.find(z => z.id === item.zona_id)?.nombre}</span>
                      )}
                    </div>
                  </label>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEntityToDelete({ id: item.id, name: item.nombre });
                    }}
                    className="relative z-20 p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                    title="Eliminar permanentemente"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-md pt-md border-t border-white/5 flex flex-col gap-sm">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-accent border border-accent/20 border-dashed"
                onClick={() => {
                  setQuickAddName('');
                  setQuickAddZoneId(zones[0]?.id || '');
                  setShowQuickAdd(targetType);
                }}
              >
                <Plus size={14} /> <span>Añadir {targetType === 'habitacion' ? 'Habitación' : targetType === 'zona' ? 'Zona' : 'Equipo'}</span>
              </Button>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted uppercase">Seleccionados:</span>
                <span className="badge badge-accent">{selectedTargets.length}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Categories and Items */}
        <div className="lg:col-span-2 flex flex-col gap-lg">
          <div className="v-glass-card p-lg border-dashed border-white/10 flex flex-col gap-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-sm">
                <Settings size={18} className="text-accent" />
                Estructura del Checklist
              </h3>
              <Button variant="secondary" onClick={addCategory} className="btn-sm">
                <Plus size={16} /> Añadir Categoría
              </Button>
            </div>

            <div className="space-y-md">
              {categories.map((cat, idx) => (
                <div key={cat.id} className="v-glass-card border border-white/5 bg-white/5 overflow-hidden">
                  <div className="p-md flex items-center gap-md bg-white/5">
                    <GripVertical size={16} className="text-muted cursor-move" />
                    <input 
                      className="bg-transparent border-none text-white font-bold focus:outline-none flex-1"
                      placeholder={`Categoría ${idx + 1}`}
                      value={cat.nombre}
                      onChange={e => setCategories(categories.map(c => c.id === cat.id ? { ...c, nombre: e.target.value } : c))}
                    />
                    <div className="flex items-center gap-sm">
                      <Button variant="ghost" className="p-xs text-danger hover:bg-danger/10" onClick={() => removeCategory(cat.id)}>
                        <Trash2 size={16} />
                      </Button>
                      <button 
                        className="p-xs text-muted hover:text-white"
                        onClick={() => setCategories(categories.map(c => c.id === cat.id ? { ...c, isExpanded: !c.isExpanded } : c))}
                      >
                        {cat.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>

                  {cat.isExpanded && (
                    <div className="p-lg space-y-md border-t border-white/5">
                      <div className="incident-list">
                        {cat.items.map((item, itemIdx) => (
                          <div key={item.id} className="flex gap-md items-start p-sm bg-white/5 rounded-lg border border-white/5 animate-slide-right">
                             <div className="mt-2 text-muted"><Hash size={14} /></div>
                             <div className="flex-1 space-y-sm">
                                <input 
                                  className="input w-full variant-small" 
                                  placeholder="¿Qué se debe revisar?"
                                  value={item.texto}
                                  onChange={e => updateItem(cat.id, item.id, 'texto', e.target.value)}
                                />
                                <div className="flex gap-sm">
                                   <div className="flex-1">
                                      <label className="text-[10px] text-muted uppercase font-bold mb-xs block">Respuesta</label>
                                      <select 
                                        className="select w-full variant-small h-8 text-xs"
                                        value={item.tipo_respuesta}
                                        onChange={e => updateItem(cat.id, item.id, 'tipo_respuesta', e.target.value)}
                                      >
                                        <option value="ok_nok">OK / NOK</option>
                                        <option value="si_no">SÍ / NO</option>
                                        <option value="numero">Valor Numérico</option>
                                        <option value="texto">Texto Libre</option>
                                      </select>
                                   </div>
                                   <div className="flex-1">
                                      <label className="text-[10px] text-muted uppercase font-bold mb-xs block">Criticidad</label>
                                      <select 
                                        className="select w-full variant-small h-8 text-xs"
                                        value={item.criticidad}
                                        onChange={e => updateItem(cat.id, item.id, 'criticidad', e.target.value)}
                                      >
                                        <option value="baja">Baja</option>
                                        <option value="media">Media</option>
                                        <option value="alta">Alta</option>
                                      </select>
                                   </div>
                                </div>
                             </div>
                             <Button variant="ghost" className="p-xs text-danger hover:bg-danger/10 mt-1" onClick={() => removeItem(cat.id, item.id)}>
                               <Trash2 size={16} />
                             </Button>
                          </div>
                        ))}
                      </div>
                      <button 
                        className="flex items-center gap-sm text-accent text-xs font-bold hover:underline"
                        onClick={() => addItem(cat.id)}
                      >
                        <PlusCircle size={14} /> Añadir Ítem de Revisión
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {categories.length === 0 && (
                <div className="text-center py-xl border-2 border-dashed border-white/5 rounded-xl text-muted">
                  <ShieldCheck size={48} className="mx-auto mb-md opacity-20" />
                  <p>Aún no has definido la estructura del checklist.</p>
                  <Button variant="ghost" className="mt-md" onClick={addCategory}>Empezar a construir</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Creación Rápida */}
      <Modal 
        isOpen={showQuickAdd !== 'none'} 
        onClose={() => setShowQuickAdd('none')}
        title={`Registrar ${showQuickAdd === 'zona' ? 'Nueva Zona' : showQuickAdd === 'habitacion' ? 'Nueva Habitación' : 'Nuevo Equipo'}`}
      >
        <form onSubmit={handleQuickAdd} className="space-y-md">
          <div className="input-group">
            <label className="input-label">Nombre</label>
            <input 
              className="input" 
              autoFocus
              value={quickAddName}
              onChange={e => setQuickAddName(e.target.value)}
              placeholder="Nombre del nuevo elemento..."
              required
            />
          </div>

          {(showQuickAdd === 'habitacion' || showQuickAdd === 'activo') && (
            <div className="input-group">
              <label className="input-label">Zona de Ubicación</label>
              <select 
                className="select"
                value={quickAddZoneId}
                onChange={e => setQuickAddZoneId(e.target.value)}
                required
              >
                <option value="">Selecciona Zona...</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
            </div>
          )}

          {showQuickAdd === 'activo' && (
            <div className="input-group">
              <label className="input-label">Habitación (Opcional)</label>
              <select 
                className="select"
                value={quickAddRoomId}
                onChange={e => setQuickAddRoomId(e.target.value)}
              >
                <option value="">Ninguna (Zona común)</option>
                {rooms.filter(r => r.zona_id === quickAddZoneId).map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="modal-footer pt-md">
            <Button type="submit" disabled={isQuickAdding}>
              {isQuickAdding ? 'Guardando...' : 'Crear y Añadir'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmación de Borrado Permanente */}
      <Modal
        isOpen={!!entityToDelete}
        onClose={() => setEntityToDelete(null)}
        title="Confirmar Eliminación"
      >
        <div className="space-y-md text-center py-md">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-md border border-rose-500/20">
            <Trash2 size={32} />
          </div>
          <p className="text-white font-bold text-lg">¿Estás seguro?</p>
          <div className="text-muted text-sm px-lg space-y-md">
            <p>
              Estás a punto de eliminar permanentemente <span className="text-white font-black">"{entityToDelete?.name}"</span>.
            </p>
            <p className="bg-rose-500/5 p-sm rounded-xl border border-rose-500/10 text-[10px] uppercase font-bold tracking-widest text-rose-400">
              Esta acción no se puede deshacer y puede afectar a otros módulos
            </p>
          </div>
          <div className="flex gap-md pt-lg">
             <Button variant="ghost" className="flex-1" onClick={() => setEntityToDelete(null)}>Cancelar</Button>
             <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={handleDeleteEntity}>Eliminar Ahora</Button>
          </div>
        </div>
      </Modal>

      <style>{`
        .variant-small {
          font-size: 13px !important;
          padding: 0.5rem 0.75rem !important;
        }
      `}</style>
    </div>
  );
};
