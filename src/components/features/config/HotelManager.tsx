import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Edit2, Power, Activity, Users, AlertTriangle, Check, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hotelService } from '../../../services/hotelService';
import { Hotel } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

export const HotelManager: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    estado: 'activo' as 'activo' | 'inactivo'
  });

  const [stats, setStats] = useState<Record<string, { incidents: number, inventory: number, users: number }>>({});

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const data = await hotelService.getAll();
      setHotels(data);
      
      // Fetch stats for each hotel
      const statsMap: any = {};
      await Promise.all(data.map(async (h) => {
        const s = await hotelService.getStats(h.id);
        statsMap[h.id] = s;
      }));
      setStats(statsMap);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const { refreshHotels } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHotel) {
        await hotelService.update(editingHotel.id, formData);
      } else {
        await hotelService.create(formData);
      }
      setIsModalOpen(false);
      setEditingHotel(null);
      setFormData({ nombre: '', direccion: '', telefono: '', email: '', estado: 'activo' });
      await fetchHotels();
      await refreshHotels();
    } catch (error) {
      console.error('Error saving hotel:', error);
    }
  };

  const handleEdit = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setFormData({
      nombre: hotel.nombre,
      direccion: hotel.direccion || '',
      telefono: hotel.telefono || '',
      email: hotel.email || '',
      estado: hotel.estado
    });
    setIsModalOpen(true);
  };

  const toggleStatus = async (hotel: Hotel) => {
    const newStatus = hotel.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await hotelService.update(hotel.id, { estado: newStatus });
      fetchHotels();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading && hotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-xl">
        <Activity size={40} className="animate-spin text-accent mb-md" />
        <p className="text-muted">Cargando gestión de hoteles...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-xl">
      <div className="v-page-header v-glass-card py-4 px-6 mb-0">
        <div className="flex items-center gap-md">
          <div className="p-2 bg-accent/20 text-accent rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase">Gestión de Hoteles</h2>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{hotels.length} unidades operativas en la red</p>
          </div>
        </div>
        <Button 
          onClick={() => {
            setEditingHotel(null);
            setFormData({ nombre: '', direccion: '', telefono: '', email: '', estado: 'activo' });
            setIsModalOpen(true);
          }}
          className="bg-accent hover:bg-accent-hover text-white rounded-xl px-6 py-2 text-xs font-bold uppercase tracking-wider"
          icon={Plus}
        >
          <span>Añadir Hotel</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-xl">
        {hotels.map(hotel => (
          <div key={hotel.id} className="v-glass-card relative group overflow-hidden border-white/5 hover:border-accent/30 transition-all duration-300 p-none">
            <div className={`absolute top-0 left-0 w-1 h-full ${hotel.estado === 'activo' ? 'bg-success' : 'bg-danger'}`} />
            
            <div className="p-lg space-y-md">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-sm">
                  <div className={`p-2 rounded-lg ${hotel.id === '00000000-0000-0000-0000-000000000000' ? 'bg-accent/10 text-accent' : 'bg-white/5 text-muted'}`}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-none p-none inline">{hotel.nombre}</h3>
                    {hotel.id === '00000000-0000-0000-0000-000000000000' && (
                      <span className="badge badge-accent text-[8px] ml-xs py-0 h-fit uppercase">Principal</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(hotel)} className="p-1.5 hover:bg-white/10 rounded-md text-muted hover:text-white transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => toggleStatus(hotel)} className={`p-1.5 hover:bg-white/10 rounded-md transition-colors ${hotel.estado === 'activo' ? 'text-success hover:text-success' : 'text-danger hover:text-danger'}`}>
                    <Power size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-xs">
                <p className="text-xs text-muted flex items-center gap-xs">
                   <Users size={12} /> {stats[hotel.id]?.users || 0} Usuarios registrados
                </p>
                <p className="text-xs text-muted flex items-center gap-xs">
                   <AlertTriangle size={12} /> {stats[hotel.id]?.incidents || 0} Incidencias reportadas
                </p>
              </div>

              <div className="pt-md border-t border-white/5 grid grid-cols-2 gap-sm">
                <div className="text-center">
                  <div className="text-[10px] uppercase text-muted font-bold tracking-tighter">ID Sistema</div>
                  <div className="text-[10px] font-mono text-accent truncate">{hotel.id.split('-')[0]}...</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase text-muted font-bold tracking-tighter">Estado</div>
                  <div className={`text-[10px] font-bold uppercase ${hotel.estado === 'activo' ? 'text-success' : 'text-danger'}`}>
                    {hotel.estado}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <Card className="modal-content max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-xl">
              <h2 className="text-lg font-bold">{editingHotel ? 'Editar Hotel' : 'Registrar Nuevo Hotel'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-lg">
              <div className="input-group">
                <label className="input-label">Nombre del Hotel</label>
                <input 
                  type="text" 
                  className="input" 
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Dirección</label>
                <input 
                  type="text" 
                  className="input" 
                  value={formData.direccion}
                  onChange={e => setFormData({...formData, direccion: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div className="input-group">
                  <label className="input-label">Teléfono</label>
                  <input 
                    type="tel" 
                    className="input" 
                    value={formData.telefono}
                    onChange={e => setFormData({...formData, telefono: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Estado</label>
                  <select 
                    className="select" 
                    value={formData.estado}
                    onChange={e => setFormData({...formData, estado: e.target.value as 'activo' | 'inactivo'})}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Email de Administración</label>
                <input 
                  type="email" 
                  className="input" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-md pt-xl border-t border-white/5">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit">
                  {editingHotel ? 'Guardar Cambios' : 'Crear Hotel'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
