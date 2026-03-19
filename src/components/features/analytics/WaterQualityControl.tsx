import React, { useState, useEffect } from 'react';
import { 
  Droplets, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  History, 
  Thermometer, 
  CheckCircle2,
  MapPin,
  FlaskConical,
  Beaker,
  Scale,
  Calendar,
  User,
  Save,
  ChevronRight,
  Info,
  Waves,
  Zap,
  Activity
} from 'lucide-react';
import { waterService, WaterControlRecord } from '../../../services/waterService';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../ui/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown } from 'lucide-react';
import { Modal } from '../../ui/Modal';

interface WaterQualityControlProps {
  activeHotelId: string | null;
}

export const WaterQualityControl: React.FC<WaterQualityControlProps> = ({ activeHotelId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRecord, setNewRecord] = useState<Partial<WaterControlRecord>>({
    punto_muestreo: 'Piscina Principal',
    ph: 7.2,
    cloro_libre: 1.0,
    cloro_total: 1.2,
    turbidez: 0.2,
    temperatura: 26,
    notas: ''
  });

  useEffect(() => {
    fetchRecords();
  }, [activeHotelId]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      if (activeHotelId) {
        const data = await waterService.getAll(activeHotelId);
        setRecords(data);
      }
    } catch (error) {
      console.error('Error fetching water records:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showSuccess, setShowSuccess] = useState(false);

  const handleCreate = async () => {
    if (!activeHotelId) {
      alert('Por favor, seleccione un hotel en la barra lateral antes de registrar la analítica.');
      return;
    }

    try {
      const record: WaterControlRecord = {
        ...newRecord,
        hotel_id: activeHotelId,
        registrado_por: user?.id,
        fecha: new Date().toISOString()
      } as WaterControlRecord;

      console.log('DEBUG: Intentando registrar analítica para hotel', activeHotelId);
      await waterService.create(record);
      setIsAdding(false);
      setShowSuccess(true);
      fetchRecords();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error al guardar:', error);
      if (error?.code === '42501') {
        alert('Error de permisos (RLS): No tiene autorización para registrar analíticas en este hotel o el hotel_id no coincide con su perfil.');
      } else {
        alert('Error al guardar el registro. Asegúrese de que la conexión a la base de datos es correcta.');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro de control?')) return;
    try {
      await waterService.delete(id);
      fetchRecords();
    } catch (error) {
      alert('Error al borrar');
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('V-SUITE', 14, 25);
      doc.setFontSize(10);
      doc.text('INFORME TÉCNICO-SANITARIO DE CONTROL DE AGUA', 14, 32);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 48);

      const tableData = records.map(r => [
        new Date(r.fecha).toLocaleDateString() + ' ' + new Date(r.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        r.punto_muestreo,
        r.ph,
        r.cloro_libre,
        r.temperatura + '°C',
        r.turbidez,
        r.notas || '-'
      ]);

      autoTable(doc, {
        startY: 55,
        head: [['Fecha / Hora', 'Punto Muestreo', 'pH', 'Cloro L.', 'Temp.', 'Turb.', 'Notas']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
        columnStyles: { 6: { cellWidth: 50 } }
      });

      doc.save(`Analitica_Agua_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error export:', error);
      alert('Error al generar el PDF');
    }
  };

  const getStatusColor = (param: string, val: number) => {
    if (param === 'ph') return (val < 7.0 || val > 7.6) ? 'text-amber-500' : 'text-emerald-400';
    if (param === 'cloro') return (val < 0.5 || val > 2.0) ? 'text-amber-500' : 'text-emerald-400';
    return 'text-white';
  };

  return (
    <div className="water-quality-container space-y-6 animate-fade-in">
      {/* HEADER & ACTION */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
            <FlaskConical size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Control de Analíticas Hídricas</h2>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest opacity-60">Registro Técnico-Sanitario (Laboratorio)</p>
          </div>
        </div>
        <Button 
          onClick={() => setIsAdding(true)} 
          className={`rounded-xl px-6 py-2 text-[10px] font-black uppercase transition-all bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20`}
        >
          Nueva Analítica
        </Button>
      </div>

      {/* NEW RECORD FORM (INLINE) */}
      {isAdding && (
        <div className="v-glass-card p-6 border-blue-500/20 bg-blue-500/5 animate-slide-up">
          <div className="space-y-6">
            <div className="section-divider !mt-0 !mb-3">
              <span className="divider-text text-[9px]">Punto de Muestreo</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'Piscina Principal', icon: Waves },
                { id: 'Jacuzzi / Spa', icon: Thermometer },
                { id: 'Agua de Red', icon: Droplets },
                { id: 'Depósito ACS', icon: Zap },
                { id: 'Depuradora', icon: Activity }
              ].map(point => (
                <button
                  key={point.id}
                  type="button"
                  onClick={() => {
                    console.log('DEBUG: Seleccionando punto', point.id);
                    setNewRecord(prev => ({ ...prev, punto_muestreo: point.id }));
                  }}
                  className="flex-1 min-w-[100px] flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-300 active:scale-95 cursor-pointer"
                  style={{
                    background: newRecord.punto_muestreo === point.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                    borderColor: newRecord.punto_muestreo === point.id ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)',
                    boxShadow: newRecord.punto_muestreo === point.id ? '0 10px 20px -5px rgba(59, 130, 246, 0.4)' : 'none'
                  }}
                >
                  <point.icon 
                    size={18} 
                    style={{ color: newRecord.punto_muestreo === point.id ? '#ffffff' : '#3b82f6' }} 
                  />
                  <span 
                    className="text-[9px] font-black uppercase tracking-wider text-center"
                    style={{ color: newRecord.punto_muestreo === point.id ? '#ffffff' : 'rgba(255, 255, 255, 0.6)' }}
                  >
                    {point.id}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="param-input-card">
                <div className="card-header-mini text-[8px]">pH Agua</div>
                <input 
                  type="number" step="0.1" className="param-field" 
                  value={newRecord.ph} onChange={e => setNewRecord(prev =>({...prev, ph: parseFloat(e.target.value)}))}
                />
              </div>
              <div className="param-input-card">
                <div className="card-header-mini text-[8px]">Cloro Libre</div>
                <input 
                  type="number" step="0.1" className="param-field" 
                  value={newRecord.cloro_libre} onChange={e => setNewRecord(prev =>({...prev, cloro_libre: parseFloat(e.target.value)}))}
                />
              </div>
               <div className="param-input-card">
                <div className="card-header-mini text-[8px]">Cloro Total</div>
                <input 
                  type="number" step="0.1" className="param-field" 
                  value={newRecord.cloro_total} onChange={e => setNewRecord(prev =>({...prev, cloro_total: parseFloat(e.target.value)}))}
                />
              </div>
              <div className="param-input-card">
                <div className="card-header-mini text-[8px]">Turbidez</div>
                <input 
                  type="number" step="0.01" className="param-field" 
                  value={newRecord.turbidez} onChange={e => setNewRecord(prev =>({...prev, turbidez: parseFloat(e.target.value)}))}
                />
              </div>
               <div className="param-input-card">
                <div className="card-header-mini text-[8px]">Temp.</div>
                <input 
                  type="number" step="1" className="param-field" 
                  value={newRecord.temperatura} onChange={e => setNewRecord(prev =>({...prev, temperatura: parseFloat(e.target.value)}))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-3">
                <div className="zona-style-input-card">
                  <div className="card-header-mini">
                    <Info size={12} className="text-blue-400" />
                    <span>Observaciones Técnicas</span>
                  </div>
                  <textarea 
                    className="zona-input-field h-20 resize-none pt-1" 
                    placeholder="Estado de depuradora, aditivos aplicados..."
                    value={newRecord.notas}
                    onChange={e => setNewRecord(prev =>({...prev, notas: e.target.value}))}
                  />
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  handleCreate();
                }}
                className="w-full flex items-center justify-center gap-2 h-20 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 cursor-pointer"
              >
                <Save size={20} /> Registrar Analítica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MESSAGE */}
      {showSuccess && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400">
            <CheckCircle2 size={20} />
            <span className="font-black uppercase text-xs tracking-widest">Analítica Registrada con Éxito</span>
          </div>
        </div>
      )}

      {/* RECORDS LIST ( PREMIUM TABLE ) */}
      <div className="v-glass-card overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/2">
          <div className="flex items-center gap-2">
            <History size={16} className="text-muted" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Historial de Controles Recientes</h3>
          </div>
          <button 
            onClick={handleExportPDF}
            disabled={records.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-50"
          >
            <FileDown size={14} className="text-blue-400" />
            Exportar PDF
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="v-table">
            <thead>
              <tr className="bg-white/2">
                <th className="py-4 px-6 text-left text-[9px] font-black uppercase text-muted tracking-widest">Fecha / H</th>
                <th className="py-4 px-6 text-left text-[9px] font-black uppercase text-muted tracking-widest">Punto Muestreo</th>
                <th className="py-4 px-6 text-center text-[9px] font-black uppercase text-muted tracking-widest">pH</th>
                <th className="py-4 px-6 text-center text-[9px] font-black uppercase text-muted tracking-widest">Cl Libre</th>
                <th className="py-4 px-6 text-center text-[9px] font-black uppercase text-muted tracking-widest">Temp</th>
                <th className="py-4 px-6 text-center text-[9px] font-black uppercase text-muted tracking-widest">Turb.</th>
                <th className="py-4 px-6 text-right text-[9px] font-black uppercase text-muted tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-10 text-center text-muted animate-pulse">Cargando analíticas...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-muted italic">No hay registros para este hotel.</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-all group">
                   <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white">{new Date(r.fecha).toLocaleDateString()}</span>
                      <span className="text-[9px] text-muted">{new Date(r.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                       <span className="text-xs font-black uppercase text-white tracking-tight">{r.punto_muestreo}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`text-xs font-black ${getStatusColor('ph', r.ph)}`}>{r.ph}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`text-xs font-black ${getStatusColor('cloro', r.cloro_libre)}`}>{r.cloro_libre}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-xs font-bold text-white">{r.temperatura}°</span>
                  </td>
                   <td className="py-4 px-6 text-center">
                    <span className={`text-xs font-bold ${r.turbidez > 1 ? 'text-amber-500' : 'text-white'}`}>{r.turbidez}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => handleDelete(r.id)}
                      className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all border border-transparent hover:border-danger/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .zona-style-input-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 8px 12px;
          transition: all 0.2s;
        }
        .zona-style-input-card:focus-within {
          background: rgba(255, 255, 255, 0.05);
          border-color: #3b82f6;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.1);
        }
        .card-header-mini {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 8px;
          font-weight: 800;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .zona-input-field {
          background: transparent;
          border: none;
          color: white;
          width: 100%;
          font-size: 0.85rem;
          font-weight: 600;
          outline: none;
        }

        .param-input-card {
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 12px;
          transition: all 0.2s;
        }
        .param-input-card:focus-within {
          background: rgba(255,255,255,0.06);
          border-color: #3b82f6;
          transform: translateY(-2px);
        }
        .param-field {
          background: transparent;
          border: none;
          color: white;
          font-size: 1.25rem;
          font-weight: 900;
          width: 100%;
          outline: none;
          margin-top: 4px;
        }
        .param-field::-webkit-inner-spin-button { opacity: 0; }
      `}</style>
    </div>
  );
};
