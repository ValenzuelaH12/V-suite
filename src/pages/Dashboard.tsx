import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity,
  ArrowUpRight,
  MessageSquare,
  Printer,
  FileText,
  ChevronRight,
  X,
  RefreshCw,
  Check
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import jsPDF from 'jspdf'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState([])
  const [recentIncidents, setRecentIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [reportDates, setReportDates] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [myTasks, setMyTasks] = useState([])
  const [readingTrends, setReadingTrends] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // 1. Incidencias activas (pending / in-progress)
      const { count: activeIncidents } = await supabase
        .from('incidencias')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in-progress'])

      // 2. Resueltas hoy
      const { count: resolvedToday } = await supabase
        .from('incidencias')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved')
        .gte('created_at', today)

      // 3. Mantenimientos para hoy
      const { count: pendingMantenimiento } = await supabase
        .from('mantenimiento_preventivo')
        .select('*', { count: 'exact', head: true })
        .lte('proxima_fecha', today)

      // 4. Mensajes sin leer (simulado o real si existe la columna read)
      const { count: unreadMessages } = await supabase
        .from('mensajes')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)

      setStats([
        { id: 1, title: 'Incidencias Activas', value: activeIncidents || 0, icon: AlertTriangle, color: 'danger' },
        { id: 2, title: 'Resueltas Hoy', value: resolvedToday || 0, icon: CheckCircle, color: 'success' },
        { id: 3, title: 'Mantos. Pendientes', value: pendingMantenimiento || 0, icon: Clock, color: 'info' },
        { id: 4, title: 'Mensajes Nuevos', value: unreadMessages || 0, icon: MessageSquare, color: 'accent' },
      ])

      // Incidencias recientes
      const { data: incidents } = await supabase
        .from('incidencias')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      
      setRecentIncidents(incidents || [])

      // 5. Mis tareas pendientes
      const { data: myIncs } = await supabase
        .from('incidencias')
        .select('*')
        .eq('assigned_to', user?.id)
        .neq('status', 'resuelto')
        .limit(5)
      setMyTasks(myIncs || [])

      // 6. Tendencias de lecturas (todos los tipos)
      const { data: allContadores } = await supabase.from('contadores').select('id, tipo, nombre')
      if (allContadores && allContadores.length > 0) {
        const trendData = {}
        for (const c of allContadores) {
          const { data: readings } = await supabase
            .from('lecturas')
            .select('valor, fecha')
            .eq('contador_id', c.id)
            .order('fecha', { ascending: false })
            .limit(10)
          if (readings && readings.length > 1) {
            const processed = readings.map((curr, idx) => {
              const prev = readings[idx + 1]
              return { fecha: curr.fecha, consumo: prev ? curr.valor - prev.valor : 0 }
            }).reverse()
            if (!trendData[c.tipo]) trendData[c.tipo] = []
            trendData[c.tipo].push(...processed)
          }
        }
        setReadingTrends(trendData)
      }

    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateProReport = async () => {
    setIsGenerating(true)
    try {
      const { start, end } = reportDates
      
      // 1. Incidencias en el periodo
      const { data: incs } = await supabase
        .from('incidencias')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end + 'T23:59:59')

      // 2. Mantenimiento en el periodo
      const { data: maintenance } = await supabase
        .from('historial_mantenimiento')
        .select('*, tarea:tarea_id(titulo)')
        .gte('completado_el', start)
        .lte('completado_el', end + 'T23:59:59')

      // 3. Consumos (Agregado básico para el reporte)
      const { data: readings } = await supabase
        .from('lecturas')
        .select('*, contador:contador_id(nombre, tipo)')
        .gte('fecha', start)
        .lte('fecha', end)
        .order('fecha', { ascending: true })

      // Procesar consumos por tipo
      const consumos = readings?.reduce((acc, curr, idx, arr) => {
        const next = arr.find((r, i) => i > idx && r.contador_id === curr.contador_id)
        if (next) {
          const diff = next.valor - curr.valor
          acc[curr.contador.tipo] = (acc[curr.contador.tipo] || 0) + diff
        }
        return acc
      }, {})

      const doc = new jsPDF()
      const { default: autoTable } = await import('jspdf-autotable')

      // Diseño del PDF
      doc.setFillColor(10, 10, 26)
      doc.rect(0, 0, 210, 40, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.text('V-SUITE', 14, 25)
      doc.setFontSize(10)
      doc.text('REPORTE EJECUTIVO DE OPERACIONES', 14, 32)
      
      doc.setTextColor(100, 100, 100)
      doc.text(`Periodo: ${new Date(start).toLocaleDateString()} al ${new Date(end).toLocaleDateString()}`, 14, 48)
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 54)

      // KPIs
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(14)
      doc.text('Métricas Clave', 14, 70)
      
      const kpiData = [
        ['Incidencias Reportadas', incs?.length || 0],
        ['Incidencias Resueltas', incs?.filter(i => i.status === 'resolved').length || 0],
        ['Mantenimientos Ejecutados', maintenance?.length || 0],
        ['Eficiencia de Resolución', incs?.length ? Math.round((incs.filter(i => i.status === 'resolved').length / incs.length) * 100) + '%' : 'N/A']
      ]

      autoTable(doc, {
        startY: 75,
        head: [['KPI', 'Valor']],
        body: kpiData,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 10 }
      })

      let finalY = (doc as any).lastAutoTable.finalY + 15

      // Tabla de Consumos
      doc.text('Consumo de Suministros', 14, finalY)
      const consumosData = Object.entries(consumos || {}).map(([tipo, valor]) => [
        tipo.toUpperCase(),
        valor.toLocaleString() + (tipo === 'agua' ? ' m³' : tipo === 'luz' ? ' kWh' : ' m³')
      ])

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Suministro', 'Total Consumido']],
        body: consumosData.length ? consumosData : [['Sin datos', '0']],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 10 }
      })

      finalY = (doc as any).lastAutoTable.finalY + 15
      
      // Tabla de Incidencias por Zona
      doc.text('Distribución de Incidencias por Zona', 14, finalY)
      const zonesData = incs?.reduce((acc, curr) => {
        acc[curr.location] = (acc[curr.location] || 0) + 1
        return acc
      }, {})
      
      const zonesTableData = Object.entries(zonesData || {}).map(([zona, count]) => [zona, count])

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Zona / Habitación', 'Total Incidencias']],
        body: zonesTableData.length ? zonesTableData : [['Sin datos', '0']],
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 10 }
      })

      doc.save(`Reporte_VSuite_${start}_a_${end}.pdf`)
      setIsReportModalOpen(false)
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error al generar el reporte detallado.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="dashboard animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vista General</h1>
          <p className="page-subtitle">Resumen operativo en tiempo real</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsReportModalOpen(true)}>
          <FileText size={18} />
          <span>Generar Reporte Pro</span>
        </button>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.id} className="stat-card glass-card">
              <div className="stat-header">
                <span className="stat-title">{stat.title}</span>
                <div className={`stat-icon-wrapper text-${stat.color} bg-${stat.color}-light`}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="stat-body">
                <h3 className="stat-value">{stat.value}</h3>
                {stat.change && (
                  <span className={`stat-change ${stat.trend === 'up' ? 'text-success' : 'text-danger'}`}>
                    <ArrowUpRight size={14} className={stat.trend === 'down' ? 'rotate-90' : ''} />
                    {stat.change}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="dashboard-grid mt-xl">
        <div className="glass-card panel">
          <div className="panel-header border-b">
            <h3>Incidencias Recientes</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/incidencias')}>Ver todas</button>
          </div>
          
          <div className="panel-body">
            <ul className="incident-list">
              {recentIncidents.map((incident) => (
                <li key={incident.id} className="incident-item">
                  <div className="incident-status">
                    <div className={`priority-indicator priority-${incident.priority}`}></div>
                  </div>
                  
                  <div className="incident-content">
                    <div className="incident-top">
                      <span className="incident-id text-accent">ID: {incident.id}</span>
                      <span className="incident-time">{new Date(incident.created_at).toLocaleTimeString()}</span>
                    </div>
                    <h4 className="incident-title">{incident.title}</h4>
                    <div className="incident-bottom">
                      <span className="badge badge-neutral">Hab. {incident.location}</span>
                      <span className={`badge badge-${
                        incident.status === 'resolved' ? 'success' : 
                        incident.status === 'in-progress' ? 'warning' : 'danger'
                      }`}>
                        {incident.status === 'resolved' ? 'Resuelta' : 
                         incident.status === 'in-progress' ? 'En proceso' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
              {recentIncidents.length === 0 && (
                <div className="p-xl text-center text-muted">No hay incidencias registradas.</div>
              )}
            </ul>
          </div>
        </div>

        <div className="glass-card panel">
          <div className="panel-header border-b">
            <h3>Mis Tareas Pendientes</h3>
            <span className="badge badge-accent">{myTasks.length}</span>
          </div>
          <div className="panel-body">
            {myTasks.length > 0 ? (
              <ul className="incident-list">
                {myTasks.map(task => (
                  <li key={task.id} className="incident-item" onClick={() => navigate('/incidencias')}>
                    <div className="flex flex-column gap-xs">
                      <h4 className="incident-title">{task.title}</h4>
                      <div className="flex items-center gap-sm">
                        <span className="text-xs text-muted"><Clock size={10} /> {task.location}</span>
                        <span className={`badge-status ${task.priority}`}>{task.priority.toUpperCase()}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-xl text-center text-muted">No tienes tareas asignadas.</div>
            )}
          </div>
        </div>

        <div className="glass-card panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-header border-b">
            <h3>Tendencia de Consumo</h3>
          </div>
          <div className="panel-body p-lg" style={{ height: '320px' }}>
            {(() => {
              const typeColors = {
                luz: { border: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
                agua: { border: '#2dd4bf', bg: 'rgba(45,212,191,0.1)' },
                gas: { border: '#fbbf24', bg: 'rgba(251,191,36,0.1)' }
              }
              const trends = readingTrends || {}
              const allDates = [...new Set(Object.values(trends).flat().map(r => r.fecha))].sort()
              const labels = allDates.map(d => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))

              const datasets = Object.entries(typeColors)
                .filter(([tipo]) => trends[tipo] && trends[tipo].length > 0)
                .map(([tipo, colors]) => ({
                  label: tipo.charAt(0).toUpperCase() + tipo.slice(1),
                  data: allDates.map(d => {
                    const match = (trends[tipo] || []).find(r => r.fecha === d)
                    return match ? match.consumo : null
                  }),
                  borderColor: colors.border,
                  backgroundColor: colors.bg,
                  fill: true,
                  tension: 0.4,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  borderWidth: 2,
                  spanGaps: true
                }))

              if (datasets.length === 0) return (
                <div className="w-full h-full flex flex-column items-center justify-center text-muted">
                  <Activity size={32} className="mb-sm opacity-20" />
                  <p className="text-xs">Sin datos de consumo</p>
                </div>
              )

              return (
                <Line
                  data={{ labels, datasets }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { intersect: false, mode: 'index' as const },
                    plugins: {
                      legend: { position: 'top' as const, labels: { color: '#a0a0c0', font: { size: 12 }, padding: 16, usePointStyle: true } },
                      tooltip: { backgroundColor: 'rgba(15,15,35,0.95)', titleColor: '#e0e0f0', bodyColor: '#a0a0c0', padding: 12, cornerRadius: 8, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
                    },
                    scales: {
                      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b6b8d', font: { size: 11 } } },
                      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b6b8d', font: { size: 11 } }, beginAtZero: true }
                    }
                  }}
                />
              )
            })()}
          </div>
        </div>
      </div>

      {/* MODAL DE REPORTE PRO */}
      {isReportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsReportModalOpen(false)}>
          <div className="modal-content" style={{maxWidth: '500px'}} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-sm">
                <FileText className="text-accent" size={24} />
                <h2>Centro de Reportes Pro</h2>
              </div>
              <button className="btn-icon btn-ghost" onClick={() => setIsReportModalOpen(false)}><X size={20} /></button>
            </div>

            <div className="modal-body p-xl">
              <p className="text-sm text-muted mb-xl">
                Selecciona el rango de fechas para consolidar las métricas de mantenimiento, incidencias y suministros en un documento ejecutivo PDF.
              </p>
              
              <div className="grid-2 gap-md mb-xl">
                <div className="input-group">
                  <label className="input-label">Desde</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={reportDates.start} 
                    onChange={e => setReportDates({...reportDates, start: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Hasta</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={reportDates.end} 
                    onChange={e => setReportDates({...reportDates, end: e.target.value})}
                  />
                </div>
              </div>

              <div className="bg-accent/5 p-md rounded-md border-dashed-accent mb-xl">
                <h4 className="text-xs font-bold text-accent mb-sm uppercase">Resumen del Informe:</h4>
                <ul className="text-xs text-muted gap-xs flex flex-col">
                  <li className="flex items-center gap-xs"><Check size={12} className="text-success" /> Consolidado de Incidencias Totales</li>
                  <li className="flex items-center gap-xs"><Check size={12} className="text-success" /> Cálculo de Suministros (m³ / kWh)</li>
                  <li className="flex items-center gap-xs"><Check size={12} className="text-success" /> Registro de Mantenimiento Preventivo</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setIsReportModalOpen(false)}>Cancelar</button>
              <button 
                className="btn btn-primary ml-md" 
                onClick={generateProReport} 
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Printer size={16} />
                    <span>Descargar PDF Pro</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: var(--spacing-xl);
          animation: slideInUp 0.3s ease;
        }

        .page-title {
          font-size: var(--font-size-2xl);
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          color: var(--color-text-secondary);
          margin-top: var(--spacing-xs);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: var(--spacing-lg);
          animation: slideInUp 0.4s ease;
        }

        .stat-card {
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          position: relative;
          overflow: hidden;
        }

        .stat-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, var(--color-bg-glass), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.1);
        }

        .stat-card:hover::after {
          opacity: 1;
        }

        .stat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stat-title {
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          font-weight: 600;
        }

        .stat-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bg-danger-light { background: var(--color-danger-light); }
        .bg-success-light { background: var(--color-success-light); }
        .bg-info-light { background: var(--color-info-light); }
        .bg-accent-light { background: var(--color-accent-light); }
        
        .text-danger { color: #ff8a8a; } /* Más brillante para usar sobre fondos oscuros */
        .text-success { color: #4ade80; }
        .text-info { color: #2dd4bf; }
        .text-accent { color: var(--color-accent-hover); }

        .stat-body {
          display: flex;
          align-items: baseline;
          gap: var(--spacing-sm);
        }

        .stat-value {
          font-size: var(--font-size-2xl);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--color-text-primary);
        }

        .stat-change {
          display: flex;
          align-items: center;
          font-size: var(--font-size-xs);
          font-weight: 700;
        }

        .rotate-90 { transform: rotate(90deg); }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--spacing-lg);
          animation: slideInUp 0.5s ease;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-lg);
        }

        .panel-header h3 {
          font-size: var(--font-size-md);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-secondary);
        }

        .panel-body {
          padding: 0;
        }

        .align-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 250px;
        }

        .incident-list {
          display: flex;
          flex-direction: column;
        }

        .incident-item {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--color-border);
          transition: background var(--transition-fast);
          cursor: pointer;
        }

        .incident-item:hover {
          background: rgba(255, 255, 255, 0.03);
          transform: translateX(4px);
        }

        .incident-item:last-child {
          border-bottom: none;
        }

        .incident-status {
          padding-top: var(--spacing-sm);
        }

        .priority-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .priority-high { background: var(--color-danger); box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
        .priority-medium { background: var(--color-warning); }
        .priority-low { background: var(--color-info); }

        .incident-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .incident-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .incident-id {
          font-size: var(--font-size-xs);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .h-48 { height: 12rem; }
        .gap-xs { gap: var(--spacing-xs); }
        .rounded-t-sm { border-top-left-radius: 4px; border-top-right-radius: 4px; }

        .incident-time {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
        }

        .incident-title {
          font-size: var(--font-size-md);
          font-weight: 600;
        }

        .incident-bottom {
          display: flex;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-xs);
        }

        .mt-xl { margin-top: var(--spacing-xl); }

        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Estilos para impresión */
        @media print {
          .sidebar, .page-header, .stats-grid, .dashboard-grid, .hide-print {
            display: none !important;
          }
          .modal-overlay {
            position: static;
            background: white;
            padding: 0;
          }
          .modal-content {
            box-shadow: none;
            width: 100%;
            max-width: none;
            background: white;
            color: black;
          }
          .printable-area {
            color: black !important;
          }
          .text-muted { color: #666 !important; }
          .glass-card { background: white !important; border: 1px solid #eee !important; }
        }

        .report-modal { max-width: 900px; width: 95%; max-height: 90vh; overflow-y: auto; }
        .priority-badge { font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
        .priority-high { color: #ef4444; border: 1px solid #ef4444; }
        .priority-medium { color: #f59e0b; border: 1px solid #f59e0b; }
        .priority-low { color: #3b82f6; border: 1px solid #3b82f6; }
      `}</style>
    </div>
  )
}
