import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Power, Activity, Users, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hotelService } from '../../../services/hotelService';
import { Hotel } from '../../../types';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { auditService } from '../../../services/auditService';

export const HotelManager: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [hotelToDelete, setHotelToDelete] = useState<Hotel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
        await auditService.log({
          accion: 'ACTUALIZACION',
          entidad: 'HOTEL',
          descripcion: `Actualizada información del hotel: ${formData.nombre}`,
          detalles: { hotelId: editingHotel.id, ...formData }
        });
      } else {
        const newHotel = await hotelService.create(formData);
        await auditService.log({
          accion: 'CREACION',
          entidad: 'HOTEL',
          descripcion: `Registrado nuevo hotel en la red: ${formData.nombre}`,
          detalles: { hotelId: newHotel.id, ...formData }
        });
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

  const handleDelete = async () => {
    if (!hotelToDelete) return;
    setIsDeleting(true);
    try {
      await hotelService.delete(hotelToDelete.id);
      
      await auditService.log({
        accion: 'ELIMINACION',
        entidad: 'HOTEL',
        descripcion: `Eliminado hotel de la red: ${hotelToDelete.nombre}`,
        detalles: { hotelId: hotelToDelete.id, nombre: hotelToDelete.nombre }
      });

      setHotelToDelete(null);
      await fetchHotels();
      await refreshHotels();
    } catch (error) {
      console.error('Error deleting hotel:', error);
    } finally {
      setIsDeleting(false);
    }
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
                  <button onClick={() => handleEdit(hotel)} className="p-1.5 hover:bg-white/10 rounded-md text-muted hover:text-white transition-colors" title="Editar Hotel">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => toggleStatus(hotel)} className={`p-1.5 hover:bg-white/10 rounded-md transition-colors ${hotel.estado === 'activo' ? 'text-success hover:text-success' : 'text-danger hover:text-danger'}`} title="Interruptor Operativo">
                    <Power size={14} />
                  </button>
                  {hotel.id !== '00000000-0000-0000-0000-000000000000' && (
                    <button onClick={() => setHotelToDelete(hotel)} className="p-1.5 hover:bg-rose-500/10 rounded-md text-muted hover:text-rose-400 transition-colors" title="Eliminar de la red">
                      <Trash2 size={14} />
                    </button>
                  )}
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

      {/* Edit/Create Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingHotel ? 'Editar Hotel' : 'Registrar Nuevo Hotel'}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit} className="space-y-lg">
          <div className="input-group">
            <label className="input-label">Nombre del Hotel</label>
            <input 
              type="text" 
              className="input text-white" 
              value={formData.nombre}
              onChange={e => setFormData({...formData, nombre: e.target.value})}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Dirección</label>
            <input 
              type="text" 
              className="input text-white" 
              value={formData.direccion}
              onChange={e => setFormData({...formData, direccion: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div className="input-group">
              <label className="input-label">Teléfono</label>
              <input 
                type="tel" 
                className="input text-white" 
                value={formData.telefono}
                onChange={e => setFormData({...formData, telefono: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Estado</label>
              <select 
                className="select text-white bg-black/40" 
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
              className="input text-white" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-md pt-xl border-t border-white/5">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" className="bg-accent shadow-lg shadow-accent/20">
              {editingHotel ? 'Guardar Cambios' : 'Crear Hotel'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!hotelToDelete}
        onClose={() => setHotelToDelete(null)}
        title="Validar Baja de Unidad Operativa"
        maxWidth="400px"
        footer={
          <div className="flex gap-md w-full">
            <Button variant="ghost" className="flex-1" onClick={() => setHotelToDelete(null)}>Conservar</Button>
            <Button variant="danger" className="flex-1 bg-rose-500 hover:bg-rose-600" onClick={handleDelete} loading={isDeleting}>Eliminar de la Red</Button>
          </div>
        }
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-md border border-rose-500/20">
            <Trash2 size={32} />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">Eliminar {hotelToDelete?.nombre}</h4>
          <p className="text-sm text-muted">
            Estás a punto de eliminar este hotel de la red V-Suite. Esta acción borrará el acceso principal y ya no aparecerá en el selector de hoteles.
          </p>
          <div className="mt-md p-md bg-rose-500/5 border border-rose-500/20 rounded-xl">
             <p className="text-[10px] font-black uppercase text-rose-400">⚠️ Advertencia Crítica</p>
             <p className="text-[10px] text-rose-300 opacity-60">Se requiere limpiar el inventario y equipos del hotel manualmente antes de dar de baja la unidad.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
