import React, { useState, useEffect } from 'react';
import { Layers, MapPin, Calendar, DoorOpen, Plus, Trash2, Hash, X, Navigation } from 'lucide-react';
import { configService } from '../../../services/configService';
import { Zone, Room } from '../../../types';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';

interface ZoneManagerProps {
  zones: Zone[];
  rooms: Room[];
  onMessage: (msg: { type: 'success' | 'error', text: string }) => void;
  onRefresh: () => void;
  activeHotelId: string | null;
}

export const ZoneManager: React.FC<ZoneManagerProps> = ({ 
  zones, 
  rooms, 
  onMessage,
  onRefresh,
  activeHotelId
}) => {
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newZone, setNewZone] = useState({ nombre: '', hotel_id: activeHotelId || '' });
  const [newRoom, setNewRoom] = useState({ nombre: '', zona_id: '', hotel_id: activeHotelId || '' });
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  // Sync hotel_id when activeHotelId changes
  useEffect(() => {
    if (activeHotelId) {
      setNewZone(prev => ({ ...prev, hotel_id: activeHotelId }));
      setNewRoom(prev => ({ ...prev, hotel_id: activeHotelId }));
    }
  }, [activeHotelId]);

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configService.create('zonas', { ...newZone, hotel_id: activeHotelId });
      onMessage({ type: 'success', text: 'Zona creada exitosamente.' });
      setIsAddingZone(false);
      setNewZone({ nombre: '', hotel_id: activeHotelId || '' });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: `Error al crear zona: ${error.message}` });
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configService.create('habitaciones', { ...newRoom, hotel_id: activeHotelId });
      onMessage({ type: 'success', text: 'Habitación creada exitosamente.' });
      setIsAddingRoom(false);
      setNewRoom({ nombre: '', zona_id: '', hotel_id: activeHotelId || '' });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: `Error al crear habitación: ${error.message}` });
    }
  };

  const handleDelete = async (table: string, id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar ${name}?`)) return;
    try {
      await configService.delete(table, id);
      onMessage({ type: 'success', text: `${name} eliminado correctamente.` });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: `Error al eliminar: ${error.message}` });
    }
  };

  const gradients = [
    'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 100%)',
    'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,148,162,0.08) 100%)',
    'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(239,68,68,0.08) 100%)',
    'linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(168,85,247,0.08) 100%)',
    'linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(99,102,241,0.08) 100%)'
  ];
  
  const accentColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9'];

  return (
    <div className="zonas-redesign animate-fade-in">
      {/* Header Premium */}
      <div className="zonas-header glass-card">
        <div className="zonas-header-left">
          <div className="zonas-icon-wrap">
            <Layers size={24} />
          </div>
          <div>
            <h3 className="zonas-title">Zonas del Hotel</h3>
            <p className="zonas-subtitle">{zones.length} zonas · {rooms.length} habitaciones en total</p>
          </div>
        </div>
        <Button onClick={() => setIsAddingZone(true)} icon={Plus}>
          Nueva Zona
        </Button>
      </div>

      {/* Zona Cards Grid */}
      <div className="zonas-grid">
        {zones.map((z, idx) => {
          const zonHabs = rooms.filter(h => h.zona_id === z.id);
          const accent = accentColors[idx % accentColors.length];
          const gradient = gradients[idx % gradients.length];

          return (
            <div 
              key={z.id} 
              className="zona-card glass-card" 
              style={{ background: gradient, '--zona-accent': accent } as any}
            >
              <div className="zona-card-header">
                <div className="zona-card-identity">
                  <div className="zona-avatar" style={{ background: `${accent}20`, color: accent }}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="zona-card-name">{z.nombre}</h4>
                    <span className="zona-card-date">
                      <Hash size={10} /> 
                      Sistema V-Suite
                    </span>
                  </div>
                </div>
                <div className="zona-card-actions">
                  <div className="zona-counter" style={{ background: `${accent}15`, color: accent }}>
                    <DoorOpen size={14} />
                    <span>{zonHabs.length}</span>
                  </div>
                  <button onClick={() => handleDelete('zonas', z.id, z.nombre)} className="zona-delete-btn">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="zona-habs-section">
                <div className="zona-habs-label">
                  <Navigation size={10} />
                  HABITACIONES / DEPENDENCIAS
                </div>
                <div className="zona-habs-grid">
                  {zonHabs.map(h => (
                    <div key={h.id} className="zona-hab-chip group">
                      <span>{h.nombre}</span>
                      <button 
                        className="zona-hab-delete opacity-0 group-hover:opacity-100"
                        onClick={() => handleDelete('habitaciones', h.id, `Habitación ${h.nombre}`)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button className="zona-hab-add" style={{ borderColor: `${accent}40`, color: accent }} onClick={() => { setSelectedZone(z); setNewRoom({...newRoom, zona_id: z.id}); setIsAddingRoom(true); }}>
                    <Plus size={14} /> <span>Añadir</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <Modal isOpen={isAddingZone} onClose={() => setIsAddingZone(false)} title="Nueva Zona de Trabajo">
        <form onSubmit={handleAddZone}>
          <div className="input-group">
            <label className="input-label">Nombre de la Zona</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Ej. Planta 1, Cocinas, Exteriores..." 
              value={newZone.nombre} 
              onChange={e => setNewZone({ nombre: e.target.value, hotel_id: activeHotelId || '' })} 
              required 
            />
          </div>
          <div className="modal-footer">
            <Button type="submit">Crear Zona</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAddingRoom} onClose={() => setIsAddingRoom(false)} title={`Añadir a ${selectedZone?.nombre}`}>
        <form onSubmit={handleAddRoom}>
          <div className="input-group">
            <label className="input-label">Nombre de Habitación / Sitio</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Ej. 101, Recepción, Pasillo A..." 
              value={newRoom.nombre} 
              onChange={e => setNewRoom({ ...newRoom, nombre: e.target.value })} 
              required 
            />
          </div>
          <div className="modal-footer">
            <Button type="submit">Añadir</Button>
          </div>
        </form>
      </Modal>

      <style>{`
        .zonas-redesign { display: flex; flex-direction: column; gap: var(--spacing-lg); }
        .zonas-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; }
        .zonas-header-left { display: flex; align-items: center; gap: 1rem; }
        .zonas-icon-wrap {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, var(--color-accent), #a855f7);
          display: flex; align-items: center; justify-content: center;
          color: white; box-shadow: 0 4px 15px rgba(99,102,241,0.35);
        }
        .zonas-title { font-size: 1.15rem; font-weight: 700; margin: 0; }
        .zonas-subtitle { font-size: 0.75rem; color: var(--color-text-muted); }
        .zonas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: var(--spacing-lg); }
        .zona-card { padding: 0 !important; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }
        .zona-card-header { display: flex; justify-content: space-between; align-items: center; padding: 1.15rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .zona-card-identity { display: flex; align-items: center; gap: 0.75rem; }
        .zona-avatar { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .zona-card-name { font-weight: 700; font-size: 1rem; margin: 0; }
        .zona-card-date { display: flex; align-items: center; gap: 4px; font-size: 0.65rem; color: var(--color-text-muted); }
        .zona-card-actions { display: flex; align-items: center; gap: 0.5rem; }
        .zona-counter { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
        .zona-delete-btn { width: 30px; height: 30px; border-radius: 8px; background: rgba(239,68,68,0.08); color: rgba(239,68,68,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .zona-delete-btn:hover { background: rgba(239,68,68,0.2); color: #ef4444; }
        .zona-habs-section { padding: 1rem 1.25rem 1.25rem; }
        .zona-habs-label { display: flex; align-items: center; gap: 5px; font-size: 0.65rem; font-weight: 700; color: var(--color-text-muted); margin-bottom: 0.65rem; }
        .zona-habs-grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .zona-hab-chip { display: flex; align-items: center; gap: 5px; padding: 5px 8px 5px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; font-size: 0.78rem; font-weight: 500; }
        .zona-hab-delete { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(255,255,255,0.25); }
        .zona-hab-delete:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
        .zona-hab-add { display: flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 8px; border: 1.5px dashed; background: transparent; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
      `}</style>
    </div>
  );
};
