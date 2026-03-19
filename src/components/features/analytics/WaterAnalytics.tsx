import React, { useState, useEffect } from 'react';
import { 
  Droplets, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Waves, 
  Zap, 
  Thermometer, 
  Settings,
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Save
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Pie, Line } from 'react-chartjs-2';
import { Skeleton } from '../../ui/Skeleton';

interface WaterAnalyticsProps {
  activeHotelId: string | null;
}

export const WaterAnalytics: React.FC<WaterAnalyticsProps> = ({ activeHotelId }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalConsumption: 0,
    dailyAvg: 0,
    leakStatus: 'Normal',
    efficiency: 92,
    trend: +5.2
  });
  const [thresholds, setThresholds] = useState([
    { id: 1, zone: 'Habitaciones', limit: 150, current: 122, unit: 'm³' },
    { id: 2, zone: 'Piscina / Spa', limit: 450, current: 410, unit: 'm³' },
    { id: 3, zone: 'Lavandería', limit: 300, current: 285, unit: 'm³' },
    { id: 4, zone: 'Restaurante', limit: 120, current: 155, unit: 'm³' } // ALERT
  ]);

  useEffect(() => {
    // Simular carga de datos reales de Supabase (Lecturas de tipo 'agua')
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [activeHotelId]);

  return (
    <div className="water-analytics-container space-y-6 animate-fade-in">
      {/* 1. KPI TOP BAR (V-SUITE STYLE) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="water-kpi-card group">
          <div className="kpi-icon-box bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
            <Droplets size={20} />
          </div>
          <div className="flex flex-col">
            <span className="kpi-label">Consumo Total</span>
            <div className="flex items-baseline gap-2">
              <span className="kpi-value">1,280</span>
              <span className="kpi-unit">m³</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold mt-1">
              <ArrowDownRight size={12} /> -2.4% vs mes ant.
            </div>
          </div>
        </div>

        <div className="water-kpi-card group">
          <div className="kpi-icon-box bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
            <Activity size={20} />
          </div>
          <div className="flex flex-col">
            <span className="kpi-label">Media Diaria</span>
            <div className="flex items-baseline gap-2">
              <span className="kpi-value">42.6</span>
              <span className="kpi-unit">m³</span>
            </div>
            <div className="mt-1 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" style={{ width: '65%' }} />
            </div>
          </div>
        </div>

        <div className={`water-kpi-card group ${stats.leakStatus !== 'Normal' ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
          <div className="kpi-icon-box bg-amber-500/20 text-amber-500 group-hover:animate-pulse">
            <AlertTriangle size={20} />
          </div>
          <div className="flex flex-col">
            <span className="kpi-label">Detección de Fugas</span>
            <span className={`kpi-value ${stats.leakStatus !== 'Normal' ? 'text-amber-500' : 'text-emerald-400'}`}>Estable</span>
            <span className="text-[9px] text-muted/60 font-medium uppercase tracking-widest mt-1">IA V-Insights Activa</span>
          </div>
        </div>

        <div className="water-kpi-card group">
          <div className="kpi-icon-box bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
            <Waves size={20} />
          </div>
          <div className="flex flex-col">
            <span className="kpi-label">Eficiencia Hídrica</span>
            <div className="flex items-baseline gap-2">
              <span className="kpi-value">94.8</span>
              <span className="kpi-unit">%</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold mt-1">
              Optimización de flujos OK
            </div>
          </div>
        </div>
      </div>

      {/* 2. GESTIÓN DE UMBRALES (ESTILO ZONAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="v-glass-card p-6 border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Settings size={80} className="text-blue-500" />
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <Settings size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Gestión de Umbrales</h3>
                <p className="text-[10px] text-muted">Ajustar límites de consumo por zona operativa</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-blue-400 transition-all text-[10px] font-black uppercase">
              <Save size={12} /> Guardar Cambios
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {thresholds.map(t => (
              <div key={t.id} className={`zona-style-threshold-card ${t.current > t.limit ? 'exceeded' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={10} className="text-blue-400" />
                    <span className="text-[9px] font-black uppercase text-white/50">{t.zone}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] text-muted uppercase font-bold">Límite Diario</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-black text-white">{t.limit}</span>
                      <span className="text-[8px] text-muted">m³</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[8px] font-bold mb-1 uppercase tracking-tighter">
                    <span className="text-muted">Consumo Actual</span>
                    <span className={t.current > t.limit ? 'text-amber-500' : 'text-blue-400'}>{Math.round((t.current/t.limit)*100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${t.current > t.limit ? 'bg-amber-500' : 'bg-blue-400'}`} 
                      style={{ width: `${Math.min((t.current / t.limit) * 100, 100)}%` }} 
                    />
                  </div>
                </div>
                {t.current > t.limit && (
                  <div className="mt-2 flex items-center gap-1.5 text-[8px] text-amber-500 font-bold animate-pulse">
                    <AlertTriangle size={10} /> UMBRAL EXCEDIDO
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 3. CONSUMPTION TREND (VISUAL) */}
        <div className="v-glass-card p-6 border-white/5 bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Tendencia Hídrica</h3>
              <p className="text-[10px] text-muted">Análisis semanal de flujos de agua</p>
            </div>
          </div>
          <div className="h-[220px] w-full flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-black/20">
            <div className="flex flex-col items-center gap-2 opacity-40">
              <Droplets size={32} className="text-blue-400 animate-bounce" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/50">Simulando Flujo en Tiempo Real</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-2xl bg-white/2 border border-white/5">
              <span className="text-[8px] text-muted uppercase font-black block mb-1">Métrica IA</span>
              <div className="text-sm font-black text-white">Análisis Predictivo</div>
              <p className="text-[9px] text-muted/60 mt-1 leading-relaxed">Sin riesgos inminentes detectados para las próximas 48h.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/2 border border-white/5">
              <span className="text-[8px] text-muted uppercase font-black block mb-1">Impacto Ambiental</span>
              <div className="text-sm font-black text-emerald-400">Huella Optimizada</div>
              <p className="text-[9px] text-muted/60 mt-1 leading-relaxed">Reducción del 12% en desperdicio por goteo.</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .water-kpi-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .water-kpi-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-4px);
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
        }
        .kpi-icon-box {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
        }
        .kpi-label {
          font-size: 9px;
          font-weight: 800;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 2px;
        }
        .kpi-value {
          font-size: 1.25rem;
          font-weight: 900;
          color: white;
          letter-spacing: -0.02em;
        }
        .kpi-unit {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255,255,255,0.3);
          margin-bottom: 3px;
        }

        .zona-style-threshold-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 16px;
          transition: all 0.3s;
        }
        .zona-style-threshold-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(59, 130, 246, 0.2);
        }
        .zona-style-threshold-card.exceeded {
          background: rgba(245, 158, 11, 0.03);
          border-color: rgba(245, 158, 11, 0.2);
        }
      `}</style>
    </div>
  );
};
