import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, AlertCircle } from 'lucide-react';
import { IncidentType } from '../../../types';
import { configService } from '../../../services/configService';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { auditService } from '../../../services/auditService';

interface IncidentTypeManagerProps {
  types: IncidentType[];
  onMessage: (msg: { type: 'success' | 'error', text: string }) => void;
  onRefresh: () => void;
  activeHotelId: string | null;
}

export const IncidentTypeManager: React.FC<IncidentTypeManagerProps> = ({ 
  types, onMessage, onRefresh, activeHotelId 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nombre: '', categoria: 'general' });
  const [loading, setLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<IncidentType | null>(null);

  const handleCreate = async () => {
    if (!formData.nombre.trim()) return;
    setLoading(true);
    try {
      const newType = await configService.create('tipos_problemas', {
        nombre: formData.nombre,
        categoria: formData.categoria
      }, activeHotelId);
      
      await auditService.log({
        accion: 'CREACION',
        entidad: 'TIPO_INCIDENCIA',
        descripcion: `Nueva categoría técnica: ${formData.nombre}`,
        detalles: { id: newType.id, ...formData },
        hotel_id: activeHotelId || undefined
      });

      onMessage({ type: 'success', text: 'Tipo de incidencia añadido' });
      setIsAdding(false);
      setFormData({ nombre: '', categoria: 'general' });
      onRefresh();
    } catch (error) {
      console.error(error);
      onMessage({ type: 'error', text: 'Error al añadir tipo' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, nombre: string) => {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      await configService.update('tipos_problemas', id, { nombre });
      
      await auditService.log({
        accion: 'ACTUALIZACION',
        entidad: 'TIPO_INCIDENCIA',
        descripcion: `Actualizada categoría técnica a: ${nombre}`,
        detalles: { id, nombre },
        hotel_id: activeHotelId || undefined
      });

      onMessage({ type: 'success', text: 'Tipo actualizado' });
      setEditingId(null);
      onRefresh();
    } catch (error) {
      console.error(error);
      onMessage({ type: 'error', text: 'Error al actualizar' });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    try {
      await configService.delete('tipos_problemas', itemToDelete.id);
      
      await auditService.log({
        accion: 'ELIMINACION',
        entidad: 'TIPO_INCIDENCIA',
        descripcion: `Eliminada categoría técnica: ${itemToDelete.nombre}`,
        detalles: { id: itemToDelete.id, nombre: itemToDelete.nombre },
        hotel_id: activeHotelId || undefined
      });

      onMessage({ type: 'success', text: 'Tipo eliminado' });
      onRefresh();
      setItemToDelete(null);
    } catch (error) {
      console.error(error);
      onMessage({ type: 'error', text: 'Error al eliminar' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (type: IncidentType) => {
    setItemToDelete(type);
  };

  return (
    <div className="animate-fade-in space-y-xl">
      <div className="v-page-header v-glass-card py-4 px-6 mb-0">
        <div className="flex items-center gap-md">
          <div className="p-2 bg-rose-500/20 text-rose-500 rounded-lg">
            <AlertCircle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase">Tipos de Incidencias</h2>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Configuración de categorías de reporte técnico</p>
          </div>
        </div>
        <Button 
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
          className="bg-accent hover:bg-accent-hover text-white rounded-xl px-6 py-2 text-xs font-bold uppercase tracking-wider"
          icon={Plus}
        >
          <span>Añadir Categoría</span>
        </Button>
      </div>

      <div className="grid gap-md">
        {isAdding && (
          <div className="v-glass-card p-md border-accent/50 bg-accent/5 animate-slide-down border-2">
            <div className="flex flex-col md:flex-row gap-md items-end">
              <div className="flex-1 space-y-xs">
                <label className="text-[10px] font-black uppercase text-accent tracking-widest">Identificador de la Categoría</label>
                <input 
                  type="text" 
                  className="input text-sm" 
                  placeholder="Ej: Fontanería, Iluminación..." 
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="flex gap-sm">
                <Button variant="secondary" onClick={() => setIsAdding(false)} className="rounded-xl px-4 py-2 text-xs font-bold uppercase">Cancelar</Button>
                <Button onClick={handleCreate} disabled={loading || !formData.nombre} className="bg-accent hover:bg-accent-hover text-white rounded-xl px-6 py-2 text-xs font-bold uppercase">
                  {loading ? 'Procesando...' : 'Confirmar Registro'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {types.map(type => (
            <div key={type.id} className={`v-glass-card p-md group transition-all hover:border-accent/30 ${editingId === type.id ? 'border-accent ring-1 ring-accent' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {editingId === type.id ? (
                    <input 
                      type="text" 
                      className="input input-sm mb-xs text-sm" 
                      defaultValue={type.nombre}
                      onBlur={(e) => handleUpdate(type.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(type.id, (e.target as HTMLInputElement).value);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <div className="flex flex-col">
                      <h3 className="font-black text-white flex items-center gap-xs tracking-tight">
                        {type.nombre}
                        {!type.hotel_id && (
                          <span className="px-2 py-0.5 bg-sky-500/10 text-sky-500 border border-sky-500/20 text-[8px] font-black uppercase rounded tracking-widest h-fit">Global</span>
                        )}
                      </h3>
                      <span className="text-[9px] text-muted uppercase font-black tracking-widest mt-1 opacity-60">{type.categoria}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setEditingId(type.id)}
                    className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-all"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    onClick={() => handleDelete(type)}
                    className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {types.length === 0 && !isAdding && (
            <div className="col-span-full py-xl text-center glass rounded-xl border-2 border-dashed border-white/5">
              <AlertCircle size={32} className="mx-auto text-muted mb-md opacity-20" />
              <p className="text-muted">No se han encontrado tipos de incidencias.</p>
              <Button variant="ghost" className="mt-md" onClick={() => setIsAdding(true)}>Crear el primero</Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Validar Borrado de Categoría"
        maxWidth="400px"
        footer={
          <div className="flex gap-md w-full">
            <Button variant="ghost" className="flex-1 border-white/5" onClick={() => setItemToDelete(null)}>Conservar</Button>
            <Button variant="danger" className="flex-1 bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20" onClick={confirmDelete} loading={loading}>Ejecutar Baja</Button>
          </div>
        }
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-md border border-rose-500/20">
            <Trash2 size={32} />
          </div>
          <h4 className="text-lg font-bold text-white mb-2 tracking-tight">¿Eliminar Categoría Técnica?</h4>
          <p className="text-sm text-muted/80 leading-relaxed uppercase tracking-widest text-[9px] font-black">
            Se perderá la clasificación para <span className="text-rose-400">{itemToDelete?.nombre}</span>.<br/> Las incidencias históricas mantendrán el registro pero el tipo quedará obsoleto.
          </p>
        </div>
      </Modal>
    </div>
  );
};
