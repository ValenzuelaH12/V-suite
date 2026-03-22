import { Bell, ChevronRight, ShieldCheck, ShieldAlert, Shield } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'

export function NotificationDropdown({
  notifications,
  totalChatUnread,
  showNotifications,
  setShowNotifications,
  onNotificationClick
}: {
  notifications: any[]
  totalChatUnread: number
  showNotifications: boolean
  setShowNotifications: (val: boolean) => void
  onNotificationClick: (n: any) => void
}) {
  const { permission, sendNotification } = useNotifications()

  const requestPermission = () => {
    if (typeof Notification !== 'undefined') {
      Notification.requestPermission().then(() => {
        window.location.reload() // Recargar para activar SW correctamente si se acaba de dar permiso
      })
    }
  }

  return (
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
                    onClick={() => onNotificationClick(n)}
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
          
          <div className="dropdown-footer flex items-center justify-between gap-sm">
            <div className="flex items-center gap-xs px-2 py-1 rounded-md bg-white/5 cursor-help" 
                 title={permission === 'granted' ? 'Notificaciones activadas' : 'Notificaciones bloqueadas o sin solicitar'}>
              {permission === 'granted' ? (
                <ShieldCheck size={14} className="text-success" />
              ) : permission === 'denied' ? (
                <ShieldAlert size={14} className="text-danger" />
              ) : (
                <Shield size={14} className="text-muted" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70">
                {permission === 'granted' ? 'Push Activo' : 'Push Inactivo'}
              </span>
              {permission !== 'granted' && (
                <button onClick={requestPermission} className="text-[10px] text-accent font-black underline ml-1">
                  Activar
                </button>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNotifications(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
