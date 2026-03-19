import { useState, useEffect } from 'react'
import { Activity, Plus, X, ArrowUpRight, ArrowDownRight, Droplets, Flame, Zap, Calendar, Download, FileSpreadsheet, FileText, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Skeleton } from '../components/ui/Skeleton'

export default function Lecturas() {
  const { profile, activeHotelId } = useAuth()
  const [lecturas, setLecturas] = useState([])
  const [contadores, setContadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [filterType, setFilterType] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editingReading, setEditingReading] = useState(null)
  const [newReading, setNewReading] = useState({
    contador_id: '',
    valor: '',
    fecha: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [activeHotelId])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchContadores(), fetchLecturas()])
    setLoading(false)
  }

  const fetchContadores = async () => {
    try {
      let query = supabase.from('contadores').select('*').order('nombre')
      if (activeHotelId) query = query.eq('hotel_id', activeHotelId)
      const { data, error } = await query
      if (error) throw error
      setContadores(data || [])
      if (data && data.length > 0 && !newReading.contador_id) {
        setNewReading(prev => ({ ...prev, contador_id: data[0].id }))
      }
    } catch (error) { console.error('Error fetching meters:', error) }
  }

  const fetchLecturas = async () => {
    try {
      let query = supabase
        .from('lecturas')
        .select(`
          *,
          perfiles:creado_por (nombre),
          contadores (nombre, tipo)
        `)
        .order('fecha', { ascending: false })
      
      if (activeHotelId) query = query.eq('hotel_id', activeHotelId)

      const { data, error } = await query
      
      if (error) throw error
      
      // Procesar datos para añadir el cálculo de consumo por contador_id
      const processed = data.map((curr, idx) => {
        const previous = data.slice(idx + 1).find(l => l.contador_id === curr.contador_id)
        const consumo = previous ? curr.valor - previous.valor : 0
        return { ...curr, consumo }
      })
      
      setLecturas(processed || [])
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
      const valorNumerico = parseFloat(newReading.valor)
      
      // 1. Buscar la lectura anterior para este contador
      const { data: lastReadings, error: fetchError } = await supabase
        .from('lecturas')
        .select('valor')
        .eq('contador_id', newReading.contador_id)
        .order('fecha', { ascending: false })
        .limit(1)

      if (fetchError) throw fetchError

      let isAnomaly = false
      let alertMsg = ''
      
      if (lastReadings && lastReadings.length > 0) {
        const lastValue = lastReadings[0].valor
        const currentConsumo = valorNumerico - lastValue
        
        // Calcular consumo promedio (simplificado: comparamos con el último consumo conocido)
        // Buscamos el penúltimo para ver el consumo anterior
        const { data: prevReadings } = await supabase
          .from('lecturas')
          .select('valor')
          .eq('contador_id', newReading.contador_id)
          .order('fecha', { ascending: false })
          .range(1, 1)

        if (prevReadings && prevReadings.length > 0) {
          const prevConsumo = lastValue - prevReadings[0].valor
          // Si el consumo actual es un 30% superior al anterior
          if (prevConsumo > 0 && currentConsumo > prevConsumo * 1.3) {
            isAnomaly = true
            alertMsg = `Consumo inusual detectado: +${Math.round(((currentConsumo/prevConsumo)-1)*100)}% respecto al periodo anterior.`
          }
        } else if (currentConsumo > 0) {
          // Si no hay historial suficiente, pero el consumo es muy alto (valor arbitrario para primer chequeo)
          // Podríamos omitir o usar una lógica base. Por ahora, solo si hay historial.
        }
      }

      // 2. Insertar la lectura
      const readPayload: any = {
        ...newReading,
        valor: valorNumerico,
        creado_por: profile.id,
        notas: isAnomaly ? `[AUTO-ALERTA] ${alertMsg}` : ''
      }
      if (activeHotelId) readPayload.hotel_id = activeHotelId;

      const { error: insertError } = await supabase
        .from('lecturas')
        .insert([readPayload])

      if (insertError) {
        if (insertError.code === '23505') throw new Error('Ya existe una lectura para este contador en la fecha seleccionada.')
        throw insertError
      }

      // 3. Si hay anomalía, crear incidencia automática
      if (isAnomaly) {
        const anonPayload: any = {
          title: `[ALERTA CONSUMO] ${selectedContador.nombre}`,
          location: selectedContador.ubicacion || 'General',
          priority: 'high',
          status: 'pending',
          reporter_id: profile.id,
          descripcion: `Detección automática de consumo excesivo de ${selectedContador.tipo}. ${alertMsg}`
        }
        if (activeHotelId) anonPayload.hotel_id = activeHotelId;

        await supabase.from('incidencias').insert([anonPayload])
      }

      setMsg({ 
        type: isAnomaly ? 'warning' : 'success', 
        text: isAnomaly ? `Lectura guardada. SE HA GENERADO UNA ALERTA: ${alertMsg}` : 'Lectura registrada correctamente.' 
      })
      
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

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar esta lectura?')) return
    try {
      const { error } = await supabase
        .from('lecturas')
        .delete()
        .eq('id', id)
        .eq('hotel_id', activeHotelId)
      
      if (error) throw error
      setMsg({ type: 'success', text: 'Lectura eliminada correctamente.' })
      fetchLecturas()
    } catch (error) {
      setMsg({ type: 'error', text: 'Error al eliminar: ' + error.message })
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingReading) return
    try {
      const { error } = await supabase
        .from('lecturas')
        .update({
          valor: parseFloat(editingReading.valor),
          fecha: editingReading.fecha,
          contador_id: editingReading.contador_id
        })
        .eq('id', editingReading.id)
        .eq('hotel_id', activeHotelId)
      if (error) throw error
      setMsg({ type: 'success', text: 'Lectura actualizada correctamente.' })
      setEditingReading(null)
      fetchLecturas()
    } catch (error) {
      setMsg({ type: 'error', text: 'Error al actualizar: ' + error.message })
    }
  }


  const exportToCSV = () => {
    const headers = ['Fecha', 'Contador', 'Tipo', 'Valor Contador', 'Consumo (Último Periodo)', 'Unidad', 'Registrado por']
    
    const csvData = lecturas.map(l => [
      new Date(l.fecha).toLocaleDateString(),
      `"${l.contadores?.nombre || '---'}"`,
      l.tipo,
      l.valor,
      l.consumo > 0 ? l.consumo.toFixed(2) : 0,
      getUnit(l.tipo),
      `"${l.perfiles?.nombre || '---'}"`
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `Suministros_VSuite_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowExportMenu(false)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Reporte de Consumos y Suministros - V-Suite', 14, 22)
    
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString()}`, 14, 30)

    const tableData = lecturas.map(l => [
      new Date(l.fecha).toLocaleDateString(),
      l.contadores?.nombre || '---',
      l.tipo.charAt(0).toUpperCase() + l.tipo.slice(1),
      `${l.valor.toLocaleString()} ${getUnit(l.tipo)}`,
      l.consumo > 0 ? `${l.consumo.toFixed(2)} ${getUnit(l.tipo)}` : 'Primer registro',
      l.perfiles?.nombre || '---'
    ])

    autoTable(doc, {
      startY: 36,
      head: [['Fecha', 'Contador', 'Tipo', 'Valor', 'Consumo', 'Registrado por']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 9 },
      margin: { top: 36 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw !== 'Primer registro') {
             data.cell.styles.textColor = [239, 68, 68];
             data.cell.styles.fontStyle = 'bold';
          } else {
             data.cell.styles.textColor = [156, 163, 175];
          }
        }
      }
    })

    doc.save(`Suministros_VSuite_${new Date().toISOString().split('T')[0]}.pdf`)
    setShowExportMenu(false)
  }

  return (
    <div className="lecturas-page animate-fade-in">
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">
             <Activity className="text-accent" />
             Lecturas de Suministros
          </h1>
          <p className="v-page-subtitle">Control y comparación de consumo diario</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          <Plus size={20} />
          <span>Nueva Lectura</span>
        </button>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'success' ? 'success' : msg.type === 'warning' ? 'warning' : 'danger'} mb-lg animate-slide-in`}>
          <div className="flex items-center gap-md">
            {msg.type === 'warning' && <Activity className="text-warning animate-pulse" size={20} />}
            <span>{msg.text}</span>
          </div>
        </div>
      )}

      <div className="v-stats-grid">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="v-glass-card v-stat-card">
              <Skeleton className="h-3 w-24 mb-xs" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-40 mt-xs" />
            </div>
          ))
        ) : contadores.map(contador => {
          const meterReadings = lecturas.filter(l => l.contador_id === contador.id)
          const last = meterReadings[0]
          
          return (
            <div key={contador.id} className="v-glass-card v-stat-card">
              <div className="flex justify-between items-start mb-sm">
                <span className="v-stat-label">{contador.tipo}</span>
                <div className="p-xs bg-white/5 rounded-lg">
                  {getIcon(contador.tipo)}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted font-bold uppercase mb-xs truncate" title={contador.nombre}>{contador.nombre}</span>
                <div className="v-stat-value">
                  {last ? last.valor.toLocaleString() : '---'} 
                  <span className="text-sm text-muted ml-xs font-medium">{getUnit(contador.tipo)}</span>
                </div>
              </div>
              {last && last.consumo > 0 && (
                <div className="v-stat-footer flex items-center gap-xs">
                  <span className="text-accent font-bold">+{last.consumo.toFixed(2)}</span>
                  <span>{getUnit(contador.tipo)} registrados hoy</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Barra de filtros */}
      <div className="v-glass-card mb-lg px-lg py-md flex items-center gap-md flex-wrap">
        <div className="flex items-center gap-sm">
          <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Filtrar por Tipo:</span>
          {(['all', 'agua', 'gas', 'luz'] as const).map(t => (
            <button key={t} 
              className={`btn btn-sm ${filterType === t ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterType(t)}
            >
              {t === 'all' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-sm ml-auto">
          <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Rango:</span>
          <input type="date" className="input" style={{ width: '150px', padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
            value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-muted">–</span>
          <input type="date" className="input" style={{ width: '150px', padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
            value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {(dateFrom || dateTo || filterType !== 'all') && (
            <button className="btn btn-ghost btn-sm text-danger" onClick={() => { setDateFrom(''); setDateTo(''); setFilterType('all'); }}>
              <X size={14} /> 
            </button>
          )}
        </div>
      </div>

      <div className="v-table-container">
        <div className="panel-header border-b flex justify-between items-center px-lg py-md">
          <div className="flex items-center gap-md">
            <Calendar size={20} className="text-accent" />
            <h3 className="m-0 font-bold">Historial de Mediciones</h3>
          </div>
          <div className="relative">
            <button 
              className="btn btn-secondary btn-sm flex items-center gap-xs"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Exportar Lecturas"
            >
              <Download size={14} />
              <span>Exportar</span>
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-sm w-44 v-glass-card p-none rounded-lg shadow-xl overflow-hidden z-20 animate-fade-in">
                <button 
                  className="w-full text-left px-md py-sm hover:bg-white/5 flex items-center gap-sm transition-colors text-xs"
                  onClick={exportToCSV}
                >
                  <FileSpreadsheet size={14} className="text-success" />
                  Descargar CSV
                </button>
                <button 
                  className="w-full text-left px-md py-sm hover:bg-white/5 flex items-center gap-sm transition-colors text-xs border-t border-white/5"
                  onClick={exportToPDF}
                >
                  <FileText size={14} className="text-danger" />
                  Descargar PDF
                </button>
              </div>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="p-xl space-y-md">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <table className="v-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Contador</th>
                <th>Tipo</th>
                <th>Valor Contador</th>
                <th>Consumo</th>
                <th>Registrado por</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = lecturas.filter(l => {
                  if (filterType !== 'all' && l.tipo !== filterType) return false
                  if (dateFrom && l.fecha < dateFrom) return false
                  if (dateTo && l.fecha > dateTo) return false
                  return true
                })
                return filtered.length > 0 ? filtered.map(l => (
                <tr key={l.id} className={l.notas?.includes('[AUTO-ALERTA]') ? 'bg-warning/10 transition-colors' : ''}>
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
                  <td>
                    <div className="flex items-center justify-center gap-xs">
                      <button className="btn-icon btn-ghost btn-sm" title="Editar" onClick={() => setEditingReading({ id: l.id, valor: l.valor, fecha: l.fecha, contador_id: l.contador_id })}>
                        <Edit2 size={14} className="text-accent" />
                      </button>
                      <button className="btn-icon btn-ghost btn-sm" title="Eliminar" onClick={() => handleDelete(l.id)}>
                        <Trash2 size={14} className="text-danger opacity-70" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="text-center p-xl text-muted">No hay lecturas para los filtros seleccionados.</td>
                </tr>
              )
              })()}
            </tbody>
          </table>
        )}
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

      {/* Modal Editar Lectura */}
      {editingReading && (
        <div className="modal-overlay" onClick={() => setEditingReading(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Lectura</h2>
              <button className="btn-icon btn-ghost" onClick={() => setEditingReading(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="input-group mb-md">
                  <label className="input-label">Contador</label>
                  <select
                    className="select"
                    value={editingReading.contador_id}
                    onChange={e => setEditingReading({...editingReading, contador_id: e.target.value})}
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
                      value={editingReading.fecha}
                      onChange={e => setEditingReading({...editingReading, fecha: e.target.value})}
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
                      value={editingReading.valor}
                      onChange={e => setEditingReading({...editingReading, valor: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingReading(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  )
}
