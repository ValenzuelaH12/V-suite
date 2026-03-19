import React, { useState, useEffect } from 'react';
import { Users, UserPlus, RefreshCw, Trash2, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { configService } from '../../../services/configService';
import { Profile, UserRole } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { AVAILABLE_MODULES } from '../../../constants';

interface UserManagerProps {
  currentUserProfile: Profile | null;
  onMessage: (msg: { type: 'success' | 'error' | '', text: string }) => void;
  activeHotelId: string | null;
  users: Profile[];
  onRefresh: () => void;
}

export const UserManager: React.FC<UserManagerProps> = ({ 
  currentUserProfile, 
  onMessage,
  activeHotelId,
  users,
  onRefresh
}) => {
  const [loading, setLoading] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    nombre: '',
    rol: 'recepcion' as UserRole,
    hotel_id: activeHotelId || '00000000-0000-0000-0000-000000000000',
    permisos: ['dashboard', 'incidencias', 'chat'] as string[]
  });

  // Sync newUser.hotel_id when activeHotelId changes
  useEffect(() => {
    if (activeHotelId) {
      setNewUser(prev => ({ ...prev, hotel_id: activeHotelId }));
    }
  }, [activeHotelId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newUser.nombre.trim().length < 2) {
      onMessage({ type: 'error', text: 'El nombre debe tener al menos 2 caracteres.' });
      return;
    }
    if (newUser.password.length < 6) {
      onMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            nombre: newUser.nombre.trim(),
            rol: newUser.rol,
            hotel_id: newUser.hotel_id,
            permisos: newUser.permisos
          }
        }
      });

      if (authError) throw authError;
      
      onMessage({ type: 'success', text: 'Usuario creado exitosamente.' });
      setIsAddingUser(false);
      setNewUser({ 
        email: '', 
        password: '', 
        nombre: '', 
        rol: 'recepcion', 
        hotel_id: currentUserProfile?.hotel_id || '00000000-0000-0000-0000-000000000000', 
        permisos: ['dashboard', 'incidencias', 'chat'] 
      });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: error.message });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await configService.update('perfiles', editingUser.id, {
        nombre: editingUser.nombre,
        rol: editingUser.rol,
        hotel_id: editingUser.hotel_id,
        permisos: editingUser.permisos
      });
      
      onMessage({ type: 'success', text: 'Usuario actualizado correctamente.' });
      setIsEditingUser(false);
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: error.message });
    }
  };

  const handleDeleteUser = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre}?`)) return;
    
    try {
      await configService.delete('perfiles', id);
      onMessage({ type: 'success', text: 'Usuario eliminado correctamente.' });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="v-glass-card p-none overflow-hidden animate-fade-in">
      <div className="v-page-header border-b border-white/5 bg-white/5 py-4 px-6 mb-0">
        <div className="flex items-center gap-md">
          <div className="p-2 bg-accent/20 text-accent rounded-lg">
            <Users size={20} />
          </div>
          <h3 className="text-lg font-black text-white tracking-tight uppercase">Equipo y Usuarios</h3>
        </div>
        <Button size="sm" onClick={() => setIsAddingUser(true)} icon={UserPlus} className="bg-accent hover:bg-accent-hover text-white rounded-xl px-6 py-2 text-xs font-bold uppercase tracking-wider">
          Agregar
        </Button>
      </div>
      
      <div className="p-none">
        <div className="v-table-container">
          <table className="v-table">
            <thead>
              <tr>
                <th className="text-left font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">Nombre</th>
                <th className="text-left font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">Rol</th>
                <th className="text-left font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">Hotel</th>
                <th className="text-left font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">ID</th>
                <th className="text-right font-black uppercase text-[10px] tracking-widest text-muted py-4 px-6">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="group hover:bg-white/5 transition-all border-b border-white/5 last:border-0">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-sm">
                      <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-xs border border-accent/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                        {u.nombre?.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-white">{u.nombre}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-tighter">
                      {u.rol?.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-muted text-xs font-medium">
                    {u.hotel_id === '00000000-0000-0000-0000-000000000000' ? 'Sede Central' : u.hotel_id?.substring(0, 8)}
                  </td>
                  <td className="py-4 px-6 text-muted font-mono text-[10px] opacity-40">
                    {u.id.substring(0, 8)}...
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => { setEditingUser(u); setIsEditingUser(true); }}
                        className="p-2 rounded-lg bg-white/5 text-muted hover:text-accent hover:bg-accent/10 transition-all border border-white/5"
                        title="Configurar Perfil"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button 
                        className="p-2 rounded-lg bg-white/5 text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-white/5"
                        onClick={() => handleDeleteUser(u.id, u.nombre)}
                        title="Borrar Acceso"
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

      {/* Add User Modal */}
      <Modal 
        isOpen={isAddingUser} 
        onClose={() => setIsAddingUser(false)}
        title="Nuevo Miembro"
        maxWidth="600px"
        footer={
          <Button onClick={handleAddUser}>Registrar</Button>
        }
      >
        <div className="grid grid-cols-2 gap-sm mb-sm">
          <div className="input-group">
            <label className="input-label text-[10px] mb-xs">Nombre Completo</label>
            <input 
              type="text" 
              className="input py-1.5 text-xs" 
              value={newUser.nombre} 
              onChange={e => setNewUser({...newUser, nombre: e.target.value})} 
              required 
            />
          </div>
          <div className="input-group">
            <label className="input-label text-[10px] mb-xs">Email</label>
            <input 
              type="email" 
              className="input py-1.5 text-xs" 
              value={newUser.email} 
              onChange={e => setNewUser({...newUser, email: e.target.value})} 
              required 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-sm items-end mb-sm">
          <div className="input-group">
            <label className="input-label text-[10px] mb-xs">Contraseña</label>
            <input 
              type="password" 
              className="input py-1.5 text-xs" 
              value={newUser.password} 
              onChange={e => setNewUser({...newUser, password: e.target.value})} 
              required 
            />
          </div>
          <div className="input-group">
            <label className="input-label text-[10px] mb-xs">Rol del Usuario</label>
            <select 
              className="select py-1.5 text-xs" 
              value={newUser.rol} 
              onChange={e => setNewUser({...newUser, rol: e.target.value as UserRole})}
            >
              <option value="recepcion">Recepción</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="limpieza">Limpieza</option>
              <option value="gobernanta">Gobernanta</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>

        <div className="input-group mb-sm">
          <div className="flex justify-between items-center mb-xs">
            <label className="input-label text-[10px]">Permisos de Acceso</label>
            <span className="text-[9px] text-muted">Haz clic para activar/desactivar</span>
          </div>
          <div className="permissions-grid-compact">
            {AVAILABLE_MODULES.map(module => {
              const Icon = module.icon;
              const isActive = newUser.permisos?.includes(module.id);
              return (
                <div 
                  key={module.id} 
                  className={`perm-tag ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    const perms = isActive 
                      ? (newUser.permisos || []).filter(p => p !== module.id)
                      : [...(newUser.permisos || []), module.id];
                    setNewUser({...newUser, permisos: perms});
                  }}
                >
                  <Icon size={12} />
                  <span>{module.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal 
        isOpen={isEditingUser} 
        onClose={() => setIsEditingUser(false)}
        title="Editar Miembro"
        maxWidth="550px"
        footer={
          <Button onClick={handleUpdateUser}>Guardar Cambios</Button>
        }
      >
        {editingUser && (
          <div className="space-y-sm">
            <div className="grid grid-cols-2 gap-sm">
              <div className="input-group">
                <label className="input-label text-[10px] mb-xs">Nombre</label>
                <input 
                  type="text" 
                  className="input py-1.5 text-xs" 
                  value={editingUser.nombre} 
                  onChange={e => setEditingUser({...editingUser, nombre: e.target.value})} 
                  required 
                />
              </div>
              <div className="input-group">
                <label className="input-label text-[10px] mb-xs">Rol</label>
                <select 
                  className="select py-1.5 text-xs" 
                  value={editingUser.rol} 
                  onChange={e => setEditingUser({...editingUser, rol: e.target.value as UserRole})}
                >
                  <option value="recepcion">Recepción</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="limpieza">Limpieza</option>
                  <option value="gobernanta">Gobernanta</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            
            <div className="input-group">
              <label className="input-label text-[10px] mb-xs">Permisos de Acceso</label>
              <div className="permissions-grid-compact">
                {AVAILABLE_MODULES.map(module => {
                  const Icon = module.icon;
                  const isActive = editingUser.permisos?.includes(module.id);
                  return (
                    <div 
                      key={module.id} 
                      className={`perm-tag ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        const perms = isActive 
                          ? (editingUser.permisos || []).filter(p => p !== module.id)
                          : [...(editingUser.permisos || []), module.id];
                        setEditingUser({...editingUser, permisos: perms});
                      }}
                    >
                      <Icon size={12} />
                      <span>{module.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
