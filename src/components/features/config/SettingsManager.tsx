import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Type, Save, Image as ImageIcon } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { settingsService } from '../../../services/settingsService';
import { GlobalSettings, ActivityLogEvent } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { configService } from '../../../services/configService';

interface SettingsManagerProps {
  onMessage: (msg: { type: 'success' | 'error' | '', text: string }) => void;
  activeHotelId: string | null;
}

const ROLES = [
  { id: 'admin', name: 'Administrador' },
  { id: 'direccion', name: 'Dirección' },
  { id: 'mantenimiento', name: 'Mantenimiento' },
  { id: 'recepcion', name: 'Recepción' },
  { id: 'limpieza', name: 'Limpieza' },
  { id: 'gobernanta', name: 'Gobernanta' }
];

const PRIORITIES = [
  { id: 'low', name: 'Baja' },
  { id: 'medium', name: 'Media' },
  { id: 'high', name: 'Alta' },
  { id: 'urgent', name: 'Urgente' }
];

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onMessage, activeHotelId }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'perfil' | 'notificaciones' | 'textos' | 'auditoria'>('perfil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings>({
    hotel_name: '',
    currency: 'EUR',
    timezone: 'Europe/Madrid',
    logo_url: null,
    welcome_message: '',
    notification_rules: {}
  });
  const [logs, setLogs] = useState<ActivityLogEvent[]>([]);
  const [zones, setZones] = useState<{id: string, nombre: string}[]>([]);

  useEffect(() => {
    fetchSettings();
  }, [activeHotelId]);

  useEffect(() => {
    if (activeTab === 'auditoria') {
      fetchLogs();
    }
  }, [activeTab, activeHotelId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [data, zonesData] = await Promise.all([
        settingsService.getSettings(activeHotelId),
        configService.getZones()
      ]);
      
      if (data) {
        setSettings({
          ...data,
          notification_rules: data.notification_rules || {}
        });
      }
      setZones(zonesData || []);
    } catch (error) {
      console.error(error);
      onMessage({ type: 'error', text: 'Error al cargar los ajustes globales.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await settingsService.getActivityLogs(50, activeHotelId);
      setLogs(data);
    } catch (error) {
      console.error(error);
      onMessage({ type: 'error', text: 'Error al cargar la auditoría.' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSaving(true);
    try {
      await settingsService.updateSettings(settings, profile.id, activeHotelId);
      onMessage({ type: 'success', text: 'Ajustes guardados correctamente.' });
    } catch (error) {
      onMessage({ type: 'error', text: 'Error al guardar ajustes.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-xl text-center">Cargando ajustes...</div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-xl animate-fade-in">
      <div className="v-glass-card w-full md:w-64 p-sm h-fit shrink-0">
        <nav className="flex flex-col gap-xs">
          <button 
            onClick={() => setActiveTab('perfil')}
            className={`flex items-center gap-sm p-3 rounded-xl transition-all ${activeTab === 'perfil' ? 'bg-accent text-white shadow-lg shadow-accent/25' : 'hover:bg-white/5 text-muted hover:text-white'}`}
          >
            <Settings size={18} />
            <span className="text-xs font-black uppercase tracking-wider">Identidad</span>
          </button>
          <button 
            onClick={() => setActiveTab('notificaciones')}
            className={`flex items-center gap-sm p-3 rounded-xl transition-all ${activeTab === 'notificaciones' ? 'bg-accent text-white shadow-lg shadow-accent/25' : 'hover:bg-white/5 text-muted hover:text-white'}`}
          >
            <Bell size={18} />
            <span className="text-xs font-black uppercase tracking-wider">Reglas</span>
          </button>
          <button 
            onClick={() => setActiveTab('textos')}
            className={`flex items-center gap-sm p-3 rounded-xl transition-all ${activeTab === 'textos' ? 'bg-accent text-white shadow-lg shadow-accent/25' : 'hover:bg-white/5 text-muted hover:text-white'}`}
          >
            <Type size={18} />
            <span className="text-xs font-black uppercase tracking-wider">Portal</span>
          </button>
          <button 
            onClick={() => setActiveTab('auditoria')}
            className={`flex items-center gap-sm p-3 rounded-xl transition-all ${activeTab === 'auditoria' ? 'bg-accent text-white shadow-lg shadow-accent/25' : 'hover:bg-white/5 text-muted hover:text-white'}`}
          >
            <Shield size={18} />
            <span className="text-xs font-black uppercase tracking-wider">Auditoría</span>
          </button>
        </nav>
      </div>

      <div className="v-glass-card flex-1 p-xl">
        {activeTab === 'perfil' && (
          <form onSubmit={handleSave} className="animate-fade-in flex flex-col gap-xl">
            <div className="flex items-center gap-md border-b border-white/5 pb-md mb-md">
               <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                 <Settings size={20} />
               </div>
               <h3 className="text-lg font-black text-white tracking-tight uppercase">Branding e Identidad</h3>
            </div>
            
            <div className="flex gap-lg items-center mb-md pb-lg border-b border-white/10">
              <div className="w-24 h-24 rounded-2xl bg-black/30 border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-muted cursor-pointer hover:border-accent hover:text-accent transition-colors">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <>
                    <ImageIcon size={28} className="mb-2" />
                    <span className="text-xs">Subir Logo</span>
                  </>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted mb-2">Se mostrará en V-Nexus y Reportes PDF. (Ideal PNG transparente)</p>
                <input 
                  type="url" 
                  className="input text-sm" 
                  placeholder="URL de la imagen (temporal)" 
                  value={settings.logo_url || ''}
                  onChange={e => setSettings({...settings, logo_url: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="input-group">
                <label className="input-label">Nombre Comercial del Hotel</label>
                <input 
                  type="text" 
                  className="input" 
                  value={settings.hotel_name} 
                  onChange={e => setSettings({...settings, hotel_name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div className="input-group">
                  <label className="input-label">Moneda ID</label>
                  <select 
                    className="select" 
                    value={settings.currency} 
                    onChange={e => setSettings({...settings, currency: e.target.value})}
                  >
                    <option value="EUR">Euro (€)</option>
                    <option value="USD">Dólar ($)</option>
                    <option value="MXN">Pesos (MXN)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Zona Horaria</label>
                  <select 
                    className="select" 
                    value={settings.timezone} 
                    onChange={e => setSettings({...settings, timezone: e.target.value})}
                  >
                    <option value="Europe/Madrid">Madrid (CET)</option>
                    <option value="America/Mexico_City">México (CST)</option>
                    <option value="America/New_York">New York (EST)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-md">
              <Button type="submit" icon={Save} loading={saving}>Guardar Cambios</Button>
            </div>
          </form>
        )}

        {activeTab === 'textos' && (
          <form onSubmit={handleSave} className="animate-fade-in flex flex-col gap-lg">
            <h3 className="text-xl font-bold mb-md">Personalización de Textos</h3>
            
            <div className="input-group">
              <label className="input-label flex justify-between">
                <span>Mensaje de Bienvenida en V-Nexus</span>
                <span className="text-xs font-normal text-muted">Aparece encima de los botones</span>
              </label>
              <textarea 
                className="input min-h-[120px] resize-y" 
                value={settings.welcome_message}
                onChange={e => setSettings({...settings, welcome_message: e.target.value})}
                placeholder="Ej. Bienvenido a nuestro portal digital. ¿En qué podemos ayudarle hoy?"
              />
            </div>

            <div className="flex justify-end mt-md">
              <Button type="submit" icon={Save} loading={saving}>Guardar Textos</Button>
            </div>
          </form>
        )}

        {activeTab === 'notificaciones' && (
          <form onSubmit={handleSave} className="animate-fade-in flex flex-col gap-lg">
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-xl font-bold">Reglas de Notificaciones por Rol</h3>
              <Button type="submit" icon={Save} loading={saving}>Guardar Reglas</Button>
            </div>
            
            <p className="text-muted text-sm mb-lg">
              Configura qué roles reciben notificaciones según la zona o la urgencia de la incidencia.
            </p>

            <div className="settings-grid">
              {ROLES.map(role => {
                const rule = settings.notification_rules?.[role.id] || { enabled: true, zones: ['all'], priorities: ['all'] };
                
                return (
                  <div key={role.id} className="role-card">
                    {/* Header: Role Name & Master Toggle */}
                    <div className="role-header">
                      <div className="role-title">
                        <div className={`status-dot ${rule.enabled ? 'active' : ''}`} />
                        {role.name}
                      </div>
                      <label className="toggle-switch">
                        <span className="text-sm text-secondary font-medium mr-2">
                          {rule.enabled ? 'Activado' : 'Desactivado'}
                        </span>
                        <input 
                          type="checkbox" 
                          checked={rule.enabled}
                          onChange={(e) => {
                            const newRules = { ...settings.notification_rules };
                            newRules[role.id] = { ...rule, enabled: e.target.checked };
                            setSettings({ ...settings, notification_rules: newRules });
                          }}
                        />
                        <div className="toggle-track">
                          <div className="toggle-thumb"></div>
                        </div>
                      </label>
                    </div>

                    {/* Filter Options */}
                    {rule.enabled && (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {/* Priorities Selection */}
                        <div className="filter-group">
                          <div className="filter-header">
                            <span className="filter-label">Prioridades</span>
                            <span className="filter-desc">Gravedad requerida</span>
                          </div>
                          <div className="filter-options">
                            <button
                              type="button"
                              onClick={() => {
                                const newRules = { ...settings.notification_rules };
                                newRules[role.id] = { ...rule, priorities: ['all'] };
                                setSettings({ ...settings, notification_rules: newRules });
                              }}
                              className={`filter-chip ${rule.priorities.includes('all') ? 'active' : ''}`}
                            >
                              Todas
                            </button>
                            {PRIORITIES.map(p => {
                              const isSelected = rule.priorities.includes(p.id);
                              const isAllSelected = rule.priorities.includes('all');
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  disabled={isAllSelected}
                                  onClick={() => {
                                    const newRules = { ...settings.notification_rules };
                                    const newPrios = isSelected
                                      ? rule.priorities.filter(x => x !== p.id)
                                      : [...rule.priorities.filter(x => x !== 'all'), p.id];
                                    
                                    newRules[role.id] = { ...rule, priorities: newPrios.length === 0 ? ['all'] : newPrios };
                                    setSettings({ ...settings, notification_rules: newRules });
                                  }}
                                  className={`filter-chip ${isSelected ? 'active' : ''}`}
                                >
                                  {p.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Zones Selection */}
                        <div className="filter-group">
                          <div className="filter-header">
                            <span className="filter-label">Zonas</span>
                            <span className="filter-desc">Ubicación asignada</span>
                          </div>
                          <div className="filter-options">
                            <button
                              type="button"
                              onClick={() => {
                                const newRules = { ...settings.notification_rules };
                                newRules[role.id] = { ...rule, zones: ['all'] };
                                setSettings({ ...settings, notification_rules: newRules });
                              }}
                              className={`filter-chip ${rule.zones.includes('all') ? 'active' : ''}`}
                            >
                              Todas
                            </button>
                            {zones.map(z => {
                              const isSelected = rule.zones.includes(z.id);
                              const isAllSelected = rule.zones.includes('all');
                              return (
                                <button
                                  key={z.id}
                                  type="button"
                                  disabled={isAllSelected}
                                  onClick={() => {
                                    const newRules = { ...settings.notification_rules };
                                    const newZones = isSelected
                                      ? rule.zones.filter(x => x !== z.id)
                                      : [...rule.zones.filter(x => x !== 'all'), z.id];
                                    
                                    newRules[role.id] = { ...rule, zones: newZones.length === 0 ? ['all'] : newZones };
                                    setSettings({ ...settings, notification_rules: newRules });
                                  }}
                                  className={`filter-chip ${isSelected ? 'active' : ''}`}
                                >
                                  {z.nombre}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end mt-md">
              <Button type="submit" icon={Save} loading={saving}>Guardar Reglas</Button>
            </div>
          </form>
        )}

        {activeTab === 'auditoria' && (
          <div className="animate-fade-in">
            <h3 className="text-xl font-bold mb-md flex items-center gap-sm">
              <Shield size={20} className="text-accent"/> Registro de Actividad
            </h3>
            <div className="v-table-container">
              <table className="v-table">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest text-muted">Fecha y Hora</th>
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest text-muted">Usuario</th>
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest text-muted">Acción Realizada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-muted text-xs uppercase tracking-widest font-bold">No hay registros recientes en la auditoría</td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 whitespace-nowrap text-[11px] font-bold text-muted">
                          {new Date(log.created_at).toLocaleString('es-ES')}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{log.perfiles?.nombre || 'Sistema'}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-muted uppercase font-black tracking-tighter">
                              {log.perfiles?.rol || 'SISTEMA'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                           <span className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg text-accent text-[11px] font-black uppercase tracking-widest">
                             {log.accion}
                           </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
