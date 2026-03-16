import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { 
  Coffee, 
  Tv, 
  Wind, 
  Trash2, 
  CheckCircle2, 
  Send, 
  ChevronRight,
  User,
  ShieldCheck,
  Smartphone
} from 'lucide-react'

const INCIDENT_TYPES = [
  { id: 'limpieza', label: 'Limpieza / Amenidades', icon: Trash2, description: 'Toallas, jabón, limpieza de habitación' },
  { id: 'mantenimiento', label: 'Avería Técnica', icon: Tv, description: 'TV, Aire acondicionado, Luces, Wifi' },
  { id: 'servicio', label: 'Servicio de Habitaciones', icon: Coffee, description: 'Pedido de comida, agua, almohadas' },
  { id: 'otro', label: 'Otros / Emergencias', icon: CheckCircle2, description: 'Cualquier otra solicitud' }
]

export default function GuestPortal() {
  const { room } = useParams()
  const toast = useToast()
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType) return
    setIsSubmitting(true)

    try {
      const typeLabel = INCIDENT_TYPES.find(t => t.id === selectedType)?.label
      const finalLocation = room ? `Habitación ${room}` : 'Ubicación Huésped'
      
      const { data: incidentData, error } = await supabase
        .from('incidencias')
        .insert([{
          title: `[HUÉSPED] ${typeLabel}`,
          location: finalLocation,
          priority: 'high',
          status: 'pendiente',
          descripcion: description || `Solicitud directa de huésped desde portal QR.`,
          reporter_id: 'guest_user' // Identificador especial o nulo si RLS lo permite
        }])
        .select()
        .single()

      if (error) throw error

      // Crear hilo de chat automático
      if (incidentData) {
        await supabase.from('canales').insert([{
          id: `inc_${incidentData.id}`,
          nombre: `Huésped: Hab ${room || '?' }`,
          tipo: 'incidencia',
          descripcion: `Atención directa al huésped en ${finalLocation}`
        }])
      }

      setSubmitted(true)
      toast.success('Solicitud enviada. En breve le atenderemos.')
    } catch (error) {
      console.error('Error al enviar solicitud:', error)
      toast.error('No se pudo enviar la solicitud. Inténtelo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="guest-portal submitted">
        <div className="success-content">
          <div className="success-icon">
            <CheckCircle2 size={80} color="var(--primary-main)" />
          </div>
          <h1>¡Solicitud Recibida!</h1>
          <p>Hemos notificado a nuestro equipo. Le atenderemos en la habitación <strong>{room}</strong> lo antes posible.</p>
          <button onClick={() => setSubmitted(false)} className="return-btn">
            Nueva Solicitud
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="guest-portal">
      <header className="guest-header">
        <div className="logo-container">
          <ShieldCheck size={32} color="var(--primary-main)" />
          <span>V-Suite Guest</span>
        </div>
        <div className="room-indicator">
          <User size={16} />
          <span>Habitación {room || 'No detectada'}</span>
        </div>
      </header>

      <main className="guest-main">
        <section className="welcome">
          <h1>¿Cómo podemos ayudarle?</h1>
          <p>Seleccione el tipo de solicitud para que nuestro equipo le atienda rápidamente.</p>
        </section>

        <form onSubmit={handleSubmit} className="guest-form">
          <div className="type-grid">
            {INCIDENT_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`type-card ${selectedType === type.id ? 'active' : ''}`}
                onClick={() => setSelectedType(type.id)}
              >
                <type.icon size={28} />
                <div className="type-info">
                  <span className="type-label">{type.label}</span>
                  <span className="type-desc">{type.description}</span>
                </div>
                {selectedType === type.id && <CheckCircle2 className="check-indicator" size={20} />}
              </button>
            ))}
          </div>

          <div className="desc-section">
            <label>Detalles adicionales (opcional)</label>
            <textarea
              placeholder="Ej: Necesito dos toallas más, mi aire hace ruido..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={!selectedType || isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : (
              <>
                Enviar Solicitud
                <Send size={20} />
              </>
            )}
          </button>
        </form>
      </main>

      <footer className="guest-footer">
        <div className="footer-info">
          <Smartphone size={16} />
          <span>Portal de Atención Digital V-Suite</span>
        </div>
      </footer>

      <style>{`
        .guest-portal {
          min-height: 100vh;
          background: #f8fafc;
          padding: 20px;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
        }

        .guest-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 1.2rem;
          color: var(--primary-main);
        }

        .room-indicator {
          background: #fff;
          padding: 8px 16px;
          border-radius: 100px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .welcome h1 {
          font-size: 1.8rem;
          margin-bottom: 10px;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .welcome p {
          color: #64748b;
          margin-bottom: 30px;
        }

        .type-grid {
          display: grid;
          gap: 15px;
          margin-bottom: 30px;
        }

        .type-card {
          display: flex;
          align-items: center;
          gap: 20px;
          background: #fff;
          padding: 20px;
          border-radius: 16px;
          border: 2px solid transparent;
          text-align: left;
          transition: all 0.2s ease;
          position: relative;
          cursor: pointer;
        }

        .type-card.active {
          border-color: var(--primary-main);
          background: #f0f7ff;
        }

        .type-info {
          display: flex;
          flex-direction: column;
        }

        .type-label {
          font-weight: 700;
          font-size: 1.05rem;
        }

        .type-desc {
          font-size: 0.85rem;
          color: #64748b;
        }

        .check-indicator {
          position: absolute;
          right: 20px;
          color: var(--primary-main);
        }

        .desc-section label {
          display: block;
          margin-bottom: 10px;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .desc-section textarea {
          width: 100%;
          min-height: 100px;
          padding: 15px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          resize: vertical;
          margin-bottom: 30px;
        }

        .submit-btn {
          width: 100%;
          background: var(--primary-main);
          color: #fff;
          padding: 18px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 1.1rem;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
          border: none;
        }

        .submit-btn:disabled {
          background: #cbd5e1;
          box-shadow: none;
        }

        .guest-portal.submitted {
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
        }

        .success-content h1 {
          margin-top: 20px;
          font-size: 2rem;
        }

        .success-content p {
          margin: 15px 0 30px;
          color: #64748b;
        }

        .return-btn {
          background: #f1f5f9;
          padding: 12px 24px;
          border-radius: 100px;
          font-weight: 600;
          border: none;
        }

        .guest-footer {
          margin-top: 50px;
          text-align: center;
          padding-bottom: 20px;
        }

        .footer-info {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 0.8rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}
