import { useState, useEffect } from 'react';
import { 
  Users, Hotel, Settings, Package, QrCode, Smartphone, Activity, Calendar, 
  Layers, MapPin, Check, X, Bell, Building2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { UserManager } from '../components/features/config/UserManager';
import { AssetManager } from '../components/features/config/AssetManager';
import { ZoneManager } from '../components/features/config/ZoneManager';
import { MeterManager } from '../components/features/config/MeterManager';
import { MaintenanceManager } from '../components/features/config/MaintenanceManager';
import { NexusConfig } from '../components/features/config/NexusConfig';
import { SettingsManager } from '../components/features/config/SettingsManager';
import { HotelManager } from '../components/features/config/HotelManager';
import { configService as configApi } from '../services/configService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const TABS = [
  { id: 'usuarios', name: 'Usuarios', icon: Users },
  { id: 'zonas', name: 'Zonas y Habs', icon: Layers },
  { id: 'activos', name: 'Activos / QR', icon: Package },
  { id: 'contadores', name: 'Contadores', icon: Activity },
  { id: 'mantenimiento', name: 'Mantenimiento', icon: Calendar },
  { id: 'v-nexus', name: 'V-Nexus', icon: Smartphone },
  { id: 'ajustes', name: 'Ajustes', icon: Settings },
];

export default function Configuracion() {
  const { profile, activeHotelId } = useAuth();
  const [activeTab, setActiveTab] = useState('usuarios');
  
  // Tabs dinámicos basados en permisos
  const configTabs = [...TABS];
  if (profile?.rol === 'super_admin') {
    // Insertar Hoteles al principio
    configTabs.unshift({ id: 'hoteles', name: 'Hoteles', icon: Building2 });
  }
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | '', text: string }>({ type: '', text: '' });
  
  // Centralized data state
  const [data, setData] = useState({
    users: [],
    zonas: [],
    habitaciones: [],
    activos: [],
    contadores: [],
    mantenimiento: [],
    plantillas: []
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [users, zonas, habitaciones, activos, contadores, mantenimiento, plantillas] = await Promise.all([
        configApi.getUsers(activeHotelId),
        configApi.getZones(activeHotelId),
        configApi.getRooms(activeHotelId),
        configApi.getAssets(activeHotelId),
        configApi.getCounters(activeHotelId),
        supabase.from('mantenimiento_preventivo').select('*').eq('hotel_id', activeHotelId).order('frecuencia'),
        supabase.from('mantenimiento_plantillas').select('*').eq('hotel_id', activeHotelId).order('nombre')
      ]);

      setData({
        users,
        zonas,
        habitaciones,
        activos,
        contadores,
        mantenimiento: mantenimiento.data || [],
        plantillas: plantillas.data || []
      });
    } catch (error) {
      console.error(error);
      setMsg({ type: 'error', text: 'Error al sincronizar datos' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [activeHotelId]);

  const showMsg = (m: { type: 'success' | 'error', text: string }) => {
    setMsg(m);
    setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  };

  if (loading && data.users.length === 0) {
    return (
      <div className="flex items-center justify-center min-height-screen">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="config-container p-md md:p-xl">
      {/* Toast Notification */}
      {msg.text && (
        <div className={`toast ${msg.type === 'error' ? 'toast-danger' : 'toast-success'} animate-slide-right`}>
          <div className="flex items-center gap-sm">
            {msg.type === 'error' ? <X size={20} /> : <Check size={20} />}
            <span>{msg.text}</span>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md mb-xl">
        <div>
          <h1 className="page-title mb-xs">Configuración del Sistema</h1>
          <p className="text-muted text-sm">Gestión técnica y operativa del hotel</p>
        </div>
        <div className="flex items-center gap-sm">
           <div className="stat-card glass p-sm px-md rounded-xl border border-white/5">
             <span className="text-xs text-muted uppercase font-bold tracking-tighter">Estado Sync</span>
             <div className="flex items-center gap-xs">
               <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
               <span className="text-sm font-bold text-white uppercase">Conectado</span>
             </div>
           </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="config-layout">
        {/* Navigation Sidebar */}
        <aside className="config-sidebar glass-card p-sm h-fit sticky top-xl">
          <nav className="flex flex-col gap-xs">
            {configTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`config-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{tab.name}</span>
                  {activeTab === tab.id && <div className="nav-indicator" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Dynamic Content Panel */}
        <main className="config-main">
          {activeTab === 'hoteles' && profile?.rol === 'super_admin' && (
            <HotelManager />
          )}

          {activeTab === 'usuarios' && (
            <UserManager 
              currentUserProfile={profile} 
              onMessage={showMsg} 
              activeHotelId={activeHotelId}
              users={data.users}
              onRefresh={fetchAll}
            />
          )}
          
          {activeTab === 'zonas' && (
            <ZoneManager 
              zones={data.zonas} 
              rooms={data.habitaciones} 
              onMessage={showMsg} 
              onRefresh={fetchAll} 
              activeHotelId={activeHotelId}
            />
          )}

          {activeTab === 'activos' && (
            <AssetManager 
              zones={data.zonas} 
              assets={data.activos}
              activeHotelId={activeHotelId}
              onMessage={showMsg} 
              onRefresh={fetchAll}
            />
          )}

          {activeTab === 'contadores' && (
            <MeterManager 
              counters={data.contadores} 
              onMessage={showMsg} 
              onRefresh={fetchAll} 
              activeHotelId={activeHotelId}
            />
          )}

          {activeTab === 'mantenimiento' && (
            <MaintenanceManager 
              maintenance={data.mantenimiento} 
              templates={data.plantillas} 
              onMessage={showMsg} 
              onRefresh={fetchAll} 
              activeHotelId={activeHotelId}
            />
          )}

          {activeTab === 'v-nexus' && (
            <NexusConfig 
              rooms={data.habitaciones} 
              zones={data.zonas} 
              activeHotelId={activeHotelId}
            />
          )}

          {activeTab === 'ajustes' && (
            <SettingsManager onMessage={showMsg} activeHotelId={activeHotelId} />
          )}
        </main>
      </div>

      <style>{`
        .config-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: var(--spacing-xl);
          align-items: start;
        }

        .config-nav-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: 0.875rem 1.25rem;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-weight: 500;
          transition: all var(--transition-fast);
          position: relative;
          text-align: left;
          width: 100%;
        }

        .config-nav-btn:hover {
          background: var(--color-bg-glass);
          color: var(--color-text-primary);
        }

        .config-nav-btn.active {
          background: var(--color-accent-light);
          color: var(--color-accent-hover);
        }

        .nav-indicator {
          position: absolute;
          right: 12px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-accent);
          box-shadow: 0 0 10px var(--color-accent);
        }

        @media (max-width: 1024px) {
          .config-layout {
            grid-template-columns: 1fr;
          }
          .config-sidebar {
            position: static;
            margin-bottom: var(--spacing-lg);
          }
          .config-sidebar nav {
            flex-direction: row;
            overflow-x: auto;
            padding-bottom: var(--spacing-sm);
          }
          .config-nav-btn {
            white-space: nowrap;
            padding: 0.625rem 1rem;
          }
          .nav-indicator {
            bottom: 4px;
            right: 50%;
            transform: translateX(50%);
          }
        }
      `}</style>
    </div>
  );
}
