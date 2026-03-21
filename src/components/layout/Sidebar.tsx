import { NavLink } from 'react-router-dom'
import { QRScannerModal } from '../ui/qr/QRScannerModal'
import { 
  X,
  LayoutDashboard, 
  AlertTriangle, 
  MessageSquare, 
  CheckSquare, 
  Settings,
  LogOut,
  Hotel,
  Activity,
  Calendar,
  Package,
  BarChart3,
  Building2,
  Sun,
  Moon,
  ShieldCheck,
  ClipboardCheck,
  CalendarDays,
  Scan
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar({ isOpen, closeSidebar }) {
  const { signOut, profile, availableHotels } = useAuth()
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme')
    } else {
      document.documentElement.classList.remove('light-theme')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { id: 'incidencias', name: 'Incidencias', path: '/incidencias', icon: AlertTriangle },
    { id: 'inspecciones', name: 'Inspecciones', path: '/inspecciones', icon: ClipboardCheck },
    { id: 'calendario', name: 'Calendario', path: '/calendario', icon: CalendarDays },
    { id: 'inventario', name: 'Inventario', path: '/inventario', icon: Package },
    { id: 'lecturas', name: 'Lecturas', path: '/lecturas', icon: Activity },
    { id: 'chat', name: 'Chat', path: '/chat', icon: MessageSquare },
    { id: 'insights', name: 'V-Insights', path: '/insights', icon: BarChart3 },
    { id: 'cadenas', name: 'Control de Cadena', path: '/superadmin', icon: Building2, hidden: availableHotels.length <= 1 && profile?.rol !== 'super_admin' },
    { id: 'configuracion', name: 'Configuración', path: '/configuracion', icon: Settings },
  ]

  // Filtro de items según permisos
  const filteredItems = navItems.filter(item => {
    if (item.hidden) return false;
    if (profile?.rol === 'admin' || profile?.rol === 'direccion' || profile?.rol === 'super_admin') return true;
    return profile?.permisos?.includes(item.id);
  });

  return (
    <aside className="sidebar glass border-r">
      <div className="sidebar-header border-b">
        <div className="flex items-center gap-sm flex-1">
          <Hotel className="text-accent" size={28} />
          <h2>V-<span className="text-accent">Suite</span></h2>
        </div>
        <button className="btn-icon btn-ghost mobile-only" onClick={closeSidebar}>
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {filteredItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  end={item.path === '/'}
                  onClick={() => { if (window.innerWidth <= 768) closeSidebar() }}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
        
        {/* Quick Access QR Scanner Section */}
        <div className="px-lg py-md mt-md border-t border-white/5 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-blue-500/20 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
          <button 
            onClick={() => setIsQRScannerOpen(true)}
            className="relative btn btn-accent w-full flex items-center justify-center gap-2 py-3 shadow-[0_4px_20px_rgba(var(--color-accent),0.4)] hover:scale-[1.02] active:scale-95 transition-all animate-pulse-subtle"
          >
            <Scan size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Escáner V-Scan QR</span>
          </button>
        </div>
      </nav>

      <QRScannerModal 
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />

      <div className="sidebar-footer border-t">
        <div className="user-info">
          <div className="avatar avatar-gradient">
            {profile?.rol === 'admin' ? 'A' : 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">{profile?.nombre || 'Usuario'}</span>
            <span className="user-role badge badge-neutral">{profile?.rol || 'Staff'}</span>
          </div>
        </div>
        
        <div className="flex gap-sm mt-md">
          <button onClick={toggleTheme} className="btn btn-secondary flex-1 justify-center">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
          <button onClick={handleSignOut} className="btn btn-ghost p-sm" title="Cerrar Sesión">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          display: flex;
          flex-direction: column;
          z-index: 100;
          background: rgba(10, 10, 26, 0.8) !important;
        }

        .border-r { border-right: 1px solid var(--color-border); }
        .border-b { border-bottom: 1px solid var(--color-border); }
        .border-t { border-top: 1px solid var(--color-border); }

        .sidebar-header {
          height: var(--header-height);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: 0 var(--spacing-lg);
        }

        .sidebar-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .text-accent {
          color: var(--color-accent);
        }

        .sidebar-nav {
          flex: 1;
          padding: var(--spacing-lg) var(--spacing-md);
          overflow-y: auto;
        }

        .sidebar-nav ul {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: 0.875rem 1.25rem;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          position: relative;
          overflow: hidden;
        }
        
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-text-primary);
          transform: translateX(4px);
        }

        .nav-link.active {
          background: rgba(99, 102, 241, 0.1);
          color: var(--color-accent-hover);
          box-shadow: inset 0 0 20px rgba(99, 102, 241, 0.05);
        }
        
        .nav-link.active::after {
          content: '';
          position: absolute;
          left: 0;
          top: 25%;
          height: 50%;
          width: 4px;
          background: var(--color-accent);
          border-radius: 0 4px 4px 0;
          box-shadow: 0 0 10px var(--color-accent);
        }

        .sidebar-footer {
          padding: var(--spacing-md);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          background: var(--color-bg-glass);
        }

        .user-details {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .user-name {
          font-weight: 500;
          font-size: var(--font-size-sm);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        @media (max-width: 768px) {
          .sidebar {
            width: 280px;
            transform: translateX(${isOpen ? '0' : '-100%'});
            transition: transform var(--transition-normal);
            box-shadow: ${isOpen ? 'var(--shadow-2xl)' : 'none'};
          }
          .mobile-only {
            display: flex;
          }
        }

        .mt-sm { margin-top: var(--spacing-sm); }
        .w-full { width: 100%; }
        .justify-start { justify-content: flex-start; }
        .flex-1 { flex: 1; }
        .gap-sm { gap: var(--spacing-sm); }
      `}</style>
    </aside>
  )
}
