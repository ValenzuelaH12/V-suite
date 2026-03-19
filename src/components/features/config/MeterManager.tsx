import React, { useState } from 'react';
import { Activity, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { configService } from '../../../services/configService';
import { Counter } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Badge } from '../../ui/Badge';

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
      await configService.create('contadores', { ...newMeter, hotel_id: activeHotelId });
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
      onMessage({ type: 'success', text: 'Contador actualizado.' });
      setIsEditingMeter(false);
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: `Error al actualizar: ${error.message}` });
    }
  };

  const handleDeleteMeter = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el contador ${name}?`)) return;
    try {
      await configService.delete('contadores', id);
      onMessage({ type: 'success', text: 'Contador eliminado.' });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: `Error al eliminar: ${error.message}` });
    }
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
                        onClick={() => handleDeleteMeter(c.id, c.nombre)}
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
    </div>
  );
};
