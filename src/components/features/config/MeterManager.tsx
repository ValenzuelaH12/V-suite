import React, { useState } from 'react';
import { Activity, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { configService } from '../../../services/configService';
import { Counter } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Badge } from '../../ui/Badge';
import { auditService } from '../../../services/auditService';

interface MeterManagerProps {
  counters: Counter[];
  onMessage: (msg: { type: 'success' | 'error', text: string }) => void;
  onRefresh: () => void;
  activeHotelId: string | null;
}

export const MeterManager: React.FC<MeterManagerProps> = ({ 
  counters, 
  onMessage,
  onRefresh,
  activeHotelId
}) => {
  const [isAddingMeter, setIsAddingMeter] = useState(false);
  const [isEditingMeter, setIsEditingMeter] = useState(false);
  const [editingMeter, setEditingMeter] = useState<Counter | null>(null);
  
  const [newMeter, setNewMeter] = useState({
    nombre: '',
    tipo: 'luz' as Counter['tipo'],
    hotel_id: activeHotelId || ''
  });

  // Sync hotel_id when activeHotelId changes
  React.useEffect(() => {
    if (activeHotelId) {
      setNewMeter(prev => ({ ...prev, hotel_id: activeHotelId }));
    }
  }, [activeHotelId]);

  const handleAddMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await configService.create('contadores', { ...newMeter, hotel_id: activeHotelId });
      
      await auditService.log({
        accion: 'CREACION',
        entidad: 'SUMINISTRO',
        descripcion: `Nuevo contador registrado: ${newMeter.nombre} (${newMeter.tipo})`,
        detalles: { id: data.id, ...newMeter },
        hotel_id: activeHotelId || undefined
      });

      onMessage({ type: 'success', text: 'Contador creado exitosamente.' });
      setIsAddingMeter(false);
      setNewMeter({ nombre: '', tipo: 'luz', hotel_id: activeHotelId || '' });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: `Error al crear contador: ${error.message}` });
    }
  };

  const handleUpdateMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeter) return;
    try {
      await configService.update('contadores', editingMeter.id, {
        nombre: editingMeter.nombre,
        tipo: editingMeter.tipo
      });

      await auditService.log({
        accion: 'ACTUALIZACION',
        entidad: 'SUMINISTRO',
        descripcion: `Actualizado contador: ${editingMeter.nombre}`,
        detalles: { id: editingMeter.id, nombre: editingMeter.nombre, tipo: editingMeter.tipo },
        hotel_id: activeHotelId || undefined
      });

      onMessage({ type: 'success', text: 'Contador actualizado.' });
      setIsEditingMeter(false);
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: `Error al actualizar: ${error.message}` });
    }
  };

  const [meterToDelete, setMeterToDelete] = useState<Counter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!meterToDelete) return;
    setIsDeleting(true);
    try {
      await configService.delete('contadores', meterToDelete.id);
      
      await auditService.log({
        accion: 'ELIMINACION',
        entidad: 'SUMINISTRO',
        descripcion: `Eliminado contador: ${meterToDelete.nombre}`,
        detalles: { id: meterToDelete.id, nombre: meterToDelete.nombre },
        hotel_id: activeHotelId || undefined
      });

      onMessage({ type: 'success', text: 'Contador eliminado.' });
      onRefresh();
      setMeterToDelete(null);
    } catch (error: any) {
      onMessage({ type: 'error', text: `Error al eliminar: ${error.message}` });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteMeter = async (meter: Counter) => {
    setMeterToDelete(meter);
  };

  return (
    <div className="v-glass-card p-none overflow-hidden animate-fade-in">
      <div className="v-page-header border-b border-white/5 bg-white/5 py-4 px-6 mb-0">
        <div className="flex items-center gap-md">
          <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
            <Activity size={20} />
          </div>
          <h3 className="text-lg font-black text-white tracking-tight uppercase">Lecturas y Suministros</h3>
        </div>
        <Button size="sm" onClick={() => setIsAddingMeter(true)} icon={Plus} className="bg-accent hover:bg-accent-hover text-white rounded-xl px-6 py-2 text-xs font-bold uppercase tracking-wider">
          Nuevo Contador
        </Button>
      </div>

      <div className="p-none">
        <div className="v-table-container">
          <table className="v-table">
            <thead>
              <tr>
                <th className="text-left font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">Identificador</th>
                <th className="text-left font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">Tipo</th>
                <th className="text-right font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">Acciones</th>
              </tr>
            </thead>
            <tbody>
               {counters.map(c => (
                <tr key={c.id} className="group hover:bg-white/5 transition-all border-b border-white/5 last:border-0">
                  <td className="py-4 px-6">
                    <span className="text-sm font-semibold text-white">{c.nombre}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                      c.tipo === 'luz' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                      c.tipo === 'agua' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' : 
                      'bg-white/5 text-muted border-white/10'
                    }`}>
                      {c.tipo?.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => { setEditingMeter(c); setIsEditingMeter(true); }}
                        className="p-2 rounded-lg bg-white/5 text-muted hover:text-accent hover:bg-accent/10 transition-all border border-white/5"
                        title="Modificar Contador"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button 
                        className="p-2 rounded-lg bg-white/5 text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-white/5"
                        onClick={() => handleDeleteMeter(c)}
                        title="Eliminar Registro"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Meter Modal */}
      <Modal isOpen={isAddingMeter} onClose={() => setIsAddingMeter(false)} title="Nuevo Contador">
        <form onSubmit={handleAddMeter}>
          <div className="input-group mb-md">
            <label className="input-label">Nombre del Contador</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Ej. General Luz, Agua Cocina..." 
              value={newMeter.nombre} 
              onChange={e => setNewMeter({ ...newMeter, nombre: e.target.value })} 
              required 
            />
          </div>
          <div className="input-group">
            <label className="input-label">Tipo de Suministro</label>
            <select 
              className="select" 
              value={newMeter.tipo} 
              onChange={e => setNewMeter({ ...newMeter, tipo: e.target.value as Counter['tipo'] })}
            >
              <option value="luz">Luz</option>
              <option value="agua">Agua</option>
              <option value="gas">Gas</option>
              <option value="otros">Otros</option>
            </select>
          </div>
          <div className="modal-footer">
            <Button type="submit">Crear Contador</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Meter Modal */}
      <Modal isOpen={isEditingMeter} onClose={() => setIsEditingMeter(false)} title="Editar Contador">
        {editingMeter && (
          <form onSubmit={handleUpdateMeter}>
            <div className="input-group mb-md">
              <label className="input-label">Nombre del Contador</label>
              <input 
                type="text" 
                className="input" 
                value={editingMeter.nombre} 
                onChange={e => setEditingMeter({ ...editingMeter, nombre: e.target.value })} 
                required 
              />
            </div>
            <div className="input-group">
              <label className="input-label">Tipo de Suministro</label>
              <select 
                className="select" 
                value={editingMeter.tipo} 
                onChange={e => setEditingMeter({ ...editingMeter, tipo: e.target.value as Counter['tipo'] })}
              >
                <option value="luz">Luz</option>
                <option value="agua">Agua</option>
                <option value="gas">Gas</option>
                <option value="otros">Otros</option>
              </select>
            </div>
            <div className="modal-footer">
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Deletion Confirmation Modal */}
      <Modal
        isOpen={!!meterToDelete}
        onClose={() => setMeterToDelete(null)}
        title="Confirmar Borrado de Contador"
        maxWidth="450px"
        footer={
          <div className="flex gap-md w-full">
            <Button variant="ghost" className="flex-1" onClick={() => setMeterToDelete(null)}>Conservar</Button>
            <Button variant="danger" className="flex-1 bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20" onClick={confirmDelete} loading={isDeleting}>Confirmar Baja</Button>
          </div>
        }
      >
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-md border border-rose-500/20">
            <Trash2 size={32} />
          </div>
          <h4 className="text-xl font-bold text-white mb-2">¿Eliminar Contador de Suministros?</h4>
          <p className="text-xs text-muted leading-relaxed uppercase tracking-widest font-black">
            Estás a punto de eliminar el contador: <span className="text-rose-400">{meterToDelete?.nombre}</span>.<br/>
            Se perderán todos los datos históricos de lectura vinculados a este terminal.
          </p>
        </div>
      </Modal>
    </div>
  );
};
