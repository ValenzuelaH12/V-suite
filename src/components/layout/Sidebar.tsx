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


    </aside>
  )
}
