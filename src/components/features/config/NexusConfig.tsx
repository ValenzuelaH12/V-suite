import React, { useState, useEffect } from 'react';
import { Smartphone, Plus, DoorOpen, MapPin, QrCode, RefreshCw, BookOpen } from 'lucide-react';
import { Room, Zone } from '../../../types';
import { Card } from '../../ui/Card';

interface NexusConfigProps {
  rooms: Room[];
  zones: Zone[];
  activeHotelId?: string | null;
}

export const NexusConfig: React.FC<NexusConfigProps> = ({ 
  rooms, 
  zones,
  activeHotelId
}) => {
  const [activeFloor, setActiveFloor] = useState('1');
  const [selectedNexusZona, setSelectedNexusZona] = useState('all');
  const [nexusSearchQuery, setNexusSearchQuery] = useState('');

  // Heuristic floor detection
  const floors = Array.from(new Set(rooms.map(h => {
    const match = h.nombre.match(/^\d/);
    return match ? match[0] : 'Otros';
  }))).sort();

  useEffect(() => {
    if (floors.length > 0 && !floors.includes(activeFloor)) {
      setActiveFloor(floors[0]);
    }
  }, [rooms]);

  const filteredRooms = rooms.filter(h => {
    const floorMatch = h.nombre.match(/^\d/);
    const roomFloor = floorMatch ? floorMatch[0] : 'Otros';
    const matchesFloor = roomFloor === activeFloor;
    const matchesZona = selectedNexusZona === 'all' || h.zona_id === selectedNexusZona;
    const matchesSearch = h.nombre.toLowerCase().includes(nexusSearchQuery.toLowerCase());
    return matchesFloor && matchesZona && matchesSearch;
  });

  return (
    <div className="nexus-container animate-fade-in">
      <Card className="nexus-header-card mb-lg overflow-hidden relative p-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
        <div className="panel-header border-b p-xl relative z-10">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-white">V-Nexus: Portal Digital</h3>
                <p className="text-sm text-muted">Gestión de QRs por planta y zona</p>
              </div>
            </div>
            <div className="flex gap-md">
              <div className="nexus-search relative">
                <input 
                  type="text" 
                  placeholder="Buscar habitación..." 
                  className="nexus-search-input"
                  value={nexusSearchQuery}
                  onChange={e => setNexusSearchQuery(e.target.value)}
                />
              </div>
              <div className="stat-pill">
                <DoorOpen size={14} className="text-indigo-400" />
                <span className="font-bold">{rooms.length}</span>
                <span className="text-xs text-muted">Habitaciones</span>
              </div>
            </div>
          </div>
        </div>

        <div className="floor-nav-bar p-md bg-black/20 relative z-10 flex items-center gap-md border-b border-white/5">
          <span className="text-[10px] font-black uppercase text-muted tracking-widest pl-md">Plantas:</span>
          <div className="flex gap-sm overflow-x-auto no-scrollbar py-sm">
            {floors.map(floor => (
              <button 
                key={floor}
                onClick={() => { setActiveFloor(floor); setSelectedNexusZona('all'); }}
                className={`floor-btn ${activeFloor === floor ? 'active' : ''}`}
              >
                Planta {floor}
              </button>
            ))}
          </div>
        </div>

        <div className="zone-filter-bar p-md px-xl flex items-center gap-lg relative z-10 bg-black/10">
          <div className="flex items-center gap-2 text-xs text-indigo-300 font-bold">
            <MapPin size={12} />
            <span>Filtrar Zona:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => setSelectedNexusZona('all')}
              className={`filter-chip ${selectedNexusZona === 'all' ? 'active' : ''}`}
            >
              Todas
            </button>
            {zones.filter(z => 
              rooms.some(h => {
                const floorMatch = h.nombre.match(/^\d/);
                const roomFloor = floorMatch ? floorMatch[0] : 'Otros';
                return roomFloor === activeFloor && h.zona_id === z.id;
              })
            ).map(z => (
              <button 
                key={z.id}
                onClick={() => setSelectedNexusZona(z.id)}
                className={`filter-chip ${selectedNexusZona === z.id ? 'active' : ''}`}
              >
                {z.nombre}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredRooms.map((h: any) => {
          const zonaName = zones.find((z: any) => z.id === h.zona_id)?.nombre || 'General';
          const portalUrl = `${window.location.origin}/guest/${activeHotelId || 'default'}/${h.nombre}`;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portalUrl)}`;
          
          return (
            <div key={h.id} className="nexus-room-card glass-card hover-glow">
              <div className="room-card-header">
                <div className="room-info">
                  <span className="room-label">Huésped</span>
                  <h4 className="room-number">Hab. {h.nombre}</h4>
                  <span className="room-zone-badge">{zonaName}</span>
                </div>
                <div className="room-qr-mini" onClick={() => window.open(qrUrl, '_blank')}>
                  <img src={qrUrl} alt={`QR ${h.nombre}`} />
                  <div className="qr-overlay">
                    <QrCode size={16} />
                  </div>
                </div>
              </div>
              <div className="room-card-actions">
                <button 
                  className="nexus-btn-secondary"
                  onClick={() => { navigator.clipboard.writeText(portalUrl); alert('URL Copiada'); }}
                >
                  <RefreshCw size={14} /> <span>URL</span>
                </button>
                <a 
                  href={qrUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="nexus-btn-primary"
                >
                  <BookOpen size={14} /> <span>PDF QR</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .nexus-header-card { border-radius: 24px; }
        .floor-btn { 
          padding: 8px 16px; border-radius: 12px; background: rgba(255,255,255,0.03); 
          border: 1px solid rgba(255,255,255,0.08); color: var(--color-text-muted); 
          font-weight: 700; font-size: 0.75rem; transition: all 0.2s;
        }
        .floor-btn.active { background: var(--color-accent); color: white; border-color: var(--color-accent); }
        .filter-chip {
          padding: 4px 12px; border-radius: 16px; background: transparent; border: 1px solid rgba(255,255,255,0.1);
          color: var(--color-text-muted); font-size: 0.7rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .filter-chip.active { background: rgba(99,102,241,0.1); border-color: var(--color-accent); color: var(--color-accent); }
        .stat-pill { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: rgba(255,255,255,0.03); border-radius: 12px; }
        .nexus-room-card { padding: 20px !important; border-radius: 20px; display: flex; flex-direction: column; gap: 16px; }
        .room-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--color-accent); }
        .room-number { font-size: 1.25rem; font-weight: 900; color: white; margin: 2px 0; }
        .room-zone-badge { font-size: 0.65rem; color: var(--color-text-muted); background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 6px; }
        .room-qr-mini { width: 64px; height: 64px; background: white; border-radius: 12px; padding: 4px; position: relative; }
        .room-qr-mini img { width: 100%; height: 100%; border-radius: 8px; }
        .qr-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.2s; border-radius: 12px; color: white; }
        .room-qr-mini:hover .qr-overlay { opacity: 1; }
        .room-card-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .nexus-btn-primary, .nexus-btn-secondary { height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.7rem; font-weight: 700; border: none; cursor: pointer; }
        .nexus-btn-primary { background: var(--color-accent); color: white; }
        .nexus-btn-secondary { background: rgba(255,255,255,0.05); color: var(--color-text-muted); border: 1px solid rgba(255,255,255,0.1); }
        .nexus-search-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 8px 14px; border-radius: 12px; font-size: 0.75rem; color: white; width: 180px; }
      `}</style>
    </div>
  );
};
