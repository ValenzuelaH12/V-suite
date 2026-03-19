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
import { NexusConfig } from '../components/features/config/NexusConfig';
import { SettingsManager } from '../components/features/config/SettingsManager';
import { HotelManager } from '../components/features/config/HotelManager';
import { IncidentTypeManager } from '../components/features/config/IncidentTypeManager';
import { 
  useUsers, useZones, useRooms, useAssets, useCounters, useIncidentTypes 
} from '../hooks/useConfig';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const TABS = [
  { id: 'usuarios', name: 'Usuarios', icon: Users },
  { id: 'zonas', name: 'Zonas y Habs', icon: Layers },
  { id: 'activos', name: 'Activos / QR', icon: Package },
  { id: 'incidencias', name: 'Tipos Incidencias', icon: Activity },
  { id: 'contadores', name: 'Contadores', icon: Activity },
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
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | '', text: string }>({ type: '', text: '' });
  
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useUsers(activeHotelId);
  const { data: zonas = [], isLoading: zonesLoading, refetch: refetchZones } = useZones(activeHotelId);
  const { data: habitaciones = [], isLoading: roomsLoading, refetch: refetchRooms } = useRooms(activeHotelId);
  const { data: activos = [], isLoading: assetsLoading, refetch: refetchAssets } = useAssets(activeHotelId);
  const { data: contadores = [], isLoading: countersLoading, refetch: refetchCounters } = useCounters(activeHotelId);
  const { data: tipos = [], isLoading: typesLoading, refetch: refetchIncidentTypes } = useIncidentTypes(activeHotelId);
  
  // Mantenimiento aún usa supabase directamente por ahora, o podemos centralizarlo luego

  const loading = usersLoading || zonesLoading || roomsLoading || assetsLoading || countersLoading || typesLoading;
  
  const fetchAll = () => {
    refetchUsers();
    refetchZones();
    refetchRooms();
    refetchAssets();
    refetchCounters();
    refetchIncidentTypes();
  };



  const showMsg = (m: { type: 'success' | 'error', text: string }) => {
    setMsg(m);
    setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  };


  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-height-screen">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="config-container p-md md:p-xl animate-fade-in">
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
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">
            <Settings className="text-accent" />
            Configuración del Sistema
          </h1>
          <p className="v-page-subtitle">Gestión técnica y operativa de la V-Suite</p>
        </div>
        <div className="flex items-center gap-sm">
           <div className="v-glass-card p-sm px-md flex items-center gap-sm border-success/20">
             <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_var(--color-success)]" />
             <span className="text-[10px] font-bold text-success uppercase tracking-wider">Sincronizado</span>
           </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="config-layout">
        {/* Navigation Sidebar */}
        <aside className="config-sidebar v-glass-card p-sm h-fit sticky top-xl">
          <nav className="flex flex-col gap-xs">
            {configTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`config-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon size={18} className={activeTab === tab.id ? 'text-accent' : 'text-muted'} />
                  <span className="text-sm font-semibold">{tab.name}</span>
                  {activeTab === tab.id && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
                  )}
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
              users={users}
              onRefresh={fetchAll}
            />
          )}
          
          {activeTab === 'zonas' && (
            <ZoneManager 
              zones={zonas} 
              rooms={habitaciones} 
              onMessage={showMsg} 
              onRefresh={fetchAll} 
              activeHotelId={activeHotelId}
            />
          )}

          {activeTab === 'activos' && (
            <AssetManager 
              zones={zonas} 
              assets={activos}
              activeHotelId={activeHotelId}
              onMessage={showMsg} 
              onRefresh={fetchAll}
            />
          )}

          {activeTab === 'incidencias' && (
            <IncidentTypeManager 
              types={tipos} 
              onMessage={showMsg} 
              onRefresh={fetchAll} 
              activeHotelId={activeHotelId}
            />
          )}

          {activeTab === 'contadores' && (
            <MeterManager 
              counters={contadores} 
              onMessage={showMsg} 
              onRefresh={fetchAll} 
              activeHotelId={activeHotelId}
            />
          )}

          {activeTab === 'v-nexus' && (
            <NexusConfig 
              rooms={habitaciones} 
              zones={zonas} 
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
          grid-template-columns: 260px 1fr;
          gap: var(--spacing-xl);
          align-items: start;
        }

        .config-nav-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: 0.875rem 1rem;
          border-radius: var(--radius-lg);
          color: var(--color-text-secondary);
          transition: all var(--transition-normal);
          position: relative;
          text-align: left;
          width: 100%;
        }

        .config-nav-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-text-primary);
        }

        .config-nav-btn.active {
          background: rgba(99, 102, 241, 0.1);
          color: white;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        @media (max-width: 1024px) {
          .config-layout {
            grid-template-columns: 1fr;
          }
          .config-sidebar {
            position: sticky;
            top: 0;
            z-index: 10;
            margin-bottom: var(--spacing-lg);
          }
          .config-sidebar nav {
            flex-direction: row;
            overflow-x: auto;
            padding: 0.25rem;
          }
          .config-nav-btn {
            white-space: nowrap;
            padding: 0.625rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
