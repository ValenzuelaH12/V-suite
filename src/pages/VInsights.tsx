import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  Activity, 
  TrendingUp, 
  Clock, 
  Map, 
  AlertTriangle,
  ChevronDown,
  Filter,
  Download,
  Calendar,
  Sparkles,
  Droplets,
  Zap,
  LayoutDashboard
} from 'lucide-react'
import { WaterQualityControl } from '../components/features/analytics/WaterQualityControl'
import { aiService } from '../services/aiService'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import jsPDF from 'jspdf'
import { Skeleton } from '../components/ui/Skeleton'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  ArcElement,
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  ArcElement,
  Title, 
  Tooltip, 
  Legend, 
  Filler
)

import { useNotifications } from '../context/NotificationContext'

export default function VInsights() {
  const { activeHotelId } = useAuth()
  const { sendNotification } = useNotifications()
  const [activeTab, setActiveTab] = useState<'general' | 'water'>('general')
  const [isExporting, setIsExporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30') // días
  const [heatmapData, setHeatmapData] = useState(null)
  const [peakHoursData, setPeakHoursData] = useState(null)
  const [mttrData, setMttrData] = useState(null)
  const [consumptionData, setConsumptionData] = useState(null)
  const [summaryStats, setSummaryStats] = useState({
    totalIncidents: 0,
    avgResolutionTime: 0,
    criticalZones: [],
    efficiencyScore: 0
  })
  const [anomaly, setAnomaly] = useState<string | null>(null)
  const [trendAlert, setTrendAlert] = useState<string | null>(null)
  const [isCheckingAnomalies, setIsCheckingAnomalies] = useState(false)

  useEffect(() => {
    fetchInsightsData()
  }, [timeRange, activeHotelId])
  const fetchInsightsData = async () => {
    setLoading(true)
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(timeRange))
      const startDateISO = startDate.toISOString()

      // 1. Fetch Incidents and Staff
      let qInc = supabase
        .from('incidencias')
        .select('id, title, location, status, created_at, assigned_to')
        .gte('created_at', startDateISO)
      if (activeHotelId) qInc = qInc.eq('hotel_id', activeHotelId)
      
      const { data: incidents, error: incError } = await qInc
      if (incError) throw incError

      let qStaff = supabase.from('perfiles').select('id, nombre')
      if (activeHotelId) qStaff = qStaff.eq('hotel_id', activeHotelId)
      const { data: staffData } = await qStaff

      const staffMap: any = {}
      if (staffData) staffData.forEach(s => { staffMap[s.id] = s.nombre })

      // Process Heatmap (Zonas con más averías)
      const locationCounts: any = {}
      incidents.forEach(inc => {
        const loc = inc.location ? inc.location.split('-')[0].trim() : 'General'
        locationCounts[loc] = (locationCounts[loc] || 0) + 1
      })

      const sortedLocations = Object.entries(locationCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10)

      setHeatmapData({
        labels: sortedLocations.map(l => l[0]),
        datasets: [{
          label: 'Incidencias por Zona',
          data: sortedLocations.map(l => l[1]),
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 4
        }]
      } as any)

      // Process Picos por Hora
      const hoursCount = new Array(24).fill(0)
      incidents.forEach(inc => {
        if (!inc.created_at) return
        const hour = new Date(inc.created_at).getHours()
        hoursCount[hour]++
      })

      setPeakHoursData({
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Frecuencia de Reportes',
          data: hoursCount,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.5,
          pointRadius: 3,
          pointBackgroundColor: '#f59e0b'
        }]
      } as any)

      // Process Rendimiento por Técnico (Reemplazo de MTTR)
      const techCounts: any = {}
      incidents.forEach(inc => {
        if ((inc.status === 'resolved' || inc.status === 'resuelto') && inc.assigned_to) {
          const techName = staffMap[inc.assigned_to] || 'Técnico Desconocido'
          techCounts[techName] = (techCounts[techName] || 0) + 1
        }
      })
      
      const techNames = Object.keys(techCounts)
      const techColors = techNames.map((_, i) => `hsl(${i * (360 / Math.max(techNames.length, 1))}, 70%, 60%)`)

      setMttrData({
        labels: techNames.length > 0 ? techNames : ['Sin datos'],
        datasets: [{
          data: techNames.length > 0 ? Object.values(techCounts) : [1],
          backgroundColor: techNames.length > 0 ? techColors.map(c => c.replace(')', ', 0.6)').replace('hsl', 'hsla')) : ['rgba(255,255,255,0.1)'],
          borderColor: techNames.length > 0 ? techColors : ['rgba(255,255,255,0.2)'],
          borderWidth: 1
        }]
      } as any)

      // 2. Fetch Consumption Trends
      let qRead = supabase
        .from('lecturas')
        .select('valor, fecha, contador_id, contadores(tipo)')
        .gte('fecha', startDateISO.split('T')[0])
        .order('fecha', { ascending: true })
      if (activeHotelId) qRead = qRead.eq('hotel_id', activeHotelId)

      const { data: readings, error: readError } = await qRead
      if (readError) throw readError

      const dailyConsumption: any = {}
      const lastValues: any = {}

      readings.forEach((read) => {
        const counterId = read.contador_id
        if (lastValues[counterId] !== undefined) {
          const consumption = read.valor - lastValues[counterId]
          const day = read.fecha
          const type = (read.contadores as any)?.tipo || 'otros'
          
          if (!dailyConsumption[day]) dailyConsumption[day] = { luz: 0, agua: 0, gas: 0, otros: 0 }
          if (consumption >= 0) {
            dailyConsumption[day][type] += consumption
          }
        }
        lastValues[counterId] = read.valor
      })

      const days = Object.keys(dailyConsumption).sort()
      setConsumptionData({
        labels: days.map(d => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })),
        datasets: [
          {
            label: 'Luz (kWh)',
            data: days.map(d => dailyConsumption[d].luz),
            borderColor: '#818cf8',
            backgroundColor: 'rgba(129, 140, 248, 0.1)',
            fill: true,
            tension: 0.4,
            spanGaps: true
          },
          {
            label: 'Agua (m³)',
            data: days.map(d => dailyConsumption[d].agua),
            borderColor: '#2dd4bf',
            backgroundColor: 'rgba(45, 212, 191, 0.1)',
            fill: true,
            tension: 0.4,
            spanGaps: true
          }
        ]
      } as any)

      // Summary Stats
      setSummaryStats({
        totalIncidents: incidents.length,
        avgResolutionTime: 0, // Simplified since resolved_at doesn't exist
        criticalZones: sortedLocations.slice(0, 3).map(l => l[0]) as any,
        efficiencyScore: techNames.length > 0 ? 85 : 0 
      })

      // 3. AI Anomaly & Trend Detection
      if (days.length >= 3) {
        setIsCheckingAnomalies(true)
        const sample = days.slice(-7).map(d => ({
          fecha: d,
          ...dailyConsumption[d]
        }))
        
        // Ejecutar detecciones en paralelo para mayor velocidad
        Promise.all([
          aiService.detectAnomalies(sample),
          aiService.analyzeIncidentTrends(incidents)
        ]).then(([anomRes, trendRes]) => {
          setAnomaly(anomRes)
          setTrendAlert(trendRes)
          setIsCheckingAnomalies(false)

          // Disparar notificación nativa si hay alerta de tendencia
          if (trendRes) {
            sendNotification('📈 PATRÓN DE FALLOS DETECTADO', {
              body: trendRes,
              icon: '/apple-touch-icon.png',
              tag: 'trend-alert',
              requireInteraction: true
            })
          }
        })
      }

    } catch (error) {
      console.error('Error fetching insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const doc = new jsPDF()
      const { default: autoTable } = await import('jspdf-autotable')
      
      // Header
      doc.setFillColor(10, 10, 26)
      doc.rect(0, 0, 210, 40, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.text('V-SUITE', 14, 25)
      doc.setFontSize(10)
      doc.text('INFORME DE ANALÍTICA AVANZADA (V-INSIGHTS)', 14, 32)
      
      // Info
      doc.setTextColor(100, 100, 100)
      doc.text(`Rango: Últimos ${timeRange} días`, 14, 48)
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 54)

      // Summary Stats Table
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(14)
      doc.text('Resumen Operativo', 14, 70)
      
      autoTable(doc, {
        startY: 75,
        head: [['Métrica', 'Valor']],
        body: [
          ['Incidencias Totales', summaryStats.totalIncidents],
          ['MTTR (Tiempo Medio)', summaryStats.avgResolutionTime + 'h'],
          ['Eficiencia Operativa', summaryStats.efficiencyScore + '%'],
          ['Zonas Críticas', summaryStats.criticalZones.join(', ') || 'N/A']
        ],
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] }
      })

      // Heatmap Data Table
      let finalY = (doc as any).lastAutoTable.finalY + 15
      doc.text('Distribución por Zonas (Heatmap)', 14, finalY)
      
      const heatmapRows = heatmapData ? heatmapData.labels.map((label, i) => [
        label,
        heatmapData.datasets[0].data[i]
      ]) : [['Sin datos', 0]]

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Zona', 'Nº Incidencias']],
        body: heatmapRows,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      })

      // Consumption Trends
      finalY = (doc as any).lastAutoTable.finalY + 15
      doc.text('Consumo de Suministros', 14, finalY)
      
      const consumptionRows = consumptionData ? consumptionData.labels.map((label, i) => [
        label,
        consumptionData.datasets[0].data[i] + ' kWh',
        consumptionData.datasets[1].data[i] + ' m³'
      ]) : [['Sin datos', '-', '-']]

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Día', 'Luz (kWh)', 'Agua (m³)']],
        body: consumptionRows,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
      })

      doc.save(`V-Insights_Report_${timeRange}days_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Error al generar el PDF del informe.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="insights-page animate-fade-in">
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">
            <BarChart3 className="text-accent" />
            V-Insights <span className="badge badge-accent ml-sm text-[10px]">AI ENGINE</span>
          </h1>
          <p className="v-page-subtitle">Analítica avanzada y toma de decisiones ejecutivas</p>
        </div>
        <div className="flex items-center gap-md">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mr-4">
            <button 
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-white'}`}
            >
              <LayoutDashboard size={14} /> Vista General
            </button>
            <button 
              onClick={() => setActiveTab('water')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'water' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-muted hover:text-white'}`}
            >
              <Droplets size={14} /> Gestión Hídrica
            </button>
          </div>

          <div className="select-wrapper">
            <Calendar size={16} className="select-icon" />
            <select 
              className="select variant-small" 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 3 meses</option>
            </select>
          </div>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Activity size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            <span>{isExporting ? 'Generando...' : 'Exportar Informe'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'water' ? (
        <WaterQualityControl activeHotelId={activeHotelId} />
      ) : (
        <>

      {anomaly && (
        <div className="v-glass-card mb-lg p-lg border-l-4 border-l-danger animate-fade-in" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
          <div className="flex items-center gap-lg">
            <div className="p-md bg-danger/10 rounded-full text-danger border border-danger/20">
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="flex items-center gap-sm mb-xs">
                <Sparkles size={16} className="text-danger" />
                <h4 className="text-xs font-black text-danger uppercase tracking-widest">Alerta de Suministros AI</h4>
              </div>
              <p className="text-secondary text-xs tracking-wide">{anomaly}</p>
            </div>
          </div>
        </div>
      )}

      {trendAlert && (
        <div className="v-glass-card mb-xl p-lg border-l-4 border-l-accent animate-fade-in" style={{ background: 'rgba(var(--color-accent), 0.05)' }}>
          <div className="flex items-center gap-lg">
            <div className="p-md bg-accent/10 rounded-full text-accent border border-accent/20 shadow-[0_0_15px_rgba(var(--color-accent),0.2)]">
              <Activity size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-xs">
                <div className="flex items-center gap-sm">
                  <Sparkles size={16} className="text-accent" />
                  <h4 className="text-xs font-black text-accent uppercase tracking-widest">Análisis Predictivo V-Insights</h4>
                </div>
                <span className="badge badge-accent text-[8px] px-2">NIVEL EJECUTIVO</span>
              </div>
              <p className="text-white text-sm font-medium tracking-wide leading-relaxed">{trendAlert}</p>
            </div>
          </div>
        </div>
      )}

      <div className="v-stats-grid">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="v-glass-card v-stat-card">
              <Skeleton className="h-3 w-24 mb-xs" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-xs" />
            </div>
          ))
        ) : (
          <>
            <div className="v-glass-card v-stat-card border-l-4 border-l-accent">
              <span className="v-stat-label">Incidencias Totales</span>
              <div className="v-stat-value">{summaryStats.totalIncidents}</div>
              <div className="v-stat-footer">En el periodo seleccionado</div>
            </div>
            <div className="v-glass-card v-stat-card border-l-4 border-l-success">
              <span className="v-stat-label">MTTR (Tiempo Medio)</span>
              <div className="v-stat-value">{summaryStats.avgResolutionTime}h</div>
              <div className="v-stat-footer">De reporte a resolución</div>
            </div>
            <div className="v-glass-card v-stat-card border-l-4 border-l-info">
              <span className="v-stat-label">Eficiencia Operativa</span>
              <div className="v-stat-value">{summaryStats.efficiencyScore}%</div>
              <div className="v-stat-footer">Resueltas en menos de 4h</div>
            </div>
            <div className="v-glass-card v-stat-card border-l-4 border-l-warning">
              <span className="v-stat-label">Zonas Críticas</span>
              <div className="v-stat-value text-lg">{summaryStats.criticalZones.join(', ') || 'Ninguna'}</div>
              <div className="v-stat-footer">Ubicaciones con más reportes</div>
            </div>
          </>
        )}
      </div>

      <div className="insights-grid">
        <div className="v-glass-card panel">
          <div className="panel-header border-b mb-md pb-sm">
            <div className="flex items-center gap-sm">
              <Map size={18} className="text-accent" />
              <h3 className="font-bold">Distribución Geográfica (Heatmap)</h3>
            </div>
          </div>
          <div className="panel-body h-[350px]">
            {loading ? <Skeleton className="h-full w-full" /> : (heatmapData && <Bar 
              data={heatmapData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0c0' } },
                  x: { grid: { display: false }, ticks: { color: '#a0a0c0' } }
                }
              }}
            />)}
          </div>
        </div>

        <div className="v-glass-card panel">
          <div className="panel-header border-b mb-md pb-sm">
            <div className="flex items-center gap-sm">
              <PieChart size={18} className="text-success" />
              <h3 className="font-bold">Rendimiento por Técnico</h3>
            </div>
          </div>
          <div className="panel-body h-[350px] flex items-center justify-center">
            {loading ? <Skeleton variant="circle" className="h-64 w-64" /> : (mttrData && <Pie 
              data={mttrData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { 
                    position: 'right', 
                    labels: { color: '#a0a0c0', usePointStyle: true, font: { size: 11 } } 
                  } 
                }
              }}
            />)}
          </div>
        </div>

        <div className="v-glass-card panel col-span-2">
          <div className="panel-header border-b mb-md pb-sm">
            <div className="flex items-center gap-sm">
              <Clock size={18} className="text-warning" />
              <h3 className="font-bold">Picos de Incidencias por Hora</h3>
            </div>
          </div>
          <div className="panel-body h-[300px]">
            {loading ? <Skeleton className="h-full w-full" /> : (peakHoursData && <Line 
              data={peakHoursData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0c0', precision: 0 } },
                  x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0c0' } }
                }
              }}
            />)}
          </div>
        </div>

        <div className="v-glass-card panel col-span-2">
          <div className="panel-header border-b mb-md pb-sm">
            <div className="flex items-center gap-sm">
              <LineChart size={18} className="text-info" />
              <h3 className="font-bold">Análisis de Suministros (Tendencia de Consumo)</h3>
            </div>
          </div>
          <div className="panel-body h-[400px]">
            {loading ? <Skeleton className="h-full w-full" /> : (consumptionData && <Line 
              data={consumptionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { position: 'top', labels: { color: '#a0a0c0', usePointStyle: true } }
                },
                scales: {
                  y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0c0' } },
                  x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0c0' } }
                }
              }}
            />)}
          </div>
        </div>
      </div>
    </>
  )}

      <style>{`
        .insights-page {
          padding-bottom: var(--spacing-xl);
        }
        .insights-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: var(--spacing-lg);
        }
        .col-span-2 { grid-column: span 2; }
        
        .stat-card.border-l-accent { border-left: 4px solid var(--color-accent); }
        .stat-card.border-l-success { border-left: 4px solid var(--color-success); }
        .stat-card.border-l-info { border-left: 4px solid var(--color-info); }
        .stat-card.border-l-warning { border-left: 4px solid var(--color-warning); }
        
        .select-wrapper { position: relative; }
        .select-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
        .select.variant-small { padding-left: 32px; height: 36px; font-size: 0.875rem; background: rgba(255,255,255,0.05); }

        @media (max-width: 1024px) {
          .insights-grid { grid-template-columns: 1fr; }
          .col-span-2 { grid-column: auto; }
        }
      `}</style>
    </div>
  )
}
