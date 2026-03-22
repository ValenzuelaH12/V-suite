import { MessageSquare, X } from 'lucide-react'

export function NewChatModal({ 
  isOpen, 
  onClose, 
  allUsers, 
  onCreateDirectMessage 
}: { 
  isOpen: boolean
  onClose: () => void
  allUsers: any[]
  onCreateDirectMessage: (user: any) => Promise<void>
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card p-none animate-scale-in max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="modal-header border-b p-lg flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-sm">
            <MessageSquare size={24} className="text-primary" /> Nuevo Chat
          </h2>
          <button className="btn-icon btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body p-lg">
          <div className="mb-md">
            <h3 className="text-sm font-semibold text-muted mb-sm uppercase tracking-wider">Contactos (Mensaje Directo)</h3>
            <div className="users-list">
              {allUsers.length > 0 ? (
                allUsers.map(user => (
                  <div 
                    key={user.id} 
                    className="user-list-item flex items-center gap-md p-md rounded-md cursor-pointer hover-bg-light transition-all"
                    onClick={() => onCreateDirectMessage(user)}
                  >
                    <div className="avatar bg-primary-light text-primary">
                      {user.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{user.nombre}</div>
                      <div className="text-xs text-muted capitalize">{user.rol}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted italic p-md">No hay otros usuarios registrados.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
