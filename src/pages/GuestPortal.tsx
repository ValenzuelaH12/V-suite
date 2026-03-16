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
          title: `[V-NEXUS] ${typeLabel}`,
          location: finalLocation,
          priority: 'high',
          status: 'pendiente',
          descripcion: `[SOLICITUD HUÉSPED] - ${description || 'Sin descripción adicional.'}`,
        }])
        .select()

      if (error) {
        console.error('Error insertando incidencia:', error)
        throw error
      }

      // Crear hilo de chat automático si tenemos el ID (puede fallar el select por RLS)
      const incident = incidentData?.[0]
      if (incident) {
        const { error: chatError } = await supabase.from('canales').insert([{
          id: `inc_${incident.id}`,
          nombre: `Huésped: Hab ${room || '?' }`,
          descripcion: `Atención directa al huésped en ${finalLocation}`
        }])
        if (chatError) console.error('Error creando canal de chat:', chatError)
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
          <div className="success-icon-wrapper">
            <CheckCircle2 size={64} />
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
          <div className="logo-icon-wrapper">
            <ShieldCheck size={24} color="#6366f1" />
          </div>
          <span>V-Suite <span style={{color: '#6366f1'}}>Nexus</span></span>
        </div>
        <div className="room-indicator">
          <User size={16} />
          <span>Habitación {room || 'No detectada'}</span>
        </div>
      </header>

      <main className="guest-main">
        <section className="welcome">
          <h1>¿Cómo podemos ayudarle?</h1>
          <p>Seleccione el tipo de solicitud para asistencia inmediata.</p>
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
                <div className="card-icon">
                  <type.icon size={28} />
                </div>
                <div className="type-info">
                  <span className="type-label">{type.label}</span>
                  <span className="type-desc">{type.description}</span>
                </div>
                {selectedType === type.id && (
                  <div className="check-indicator">
                    <CheckCircle2 size={24} />
                  </div>
                )}
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
            {isSubmitting ? (
              <span className="spinner-small"></span>
            ) : (
              <>
                <span>Enviar Solicitud</span>
                <Send size={20} />
              </>
            )}
          </button>
        </form>
      </main>

      <footer className="guest-footer">
        <div className="footer-info">
          <Smartphone size={16} />
          <span>Portal de Atención Digital V-Suite Nexus</span>
        </div>
      </footer>

      <style>{`
        .guest-portal {
          min-height: 100vh;
          background: #0a0a0f;
          padding: 24px;
          font-family: 'Outfit', 'Inter', sans-serif;
          color: #f8fafc;
          position: relative;
          overflow-x: hidden;
        }

        .guest-portal::before {
          content: '';
          position: fixed;
          top: -10%;
          right: -10%;
          width: 40%;
          height: 40%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
          z-index: 0;
          pointer-events: none;
        }

        .guest-portal::after {
          content: '';
          position: fixed;
          bottom: -10%;
          left: -10%;
          width: 50%;
          height: 50%;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%);
          z-index: 0;
          pointer-events: none;
        }

        .guest-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 48px;
          position: relative;
          z-index: 10;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 800;
          font-size: 1.4rem;
          letter-spacing: -0.02em;
        }

        .logo-icon-wrapper {
          width: 40px;
          height: 40px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
        }

        .room-indicator {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          padding: 10px 20px;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #a5b4fc;
        }

        .guest-main {
          position: relative;
          z-index: 10;
          max-width: 600px;
          margin: 0 auto;
        }

        .welcome {
          text-align: center;
          margin-bottom: 40px;
        }

        .welcome h1 {
          font-size: 2.2rem;
          font-weight: 800;
          margin-bottom: 12px;
          line-height: 1.2;
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .welcome p {
          color: #94a3b8;
          font-size: 1.1rem;
        }

        .type-grid {
          display: grid;
          gap: 16px;
          margin-bottom: 32px;
        }

        .type-card {
          display: flex;
          align-items: center;
          gap: 20px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          padding: 24px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          text-align: left;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          cursor: pointer;
          width: 100%;
        }

        .type-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(99, 102, 241, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
        }

        .type-card.active {
          background: rgba(99, 102, 241, 0.1);
          border-color: #6366f1;
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.1);
        }

        .card-icon {
          width: 56px;
          height: 56px;
          background: rgba(15, 15, 26, 0.6);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6366f1;
          transition: all 0.3s ease;
        }

        .type-card.active .card-icon {
          background: #6366f1;
          color: white;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
        }

        .type-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .type-label {
          font-weight: 700;
          font-size: 1.15rem;
          color: #f8fafc;
          margin-bottom: 4px;
        }

        .type-desc {
          font-size: 0.9rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        .check-indicator {
          color: #6366f1;
          background: white;
          border-radius: 50%;
          animation: scaleIn 0.3s ease;
        }

        .desc-section {
          margin-bottom: 32px;
        }

        .desc-section label {
          display: block;
          margin-bottom: 12px;
          font-weight: 600;
          font-size: 1rem;
          color: #cbd5e1;
          padding-left: 8px;
        }

        .desc-section textarea {
          width: 100%;
          min-height: 120px;
          padding: 20px;
          background: rgba(15, 15, 26, 0.6);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 1rem;
          font-family: inherit;
          transition: all 0.3s ease;
          resize: none;
        }

        .desc-section textarea:focus {
          outline: none;
          border-color: #6366f1;
          background: rgba(15, 15, 26, 0.8);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #fff;
          padding: 20px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 1.2rem;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          box-shadow: 0 8px 24px rgba(79, 70, 229, 0.3);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(79, 70, 229, 0.4);
          filter: brightness(1.1);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          background: #1e1e2d;
          color: #4b5563;
          box-shadow: none;
          cursor: not-allowed;
        }

        .guest-portal.submitted {
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
        }

        .success-content {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          padding: 60px 40px;
          border-radius: 40px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          max-width: 440px;
          animation: slideInUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .success-icon-wrapper {
          width: 120px;
          height: 120px;
          background: rgba(34, 197, 94, 0.1);
          border-radius: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
          color: #22c55e;
          box-shadow: 0 0 40px rgba(34, 197, 94, 0.2);
        }

        .success-content h1 {
          font-size: 2.4rem;
          font-weight: 800;
          margin-bottom: 20px;
          color: white;
        }

        .success-content p {
          color: #94a3b8;
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 40px;
        }

        .return-btn {
          background: rgba(255, 255, 255, 0.05);
          color: white;
          padding: 16px 40px;
          border-radius: 100px;
          font-weight: 700;
          font-size: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .return-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.05);
        }

        .guest-footer {
          margin-top: 64px;
          text-align: center;
          padding-bottom: 32px;
          position: relative;
          z-index: 10;
        }

        .footer-info {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #4b5563;
          font-size: 0.9rem;
          font-weight: 600;
        }

        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes slideInUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (max-width: 480px) {
          .guest-portal { padding: 20px; }
          .welcome h1 { font-size: 1.8rem; }
          .type-card { padding: 20px; gap: 16px; }
          .card-icon { width: 48px; height: 48px; }
          .type-label { font-size: 1rem; }
        }
      `}</style>
    </div>
  )
}
