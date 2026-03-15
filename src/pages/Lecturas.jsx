import { useState, useEffect } from 'react'
import { Activity, Plus, X, ArrowUpRight, ArrowDownRight, Droplets, Flame, Zap, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Lecturas() {
  const { profile } = useAuth()
  const [lecturas, setLecturas] = useState([])
  const [contadores, setContadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [newReading, setNewReading] = useState({
    contador_id: '',
    valor: '',
    fecha: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchContadores(), fetchLecturas()])
    setLoading(false)
  }

  const fetchContadores = async () => {
    try {
      const { data, error } = await supabase.from('contadores').select('*').order('nombre')
      if (error) throw error
      setContadores(data)
      if (data.length > 0 && !newReading.contador_id) {
        setNewReading(prev => ({ ...prev, contador_id: data[0].id }))
      }
    } catch (error) { console.error('Error fetching meters:', error) }
  }

  const fetchLecturas = async () => {
    try {
      const { data, error } = await supabase
        .from('lecturas')
        .select(`
          *,
          perfiles:creado_por (nombre),
          contadores (nombre, tipo)
        `)
        .order('fecha', { ascending: false })
      
      if (error) throw error
      
      // Procesar datos para añadir el cálculo de consumo por contador_id
      const processed = data.map((curr, idx) => {
        const previous = data.slice(idx + 1).find(l => l.contador_id === curr.contador_id)
        const consumo = previous ? curr.valor - previous.valor : 0
        return { ...curr, consumo }
      })
      
      setLecturas(processed)
    } catch (error) {
      console.error('Error fetching readings:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    
    const selectedContador = contadores.find(c => c.id === newReading.contador_id)
    if (!selectedContador) return

    try {
      const { error } = await supabase
        .from('lecturas')
        .insert([{
          ...newReading,
          tipo: selectedContador.tipo,
          valor: parseFloat(newReading.valor),
          creado_por: profile.id
        }])

      if (error) {
        if (error.code === '23505') throw new Error('Ya existe una lectura para este contador en la fecha seleccionada.')
        throw error
      }

      setMsg({ type: 'success', text: 'Lectura registrada correctamente.' })
      setIsAdding(false)
      setNewReading({ ...newReading, valor: '' })
      fetchLecturas()
    } catch (error) {
      setMsg({ type: 'error', text: error.message })
    }
  }

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'agua': return <Droplets className="text-info" size={20} />
      case 'gas': return <Flame className="text-warning" size={20} />
      case 'luz': return <Zap className="text-accent" size={20} />
      default: return <Activity size={20} />
    }
  }

  const getUnit = (tipo) => {
    switch (tipo) {
      case 'agua': return 'm³'
      case 'gas': return 'm³'
      case 'luz': return 'kWh'
      default: return ''
    }
  }

  return (
    <div className="lecturas-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lecturas de Suministros</h1>
          <p className="page-subtitle">Control y comparación de consumo diario</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          <Plus size={20} />
          <span>Nueva Lectura</span>
        </button>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'success' ? 'success' : 'danger'} mb-lg`}>
          <span>{msg.text}</span>
        </div>
      )}

      <div className="summary-grid mb-xl">
        {contadores.map(contador => {
          const meterReadings = lecturas.filter(l => l.contador_id === contador.id)
          const last = meterReadings[0]
          
          return (
            <div key={contador.id} className="glass-card stat-card">
              <div className="stat-header">
                <div className="stat-icon-wrapper">
                  {getIcon(contador.tipo)}
                </div>
                <div className="flex flex-column">
                  <span className="stat-label">{contador.tipo.toUpperCase()}</span>
                  <span className="text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis" style={{maxWidth: '120px'}} title={contador.nombre}>
                    {contador.nombre}
                  </span>
                </div>
              </div>
              <div className="stat-value">
                {last ? last.valor.toLocaleString() : '---'} 
                <span className="stat-unit">{getUnit(contador.tipo)}</span>
              </div>
              {last && last.consumo > 0 && (
                <div className="stat-footer mt-xs">
                  <span className="text-xs text-muted">Consumo actual: </span>
                  <span className="font-bold text-accent">{last.consumo.toFixed(2)} {getUnit(contador.tipo)}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="glass-card table-panel">
        <div className="panel-header border-b">
          <div className="flex items-center gap-md">
            <Calendar size={20} className="text-accent" />
            <h3>Historial de Mediciones</h3>
          </div>
        </div>
        <div className="panel-body p-none">
          {loading ? (
            <div className="loading-state p-xl text-center">
              <Activity className="animate-spin text-accent mb-md" size={32} />
              <p>Cargando lecturas...</p>
            </div>
          ) : (
            <table className="config-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Contador</th>
                  <th>Tipo</th>
                  <th>Valor Contador</th>
                  <th>Consumo</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {lecturas.length > 0 ? lecturas.map(l => (
                  <tr key={l.id}>
                    <td><strong>{new Date(l.fecha).toLocaleDateString()}</strong></td>
                    <td><span className="font-bold">{l.contadores?.nombre || '---'}</span></td>
                    <td>
                      <div className="flex items-center gap-sm capitalize">
                        {getIcon(l.tipo)}
                        {l.tipo}
                      </div>
                    </td>
                    <td>{l.valor.toLocaleString()} {getUnit(l.tipo)}</td>
                    <td>
                      {l.consumo > 0 ? (
                        <div className="flex items-center gap-xs text-danger font-bold">
                          <ArrowUpRight size={14} />
                          {l.consumo.toFixed(2)} {getUnit(l.tipo)}
                        </div>
                      ) : (
                        <span className="text-muted text-xs">Primer registro</span>
                      )}
                    </td>
                    <td className="text-muted text-sm">{l.perfiles?.nombre || '---'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="text-center p-xl text-muted">No hay lecturas registradas aún.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="modal-overlay" onClick={() => setIsAdding(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar Lectura</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsAdding(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="input-group mb-md">
                  <label className="input-label">Seleccionar Contador</label>
                  <select 
                    className="select" 
                    value={newReading.contador_id} 
                    onChange={e => setNewReading({...newReading, contador_id: e.target.value})}
                    required
                  >
                    {contadores.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>
                    ))}
                  </select>
                </div>
                <div className="grid-2 gap-md">
                  <div className="input-group">
                    <label className="input-label">Fecha</label>
                    <input 
                      type="date" 
                      className="input" 
                      value={newReading.fecha}
                      onChange={e => setNewReading({...newReading, fecha: e.target.value})}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Valor Actual</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="input" 
                      placeholder="0.00"
                      value={newReading.valor}
                      onChange={e => setNewReading({...newReading, valor: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsAdding(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Lectura</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-lg); }
        .stat-header { display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-md); }
        .stat-icon-wrapper { padding: var(--spacing-sm); background: rgba(255, 255, 255, 0.05); border-radius: var(--radius-md); }
        .stat-label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.05em; }
        .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--color-text); }
        .stat-unit { font-size: 1rem; color: var(--color-text-muted); margin-left: var(--spacing-xs); font-weight: 500; }
        
        .loading-state { min-height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
