import { NavLink } from 'react-router-dom'
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
  Calendar
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar({ isOpen, closeSidebar }) {
  const { signOut, profile } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { id: 'incidencias', name: 'Incidencias', path: '/incidencias', icon: AlertTriangle },
    { id: 'lecturas', name: 'Lecturas', path: '/lecturas', icon: Activity },
    { id: 'chat', name: 'Chat', path: '/chat', icon: MessageSquare },
    { id: 'planificacion', name: 'Planificación', path: '/planificacion', icon: Calendar },
    { id: 'configuracion', name: 'Configuración', path: '/configuracion', icon: Settings },
  ]

  // Si no hay permisos definidos (usuario antiguo o error), mostramos por defecto los básicos
  // Los admins siempre ven todo
  const filteredItems = profile?.rol === 'admin' || profile?.rol === 'direccion' 
    ? navItems 
    : navItems.filter(item => profile?.permisos?.includes(item.id))

  return (
    <aside className="sidebar glass border-r">
      <div className="sidebar-header border-b">
        <div className="flex items-center gap-sm flex-1">
          <Hotel className="text-accent" size={28} />
          <h2>HotelOps <span className="text-accent">Pro</span></h2>
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
      </nav>

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
        
        <button onClick={handleSignOut} className="btn btn-ghost w-full mt-sm justify-start">
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
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
