import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  AlertTriangle, 
  MessageSquare, 
  Calendar,
  Package
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function MobileNav() {
  const { profile } = useAuth()

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { id: 'incidencias', name: 'Incidencias', path: '/incidencias', icon: AlertTriangle },
    { id: 'planificacion', name: 'Agenda', path: '/planificacion', icon: Calendar },
    { id: 'chat', name: 'Chat', path: '/chat', icon: MessageSquare },
    { id: 'inventario', name: 'Stock', path: '/inventario', icon: Package },
  ]

  const filteredItems = profile?.rol === 'admin' || profile?.rol === 'direccion' 
    ? navItems 
    : navItems.filter(item => profile?.permisos?.includes(item.id))

  return (
    <nav className="mobile-nav glass-card border-t">
      <div className="mobile-nav-content">
        {filteredItems.slice(0, 5).map((item) => {
          const Icon = item.icon
          return (
            <NavLink 
              key={item.path}
              to={item.path} 
              className={({ isActive }) => 
                `mobile-nav-item ${isActive ? 'active' : ''}`
              }
              end={item.path === '/'}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          )
        })}
      </div>

      <style>{`
        .mobile-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(64px + env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 0px);
          z-index: 1000;
          background: rgba(17, 17, 40, 0.85) !important;
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border-radius: 0;
          border: none;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.4);
          display: none;
        }

        @media (max-width: 768px) {
          .mobile-nav {
            display: block;
          }
        }

        .mobile-nav-content {
          display: grid;
          grid-template-columns: repeat(${filteredItems.length}, 1fr);
          height: 100%;
          padding: 0 4px;
        }

        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 500;
          transition: all 0.3s ease;
          padding: 8px 0;
          position: relative;
        }

        .mobile-nav-item.active {
          color: var(--color-accent);
        }

        .mobile-nav-item svg {
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .mobile-nav-item.active svg {
          transform: translateY(-2px);
        }

        .mobile-nav-item.active::after {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          background: var(--color-accent);
          border-radius: 0 0 4px 4px;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </nav>
  )
}
