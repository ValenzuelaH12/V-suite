import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  RefreshCw, 
  Trash2, 
  X, 
  Mail, 
  Lock, 
  User, 
  Shield, 
  ChevronRight,
  Info,
  CheckCircle2,
  Key,
  Building2,
  Wrench,
  Brush,
  UserCheck
} from 'lucide-react';
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
        <div className="space-y-6">
          {/* IDENTIDAD: BLOQUES DE ENTRADA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="zona-style-input-card">
              <div className="card-header-mini">
                <User size={12} className="text-accent" />
                <span>Nombre Completo</span>
              </div>
              <input 
                type="text" 
                className="zona-input-field" 
                placeholder="Nombre del miembro..."
                value={newUser.nombre} 
                onChange={e => setNewUser({...newUser, nombre: e.target.value})} 
                required 
              />
            </div>
            <div className="zona-style-input-card">
              <div className="card-header-mini">
                <Mail size={12} className="text-accent" />
                <span>Correo Corporativo</span>
              </div>
              <input 
                type="email" 
                className="zona-input-field" 
                placeholder="email@hosteleria.com"
                value={newUser.email} 
                onChange={e => setNewUser({...newUser, email: e.target.value})} 
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="zona-style-input-card">
              <div className="card-header-mini">
                <Key size={12} className="text-accent" />
                <span>Credencial de Acceso</span>
              </div>
              <input 
                type="password" 
                className="zona-input-field" 
                placeholder="Introducir clave de seguridad..."
                value={newUser.password} 
                onChange={e => setNewUser({...newUser, password: e.target.value})} 
                required 
              />
            </div>
          </div>

          {/* ROL: SELECTOR DE TARJETAS CUADRADAS */}
          <div className="section-divider">
            <span className="divider-text">Asignar Rol Jerárquico</span>
          </div>

          <div className="flex flex-wrap gap-2 justify-start">
            {[
              { id: 'recepcion', name: 'Recepción', icon: Building2, color: '#6366f1' },
              { id: 'mantenimiento', name: 'Técnico', icon: Wrench, color: '#f59e0b' },
              { id: 'limpieza', name: 'Limpieza', icon: Brush, color: '#10b981' },
              { id: 'gobernanta', name: 'Gobernanta', icon: UserCheck, color: '#ec4899' },
              { id: 'admin', name: 'Admin', icon: Shield, color: '#ef4444' }
            ].map(role => (
              <button
                key={role.id}
                type="button"
                className={`zona-role-card flex-1 min-w-[100px] ${newUser.rol === role.id ? 'active' : ''}`}
                style={{ '--role-color': role.color } as React.CSSProperties}
                onClick={() => setNewUser({...newUser, rol: role.id as UserRole})}
              >
                <div className="role-icon">
                  <role.icon size={18} />
                </div>
                <span className="role-name">{role.name}</span>
                {newUser.rol === role.id && <div className="role-check"><CheckCircle2 size={10} /></div>}
              </button>
            ))}
          </div>

          {/* PERMISOS: REJILLA DE BLOQUES */}
          <div className="section-divider">
            <span className="divider-text">Permisos de Navegación</span>
          </div>

          <div className="flex flex-wrap gap-2 justify-start">
            {AVAILABLE_MODULES.map(module => {
              const Icon = module.icon;
              const isActive = newUser.permisos?.includes(module.id);
              return (
                <button 
                  key={module.id} 
                  type="button"
                  className={`group relative flex flex-col items-center justify-center gap-2 p-4 min-w-[110px] flex-1 rounded-[18px] border transition-all duration-500 overflow-hidden ${
                    isActive 
                      ? 'bg-accent text-white border-accent shadow-[0_8px_20px_rgba(99,102,241,0.3)] scale-[1.02]' 
                      : 'bg-white/5 border-white/5 text-muted/60 hover:border-white/20 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => {
                    const perms = isActive 
                      ? (newUser.permisos || []).filter(p => p !== module.id)
                      : [...(newUser.permisos || []), module.id];
                    setNewUser({...newUser, permisos: perms});
                  }}
                >
                  {isActive && <div className="absolute inset-0 bg-gradient-to-tr from-accent/40 via-transparent to-transparent opacity-50 animate-pulse" />}
                  
                  <div className={`relative p-2 rounded-xl transition-all duration-500 ${isActive ? 'bg-white/20 shadow-inner' : 'bg-black/20 group-hover:scale-110'}`}>
                    <Icon size={18} strokeWidth={2.5} />
                  </div>
                  <span className="relative text-[9px] font-black uppercase tracking-widest">{module.name}</span>
                  
                  {isActive && <div className="absolute top-2 right-2 text-white">
                    <CheckCircle2 size={10} fill="white" className="text-accent" />
                  </div>}
                </button>
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
        maxWidth="600px"
        footer={
          <Button onClick={handleUpdateUser}>Guardar Cambios</Button>
        }
      >
        {editingUser && (
          <div className="space-y-6">
            {/* IDENTIDAD: BLOQUES DE ENTRADA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="zona-style-input-card">
                <div className="card-header-mini">
                  <User size={12} className="text-accent" />
                  <span>Nombre del Perfil</span>
                </div>
                <input 
                  type="text" 
                  className="zona-input-field" 
                  value={editingUser.nombre} 
                  onChange={e => setEditingUser({...editingUser, nombre: e.target.value})} 
                  required 
                />
              </div>
              <div className="zona-style-input-card opacity-50 cursor-not-allowed">
                <div className="card-header-mini">
                  <Mail size={12} className="text-muted" />
                  <span>Email (No editable)</span>
                </div>
                <input 
                  type="email" 
                  className="zona-input-field cursor-not-allowed" 
                  value={editingUser.email} 
                  disabled
                />
              </div>
            </div>

            {/* ROL: SELECTOR DE TARJETAS CUADRADAS */}
            <div className="section-divider">
              <span className="divider-text">Modificar Jerarquía</span>
            </div>

            <div className="flex flex-wrap gap-2 justify-start">
              {[
                { id: 'recepcion', name: 'Recepción', icon: Building2, color: '#6366f1' },
                { id: 'mantenimiento', name: 'Técnico', icon: Wrench, color: '#f59e0b' },
                { id: 'limpieza', name: 'Limpieza', icon: Brush, color: '#10b981' },
                { id: 'gobernanta', name: 'Gobernanta', icon: UserCheck, color: '#ec4899' },
                { id: 'admin', name: 'Admin', icon: Shield, color: '#ef4444' }
              ].map(role => (
                <button
                  key={role.id}
                  type="button"
                  className={`zona-role-card flex-1 min-w-[100px] ${editingUser.rol === role.id ? 'active' : ''}`}
                  style={{ '--role-color': role.color } as React.CSSProperties}
                  onClick={() => setEditingUser({...editingUser, rol: role.id as UserRole})}
                >
                  <div className="role-icon">
                    <role.icon size={18} />
                  </div>
                  <span className="role-name">{role.name}</span>
                  {editingUser.rol === role.id && <div className="role-check"><CheckCircle2 size={10} /></div>}
                </button>
              ))}
            </div>

            {/* PERMISOS: REJILLA DE BLOQUES */}
            <div className="section-divider">
              <span className="divider-text">Ajustes de Capacidad</span>
            </div>

            <div className="flex flex-wrap gap-2 justify-start">
              {AVAILABLE_MODULES.map(module => {
                const Icon = module.icon;
                const isActive = editingUser.permisos?.includes(module.id);
                return (
                  <button 
                    key={module.id} 
                    type="button"
                    className={`group relative flex flex-col items-center justify-center gap-2 p-4 min-w-[110px] flex-1 rounded-[18px] border transition-all duration-500 overflow-hidden ${
                      isActive 
                        ? 'bg-accent text-white border-accent shadow-[0_8px_20px_rgba(99,102,241,0.3)] scale-[1.02]' 
                        : 'bg-white/5 border-white/5 text-muted/60 hover:border-white/20 hover:bg-white/10 hover:text-white'
                    }`}
                    onClick={() => {
                      const perms = isActive 
                        ? (editingUser.permisos || []).filter(p => p !== module.id)
                        : [...(editingUser.permisos || []), module.id];
                      setEditingUser({...editingUser, permisos: perms});
                    }}
                  >
                    {isActive && <div className="absolute inset-0 bg-gradient-to-tr from-accent/40 via-transparent to-transparent opacity-50 animate-pulse" />}
                    
                    <div className={`relative p-2 rounded-xl transition-all duration-500 ${isActive ? 'bg-white/20 shadow-inner' : 'bg-black/20 group-hover:scale-110'}`}>
                      <Icon size={18} strokeWidth={2.5} />
                    </div>
                    <span className="relative text-[9px] font-black uppercase tracking-widest">{module.name}</span>
                    
                    {isActive && <div className="absolute top-2 right-2 text-white">
                      <CheckCircle2 size={10} fill="white" className="text-accent" />
                    </div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
      <style>{`
        .zona-style-input-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 8px 12px;
          transition: all 0.2s;
        }
        .zona-style-input-card:focus-within {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--color-accent);
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.1);
        }
        .card-header-mini {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 9px;
          font-weight: 800;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .zona-input-field {
          background: transparent;
          border: none;
          color: white;
          width: 100%;
          font-size: 0.85rem;
          font-weight: 600;
          outline: none;
        }
        .zona-input-field::placeholder { color: rgba(255,255,255,0.1); }

        .section-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 0;
        }
        .divider-text {
          font-size: 10px;
          font-weight: 900;
          color: var(--color-accent);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          white-space: nowrap;
        }
        .section-divider::after {
          content: '';
          height: 1px;
          flex: 1;
          background: linear-gradient(to right, var(--color-accent), transparent);
          opacity: 0.2;
        }

        .zona-role-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 8px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.02);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .zona-role-card:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
        }
        .zona-role-card.active {
          background: var(--role-color);
          border-color: white;
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
          transform: scale(1.05);
        }
        .role-icon {
          color: var(--role-color);
          transition: all 0.3s;
        }
        .zona-role-card.active .role-icon,
        .zona-role-card.active .role-name {
          color: white;
        }
        .role-name {
          font-size: 8px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          text-align: center;
        }
        .role-check {
          position: absolute;
          top: 4px;
          right: 4px;
          color: white;
        }
      `}</style>
    </div>
  );
};
