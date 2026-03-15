import { useState } from 'react'
import { Hotel, Mail, Lock, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message === 'Invalid login credentials' 
          ? 'Credenciales incorrectas' 
          : 'Error al iniciar sesión. Verifica tus datos.')
      }
    } catch (err) {
      setError('Ocurrió un error inesperado al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="bg-animated"></div>
      
      <div className="login-card glass-card">
        <div className="login-header">
          <div className="logo-container">
            <Hotel className="text-accent" size={40} />
          </div>
          <h1>HotelOps <span className="text-accent">Pro</span></h1>
          <p className="text-muted">Sistema de Gestión de Incidencias</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label className="input-label" htmlFor="email">Correo electrónico</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                className="input pl-xl"
                placeholder="usuario@hotel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group mt-md">
            <label className="input-label" htmlFor="password">Contraseña</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                className="input pl-xl"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-lg login-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-small"></span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>¿Problemas para ingresar? <a href="#" className="text-accent hover-underline">Contactar soporte</a></p>
        </div>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-md);
          position: relative;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          padding: var(--spacing-2xl);
          background: rgba(17, 17, 40, 0.7);
          box-shadow: var(--shadow-lg), 0 0 40px rgba(99, 102, 241, 0.1);
          animation: slideInUp 0.5s ease;
        }

        .login-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .logo-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: var(--radius-xl);
          background: var(--color-bg-glass);
          border: 1px solid var(--color-border);
          margin-bottom: var(--spacing-md);
          box-shadow: var(--shadow-glow);
          animation: float 6s ease-in-out infinite;
        }

        .login-header h1 {
          font-size: var(--font-size-2xl);
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: var(--spacing-xs);
        }

        .text-muted {
          color: var(--color-text-secondary);
        }

        .login-form {
          display: flex;
          flex-direction: column;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: var(--color-text-muted);
          transition: color var(--transition-fast);
        }

        .input:focus + .input-icon, 
        .input-with-icon:focus-within .input-icon {
          color: var(--color-accent);
        }

        .pl-xl {
          padding-left: 3rem !important;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-lg);
          font-size: var(--font-size-sm);
          font-weight: 500;
        }

        .alert-danger {
          background: var(--color-danger-light);
          color: #ff8a8a;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .login-btn {
          height: 48px;
          font-size: var(--font-size-md);
        }

        .spinner-small {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .login-footer {
          margin-top: var(--spacing-xl);
          text-align: center;
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
        }

        .hover-underline:hover {
          text-decoration: underline;
        }
        
        .mt-md { margin-top: var(--spacing-md); }
        .mt-lg { margin-top: var(--spacing-lg); }
        .w-full { width: 100%; }
      `}</style>
    </div>
  )
}
