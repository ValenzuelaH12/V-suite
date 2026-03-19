import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { configService } from '../../../services/configService';
import { Asset, Zone } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Badge } from '../../ui/Badge';

interface AssetManagerProps {
  zones: Zone[];
  onMessage: (msg: { type: 'success' | 'error', text: string }) => void;
  activeHotelId: string | null;
  assets: Asset[];
  onRefresh: () => void;
}

export const AssetManager: React.FC<AssetManagerProps> = ({ 
  zones,
  onMessage,
  activeHotelId,
  assets,
  onRefresh
}) => {
  const [loading, setLoading] = useState(false);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  
  const [newAsset, setNewAsset] = useState({
    nombre: '',
    tipo: 'maquinaria',
    zona_id: '',
    manual_url: '',
    especificaciones: {},
    hotel_id: activeHotelId || ''
  });

  // Sync hotel_id when activeHotelId changes
  useEffect(() => {
    if (activeHotelId) {
      setNewAsset(prev => ({ ...prev, hotel_id: activeHotelId }));
    }
  }, [activeHotelId]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.zona_id) {
      onMessage({ type: 'error', text: 'Debes seleccionar una zona para el activo.' });
      return;
    }

    try {
      await configService.create('activos', { ...newAsset, hotel_id: activeHotelId });
      onMessage({ type: 'success', text: 'Activo registrado correctamente.' });
      setIsAddingAsset(false);
      setNewAsset({ nombre: '', tipo: 'maquinaria', zona_id: '', manual_url: '', especificaciones: {}, hotel_id: activeHotelId || '' });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: error.message });
    }
  };

  const handleDeleteAsset = async (id: string, nombre: string) => {
    if (!confirm(`¿Confirmar borrado de ${nombre}?`)) return;
    
    try {
      await configService.delete('activos', id);
      onMessage({ type: 'success', text: 'Activo eliminado correctamente.' });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="v-glass-card p-none overflow-hidden animate-fade-in">
      <div className="v-page-header border-b border-white/5 bg-white/5 py-4 px-6 mb-0">
        <div className="flex items-center gap-md">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Package size={20} />
          </div>
          <h3 className="text-lg font-black text-white tracking-tight uppercase">Activos y Equipos</h3>
        </div>
        <Button size="sm" onClick={() => setIsAddingAsset(true)} icon={Plus} className="bg-accent hover:bg-accent-hover text-white rounded-xl px-6 py-2 text-xs font-bold uppercase tracking-wider">
          Registrar Activo
        </Button>
      </div>

      <div className="p-none">
        <div className="v-table-container">
          <table className="v-table">
            <thead>
              <tr>
                <th className="text-left font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">Activo</th>
                <th className="text-left font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">Zona</th>
                <th className="text-left font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">Tipo</th>
                <th className="text-left font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">Estado</th>
                <th className="text-center font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">QR Portal</th>
                <th className="text-right font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">Acciones</th>
              </tr>
            </thead>            <tbody>
              {assets.map(a => {
                const portalUrl = `${window.location.origin}/asset/${a.id}`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portalUrl)}`;
                
                return (
                  <tr key={a.id} className="group hover:bg-white/5 transition-all border-b border-white/5 last:border-0">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-sm">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20 shadow-inner">
                          {a.nombre[0]}
                        </div>
                        <span className="font-bold text-white tracking-tight">{a.nombre}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-xs text-muted font-medium text-xs">
                        <MapPin size={12} className="text-accent/60" />
                        {zones.find(z => z.id === a.zona_id)?.nombre || 'General'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-muted rounded text-[10px] font-bold uppercase tracking-tighter">
                        {a.tipo?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Operativo</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center">
                        <a href={qrUrl} target="_blank" rel="noreferrer" className="inline-block p-1.5 bg-white rounded-xl shadow-lg hover:scale-110 transition-transform">
                          <img src={qrUrl} alt={`QR ${a.nombre}`} width="36" height="36" className="rounded-lg" />
                        </a>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => window.open(portalUrl, '_blank')}
                          className="p-2 rounded-lg bg-white/5 text-muted hover:text-accent hover:bg-accent/10 transition-all border border-white/5"
                          title="Explorar Activo"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button 
                          className="p-2 rounded-lg bg-white/5 text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-white/5"
                          onClick={() => handleDeleteAsset(a.id, a.nombre)}
                          title="Eliminar Equipo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      <Modal
        isOpen={isAddingAsset}
        onClose={() => setIsAddingAsset(false)}
        title="Registrar Nuevo Activo"
        footer={<Button onClick={handleAddAsset}>Registrar Activo</Button>}
      >
        <div className="input-group mb-md">
          <label className="input-label">Nombre del Activo / Equipo</label>
          <input 
            type="text" 
            className="input" 
            placeholder="Ej. Caldera Central A, Aire Planta 1..." 
            value={newAsset.nombre} 
            onChange={e => setNewAsset({...newAsset, nombre: e.target.value})} 
            required 
          />
        </div>
        <div className="grid grid-cols-2 gap-md mb-md">
          <div className="input-group">
            <label className="input-label">Tipo de Activo</label>
            <select 
              className="select" 
              value={newAsset.tipo} 
              onChange={e => setNewAsset({...newAsset, tipo: e.target.value})}
            >
              <option value="maquinaria">Maquinaria</option>
              <option value="climatizacion">Climatización</option>
              <option value="fontaneria">Fontanería</option>
              <option value="electricidad">Electricidad</option>
              <option value="elevacion">Elevación</option>
              <option value="otros">Otros</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Ubicación (Zona)</label>
            <select 
              className="select" 
              value={newAsset.zona_id} 
              onChange={e => setNewAsset({...newAsset, zona_id: e.target.value})}
              required
            >
              <option value="">Seleccionar Zona...</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">URL del Manual Técnico (PDF/Web)</label>
          <input 
            type="url" 
            className="input" 
            placeholder="https://ejemplo.com/manual.pdf" 
            value={newAsset.manual_url} 
            onChange={e => setNewAsset({...newAsset, manual_url: e.target.value})} 
          />
        </div>
      </Modal>
    </div>
  );
};
