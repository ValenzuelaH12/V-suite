import { useState } from 'react'
import { Plus, AlertTriangle, Activity, Package, ClipboardCheck, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const actions = [
    { label: 'Incidencia', icon: AlertTriangle, color: 'var(--color-danger)', action: () => navigate('/incidencias') },
    { label: 'Lectura', icon: Activity, color: 'var(--color-info)', action: () => navigate('/lecturas') },
    { label: 'Inventario', icon: Package, color: 'var(--color-success)', action: () => navigate('/inventario') },
    { label: 'Planificar', icon: ClipboardCheck, color: 'var(--color-accent)', action: () => navigate('/planificacion') },
  ]

  return (
    <div className="quick-actions-container mobile-only">
      {isOpen && (
        <>
          <div className="quick-actions-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="quick-actions-menu">
            {actions.map((item, index) => (
              <button 
                key={index} 
                className="quick-action-item"
                style={{ '--index': index } as any}
                onClick={() => {
                  item.action()
                  setIsOpen(false)
                }}
              >
                <div className="action-label">{item.label}</div>
                <div className="action-icon" style={{ background: item.color }}>
                  <item.icon size={20} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <button 
        className={`fab-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Acciones rápidas"
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </button>

      <style>{`
        .quick-actions-container {
          position: fixed;
          bottom: 80px;
          right: 20px;
          z-index: 1001;
        }

        .fab-button {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--color-accent-gradient);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: none;
          cursor: pointer;
        }

        .fab-button.open {
          transform: rotate(180deg);
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.6);
        }

        .quick-actions-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 26, 0.6);
          backdrop-filter: blur(4px);
          z-index: -1;
        }

        .quick-actions-menu {
          position: absolute;
          bottom: 70px;
          right: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-end;
          z-index: -1;
        }

        .quick-action-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: none;
          border: none;
          opacity: 0;
          transform: translateY(20px);
          animation: slideUpAction 0.3s ease forwards;
          animation-delay: calc(var(--index) * 0.05s);
        }

        @keyframes slideUpAction {
          to { opacity: 1; transform: translateY(0); }
        }

        .action-label {
          background: var(--color-bg-secondary);
          color: white;
          padding: 4px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
        }

        .action-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: var(--shadow-md);
          transition: transform 0.2s ease;
        }

        .quick-action-item:active .action-icon {
          transform: scale(0.9);
        }

        @media (min-width: 769px) {
          .quick-actions-container {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
