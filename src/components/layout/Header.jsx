import { Bell, Search, Menu, X, AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'
import { MessageSquare } from 'lucide-react'

export default function Header({ toggleSidebar }) {
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const { totalUnread: totalChatUnread, chatNotifications } = useNotifications()

  useEffect(() => {
    fetchNotifications()
    // Suscripción en tiempo real opcional aquí, pero por ahora fetch inicial
    const interval = setInterval(fetchNotifications, 30000) // Refrescar cada 30s
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // 1. Incidencias urgentes/pendientes
      const { data: incs } = await supabase
        .from('incidencias')
        .select('id, title, priority, created_at')
        .in('status', ['pending', 'in-progress'])
        .order('created_at', { ascending: false })
        .limit(5)

      // 2. Mantenimientos vencidos o para hoy
      const { data: mantos } = await supabase
        .from('mantenimiento_preventivo')
        .select('id, titulo, proxima_fecha')
        .lte('proxima_fecha', today)
        .limit(5)

      const formattedNotifications = [
        ...chatNotifications.map(n => ({
          ...n,
          icon: MessageSquare,
        })),
        ...(incs || []).map(i => ({
          id: `inc-${i.id}`,
          type: 'incidencia',
          title: i.title,
          subtitle: `Prioridad ${i.priority}`,
          time: new Date(i.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          link: '/incidencias',
          icon: AlertTriangle,
          color: i.priority === 'high' ? 'danger' : 'warning'
        })),
        ...(mantos || []).map(m => ({
          id: `manto-${m.id}`,
          type: 'mantenimiento',
          title: m.titulo,
          subtitle: `Vence: ${m.proxima_fecha}`,
          time: 'Hoy',
          link: '/planificacion',
          icon: Clock,
          color: 'info'
        }))
      ]

      setNotifications(formattedNotifications)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const handleNotificationClick = (link) => {
    navigate(link)
    setShowNotifications(false)
  }
  return (
    <header className="header glass border-b">
      <div className="header-left">
        <button className="btn-icon btn-ghost mobile-menu-btn" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>

        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar incidencias, habitaciones..." 
            className="search-input"
          />
        </div>
      </div>

      <div className="header-right">
        <div className="relative">
          <button 
            className={`notification-btn relative ${showNotifications ? 'active' : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {(notifications.length + totalChatUnread) > 0 && (
              <span className="notification-badge">{notifications.length + totalChatUnread}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown glass animate-slide-down">
              <div className="dropdown-header">
                <h3>Notificaciones</h3>
                <span className="badge badge-neutral text-xxs">{notifications.length + totalChatUnread} Pendientes</span>
              </div>
              
              <div className="dropdown-body">
                {notifications.length === 0 ? (
                  <div className="p-xl text-center text-muted">
                    <p className="text-sm">No tienes notificaciones pendientes</p>
                  </div>
                ) : (
                  notifications.map(n => {
                    const Icon = n.icon
                    return (
                      <div 
                        key={n.id} 
                        className="notification-item"
                        onClick={() => handleNotificationClick(n.link)}
                      >
                        <div className={`notification-icon text-${n.color}`}>
                          <Icon size={18} />
                        </div>
                        <div className="notification-content">
                          <p className="notification-title">{n.title}</p>
                          <p className="notification-subtitle">{n.subtitle}</p>
                          <span className="notification-time">{n.time}</span>
                        </div>
                        <ChevronRight size={14} className="text-muted" />
                      </div>
                    )
                  })
                )}
              </div>
              
              <div className="dropdown-footer">
                <button className="btn btn-ghost btn-sm w-full" onClick={() => setShowNotifications(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .header {
          height: var(--header-height);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--spacing-lg);
          position: fixed;
          top: 0;
          right: 0;
          left: var(--sidebar-width);
          z-index: 90;
          background: rgba(10, 10, 26, 0.6) !important;
        }

        .border-b { border-bottom: 1px solid var(--color-border); }

        .header-left, .header-right {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .search-bar {
          position: relative;
          display: flex;
          align-items: center;
          width: 300px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          color: var(--color-text-muted);
        }

        .search-input {
          width: 100%;
          padding: 0.625rem 1rem 0.625rem 2.5rem;
          background: var(--color-bg-input);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          color: var(--color-text-primary);
          font-size: var(--font-size-sm);
          transition: all var(--transition-fast);
        }

        .search-input:focus {
          border-color: var(--color-accent);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 3px var(--color-accent-light);
        }

        .notification-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
          background: var(--color-bg-glass);
          border: 1px solid var(--color-border);
        }

        .notification-btn:hover {
          color: var(--color-text-primary);
          background: var(--color-bg-glass-hover);
          transform: translateY(-1px);
        }
        
        .relative { position: relative; }

        .notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: var(--color-danger);
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid var(--color-bg-primary);
          animation: pulse 2s infinite;
        }

        .mobile-menu-btn {
          display: none;
        }

        .notification-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 320px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-2xl);
          background: rgba(15, 15, 35, 0.95);
          backdrop-filter: blur(12px);
          overflow: hidden;
          z-index: 100;
        }

        .dropdown-header {
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.03);
        }

        .dropdown-header h3 {
          font-size: var(--font-size-sm);
          font-weight: 700;
        }

        .dropdown-body {
          max-height: 360px;
          overflow-y: auto;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-md);
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--color-border);
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        .notification-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
        }

        .notification-title {
          font-size: var(--font-size-sm);
          font-weight: 600;
          margin-bottom: 2px;
          color: var(--color-text-primary);
        }

        .notification-subtitle {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          margin-bottom: 4px;
        }

        .notification-time {
          font-size: 0.7rem;
          color: var(--color-accent);
          font-weight: 600;
        }

        .dropdown-footer {
          padding: var(--spacing-sm);
          background: rgba(0, 0, 0, 0.1);
          border-top: 1px solid var(--color-border);
        }

        .text-danger { color: #f87171; }
        .text-warning { color: #fbbf24; }
        .text-info { color: #38bdf8; }
        .text-xxs { font-size: 0.65rem; }

        @media (max-width: 768px) {
          .header {
            left: 0;
            padding: 0 var(--spacing-md);
          }
          .mobile-menu-btn {
            display: flex;
          }
          .search-bar {
            display: none;
          }
          .notification-dropdown {
            position: fixed;
            top: var(--header-height);
            right: var(--spacing-md);
            left: var(--spacing-md);
            width: auto;
            max-width: calc(100vw - 2 * var(--spacing-md));
          }
        }
      `}</style>
    </header>
  )
}
