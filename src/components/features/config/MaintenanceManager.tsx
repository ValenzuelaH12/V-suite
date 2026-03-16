import React, { useState } from 'react';
import { ClipboardList, Plus, Trash2, Calendar, Activity, CheckCircle, Clock, Layers, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { configService } from '../../../services/configService';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Badge } from '../../ui/Badge';

interface MaintenanceManagerProps {
  maintenance: any[];
  templates: any[];
  onMessage: (msg: { type: 'success' | 'error', text: string }) => void;
  onRefresh: () => void;
  activeHotelId: string | null;
}

export const MaintenanceManager: React.FC<MaintenanceManagerProps> = ({ 
  maintenance, 
  templates, 
  onMessage,
  onRefresh,
  activeHotelId
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'tareas' | 'plantillas'>('tareas');
  const [isAddingMaint, setIsAddingMaint] = useState(false);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  
  const [newMaint, setNewMaint] = useState({
    titulo: '',
    descripcion: '',
    frecuencia: 'mensual',
    proxima_fecha: new Date().toISOString().split('T')[0],
    plantilla_id: '',
    hotel_id: activeHotelId || ''
  });

  const [newTemplate, setNewTemplate] = useState({ nombre: '', items: [] as string[], hotel_id: activeHotelId || '' });
  const [newTemplateItem, setNewTemplateItem] = useState('');

  const handleAddTemplateItem = () => {
    if (!newTemplateItem.trim()) return;
    setNewTemplate(prev => ({
      ...prev,
      items: [...prev.items, newTemplateItem.trim()]
    }));
    setNewTemplateItem('');
  };

  // Sync hotel_id when activeHotelId changes
  React.useEffect(() => {
    if (activeHotelId) {
      setNewMaint(prev => ({ ...prev, hotel_id: activeHotelId }));
      setNewTemplate(prev => ({ ...prev, hotel_id: activeHotelId }));
    }
  }, [activeHotelId]);

  const handleAddMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configService.create('mantenimiento_preventivo', { ...newMaint, hotel_id: activeHotelId });
      onMessage({ type: 'success', text: 'Tarea de mantenimiento creada.' });
      setIsAddingMaint(false);
      setNewMaint({ 
        titulo: '', 
        descripcion: '', 
        frecuencia: 'mensual', 
        proxima_fecha: new Date().toISOString().split('T')[0], 
        plantilla_id: '',
        hotel_id: activeHotelId || ''
      });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: error.message });
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.nombre.trim()) return;
    try {
      await configService.create('mantenimiento_plantillas', { ...newTemplate, hotel_id: activeHotelId });
      onMessage({ type: 'success', text: 'Plantilla creada.' });
      setIsAddingTemplate(false);
      setNewTemplate({ nombre: '', items: [], hotel_id: activeHotelId || '' });
      onRefresh();
    } catch (error: any) {
      onMessage({ type: 'error', text: error.message });
    }
  };

  const stats = {
    total: maintenance.length,
    templates: templates.length,
    urgent: maintenance.filter(m => {
      const diff = new Date(m.proxima_fecha).getTime() - new Date().getTime();
      return diff < 86400000 * 3; // 3 days
    }).length
  };

  return (
    <div className="maintenance-redesign animate-fade-in flex flex-col gap-xl">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <Card className="p-md relative overflow-hidden group hover-glow transition-all">
          <div className="flex items-center gap-md">
            <div className="p-sm rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-tighter">Programas Activos</p>
              <h4 className="text-2xl font-black text-white">{stats.total}</h4>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 group-hover:scale-125 transition-all">
            <Calendar size={80} />
          </div>
        </Card>
        
        <Card className="p-md relative overflow-hidden group hover-glow transition-all">
          <div className="flex items-center gap-md">
            <div className="p-sm rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-tighter">Plantillas Disponibles</p>
              <h4 className="text-2xl font-black text-white">{stats.templates}</h4>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 group-hover:scale-125 transition-all">
            <ClipboardList size={80} />
          </div>
        </Card>

        <Card className="p-md relative overflow-hidden group hover-glow transition-all">
          <div className="flex items-center gap-md">
            <div className={`p-sm rounded-xl ${stats.urgent > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/10 text-green-400'} group-hover:scale-110 transition-transform`}>
              <Activity size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-tighter">Próximos 3 días</p>
              <h4 className={`text-2xl font-black ${stats.urgent > 0 ? 'text-orange-400' : 'text-green-400'}`}>{stats.urgent}</h4>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 group-hover:scale-125 transition-all">
            <Activity size={80} />
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-md">
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
          <button 
            onClick={() => setActiveSubTab('tareas')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'tareas' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-muted hover:text-white'}`}
          >
            <Calendar size={18} /> Tareas Programadas
          </button>
          <button 
            onClick={() => setActiveSubTab('plantillas')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'plantillas' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-muted hover:text-white'}`}
          >
            <ClipboardList size={18} /> Plantillas
          </button>
        </div>
        
        <Button 
          variant="primary" 
          onClick={() => activeSubTab === 'tareas' ? setIsAddingMaint(true) : setIsAddingTemplate(true)}
          icon={Plus}
          className="shadow-xl"
        >
          {activeSubTab === 'tareas' ? 'Nueva Tarea' : 'Nueva Plantilla'}
        </Button>
      </div>

      {activeSubTab === 'tareas' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {maintenance.map(m => (
            <Card key={m.id} className="maintenance-card group hover-scale p-none relative overflow-hidden border-white/5 bg-black/40 backdrop-blur-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="p-xl">
                <div className="flex justify-between items-start mb-lg">
                  <div className={`p-3 rounded-2xl bg-indigo-500/10 text-indigo-400`}>
                    <Calendar size={24} />
                  </div>
                  <Badge variant="success" className="px-3 py-1 text-[10px] font-black tracking-widest bg-emerald-500/10 text-emerald-400 border-none">
                    ACTIVO
                  </Badge>
                </div>
                
                <h4 className="text-xl font-black text-white mb-xs group-hover:text-indigo-300 transition-colors uppercase tracking-tight">{m.titulo}</h4>
                <p className="text-xs text-muted leading-relaxed line-clamp-2 mb-xl min-h-[32px]">
                  {m.descripcion || 'Sin descripción adicional para este programa.'}
                </p>
                
                <div className="flex items-center justify-between p-md bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted mb-1">Próxima Ejecución</span>
                    <span className="text-sm font-black text-white">{new Date(m.proxima_fecha).toLocaleDateString(undefined, { day: '2-digit', month: 'long' })}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-muted mb-1 tracking-tighter">Frecuencia</span>
                    <Badge variant="neutral" className="bg-indigo-500/20 text-indigo-300 border-none font-black text-[10px]">
                      {m.frecuencia?.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="mt-xl flex justify-between items-center opacity-40 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 text-xs text-muted font-bold">
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span>Vinculado a: {templates.find(t => t.id === m.plantilla_id)?.nombre || 'Checklist General'}</span>
                  </div>
                  <button 
                    onClick={() => configService.delete('mantenimiento_preventivo', m.id).then(onRefresh)}
                    className="p-2 rounded-lg hover:bg-danger/20 hover:text-danger text-muted transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {maintenance.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center glass-card border-dashed">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-md">
                <Calendar size={32} className="text-muted" />
              </div>
              <h3 className="text-xl font-bold text-white mb-xs">No hay tareas programadas</h3>
              <p className="text-muted text-sm max-w-xs">Configura tu plan de mantenimiento preventivo para evitar averías costosas.</p>
              <Button variant="ghost" className="mt-lg" onClick={() => setIsAddingMaint(true)}>Crear primera tarea</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(t => (
            <Card key={t.id} className="template-card group hover-scale p-none relative overflow-hidden border-white/5 bg-black/40 backdrop-blur-sm">
              <div className="p-xl">
                <div className="flex justify-between items-center mb-lg">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <ClipboardList size={20} />
                  </div>
                  <span className="text-[10px] font-black text-muted uppercase bg-white/5 px-3 py-1 rounded-full border border-white/10">
                    {t.items?.length || 0} PUNTOS
                  </span>
                </div>
                
                <h4 className="text-lg font-black text-white mb-md group-hover:text-purple-300 transition-colors">{t.nombre}</h4>
                
                <div className="flex flex-wrap gap-xs mb-lg max-h-[100px] overflow-hidden">
                  {t.items?.map((item: string, i: number) => (
                    <span key={i} className="text-[10px] font-bold text-muted py-1 px-3 bg-white/5 rounded-lg border border-white/5 whitespace-nowrap">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="flex justify-end pt-md border-t border-white/5">
                  <button 
                    onClick={() => configService.delete('mantenimiento_plantillas', t.id).then(onRefresh)}
                    className="p-2 rounded-lg hover:bg-danger/20 hover:text-danger text-muted transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center glass-card border-dashed">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-md">
                <ClipboardList size={32} className="text-muted" />
              </div>
              <h3 className="text-xl font-bold text-white mb-xs">No hay plantillas de revisión</h3>
              <p className="text-muted text-sm max-w-xs">Crea listas de verificación para estandarizar los procesos de mantenimiento.</p>
              <Button variant="ghost" className="mt-lg" onClick={() => setIsAddingTemplate(true)}>Crear primera plantilla</Button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Nueva Tarea Rediseñado */}
      <Modal
        isOpen={isAddingMaint}
        onClose={() => setIsAddingMaint(false)}
        title="Nueva Programación"
        maxWidth="750px"
      >
        <form onSubmit={handleAddMaint} className="maint-premium-form animate-slide-up">
          <div className="form-layout-grid">
            {/* Left Column: Info */}
            <div className="form-column">
              <div className="form-section-header">
                <Calendar size={18} className="text-indigo-400" />
                <span>Información General</span>
              </div>
              
              <div className="input-field-group">
                <label>Título de la Tarea</label>
                <input 
                  type="text" 
                  required 
                  value={newMaint.titulo}
                  onChange={e => setNewMaint({...newMaint, titulo: e.target.value})}
                  placeholder="Ej: Revisión Climatización"
                  className="premium-input"
                />
              </div>

              <div className="input-field-group">
                <label>Descripción / Observaciones</label>
                <textarea 
                  value={newMaint.descripcion}
                  onChange={e => setNewMaint({...newMaint, descripcion: e.target.value})}
                  placeholder="Instrucciones para el técnico..."
                  rows={4}
                  className="premium-textarea"
                />
              </div>

              <div className="input-field-group">
                <label>Próxima Fecha</label>
                <input 
                  type="date" 
                  required
                  value={newMaint.proxima_fecha}
                  onChange={e => setNewMaint({...newMaint, proxima_fecha: e.target.value})}
                  className="premium-input [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Right Column: Choices */}
            <div className="form-column">
              <div className="form-section-header">
                <Activity size={18} className="text-purple-400" />
                <span>Configuración Operativa</span>
              </div>

              <div className="frequency-selector">
                <label className="input-label-premium">Frecuencia de Repetición</label>
                <div className="freq-grid">
                  {[
                    { id: 'diario', label: 'Diario', icon: Clock },
                    { id: 'semanal', label: 'Semanal', icon: Calendar },
                    { id: 'mensual', label: 'Mensual', icon: Layers },
                    { id: 'anual', label: 'Anual', icon: Activity }
                  ].map(f => (
                    <div 
                      key={f.id}
                      className={`freq-card ${newMaint.frecuencia === f.id ? 'active' : ''}`}
                      onClick={() => setNewMaint({...newMaint, frecuencia: f.id})}
                    >
                      <f.icon size={20} />
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="input-field-group mt-xl">
                <label>Vincular Plantilla (Checklist)</label>
                <div className="template-select-wrap">
                  <select 
                    value={newMaint.plantilla_id}
                    onChange={e => setNewMaint({...newMaint, plantilla_id: e.target.value})}
                    className="premium-select"
                  >
                    <option value="">Sin plantilla vinculada</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                  <div className="select-glow"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="premium-modal-footer">
            <button type="button" onClick={() => setIsAddingMaint(false)} className="btn-premium-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-premium-primary">
              <Plus size={18} />
              Confirmar Programación
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Nueva Plantilla Rediseñado */}
      <Modal
        isOpen={isAddingTemplate}
        onClose={() => setIsAddingTemplate(false)}
        title="Configurar Checklist"
        maxWidth="600px"
      >
        <form onSubmit={handleAddTemplate} className="maint-premium-form animate-slide-up">
          <div className="input-field-group">
            <label>Nombre de la Plantilla</label>
            <input 
              type="text" 
              required 
              value={newTemplate.nombre}
              onChange={e => setNewTemplate({...newTemplate, nombre: e.target.value})}
              placeholder="Ej: Checklist Habitaciones"
              className="premium-input"
            />
          </div>

          <div className="template-items-section mt-lg">
            <label className="input-label-premium">Elementos de Inspección</label>
            <div className="dynamic-items-list glass">
              {newTemplate.items.map((item, idx) => (
                <div key={idx} className="template-item-row animate-fade-in">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="flex-1">{item}</span>
                  <button 
                    type="button"
                    onClick={() => {
                      const updated = [...newTemplate.items];
                      updated.splice(idx, 1);
                      setNewTemplate({...newTemplate, items: updated});
                    }}
                    className="text-white/20 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              <div className="add-item-control mt-md">
                <input 
                  type="text"
                  value={newTemplateItem}
                  onChange={e => setNewTemplateItem(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddTemplateItem())}
                  placeholder="Añadir nuevo punto..."
                  className="item-input"
                />
                <button type="button" onClick={handleAddTemplateItem} className="item-add-btn">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="premium-modal-footer mt-xl">
            <button type="button" onClick={() => setIsAddingTemplate(false)} className="btn-premium-secondary">
              Descartar
            </button>
            <button type="submit" className="btn-premium-primary">
              Guardar Plantilla
            </button>
          </div>
        </form>
      </Modal>

      <style>{`
        /* Keyframes para animaciones premium */
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }

        /* Estilos de Formulario Premium */
        .maint-premium-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-layout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        @media (max-width: 768px) { .form-layout-grid { grid-template-columns: 1fr; gap: 1rem; } }

        .form-section-header { 
          display: flex; align-items: center; gap: 0.75rem; 
          margin-bottom: 1.25rem; font-size: 0.85rem; font-weight: 800; 
          text-transform: uppercase; letter-spacing: 0.05em; color: white/80;
        }

        .input-field-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .input-field-group label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; padding-left: 2px; }

        /* Inputs Glassmorphism */
        .premium-input, .premium-textarea, .premium-select {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 0.85rem 1rem;
          color: white;
          font-family: inherit;
          transition: all 0.3s ease;
          width: 100%;
        }
        .premium-input:focus, .premium-textarea:focus, .premium-select:focus {
          outline: none; background: rgba(255, 255, 255, 0.06);
          border-color: #6366f1; box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
        }

        /* Frequency Selector (Cards Style like Rooms) */
        .freq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .freq-card {
          padding: 1rem; border-radius: 16px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column;
          align-items: center; gap: 0.5rem; cursor: pointer; transition: all 0.3s ease;
          color: #94a3b8;
        }
        .freq-card:hover { background: rgba(255,255,255,0.06); transform: translateY(-2px); }
        .freq-card.active { 
          background: rgba(99, 102, 241, 0.1); border-color: #6366f1; 
          color: white; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.15);
        }
        .freq-card span { font-size: 0.75rem; font-weight: 700; }

        /* Dynamic Item List */
        .dynamic-items-list { 
          border-radius: 16px; padding: 0.5rem; display: flex; flex-direction: column; gap: 4px;
          background: rgba(15, 15, 26, 0.4); border: 1px solid rgba(255,255,255,0.05);
        }
        .template-item-row { 
          display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.02); border-radius: 10px; font-size: 0.85rem;
        }
        .add-item-control { display: flex; gap: 0.5rem; padding: 4px; }
        .item-input { 
          flex: 1; background: transparent; border: none; font-size: 0.85rem; color: white; outline: none;
          padding: 0.5rem;
        }
        .item-add-btn { 
          width: 34px; height: 34px; border-radius: 10px; background: #6366f1; color: white;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .item-add-btn:hover { transform: scale(1.05); filter: brightness(1.1); }

        /* Footer Buttons */
        .premium-modal-footer { 
          display: flex; justify-content: flex-end; gap: 1rem; padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .btn-premium-primary {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: white; padding: 0.85rem 1.75rem; border-radius: 14px;
          font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3); transition: all 0.3s ease;
        }
        .btn-premium-primary:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .btn-premium-secondary {
          background: rgba(255,255,255,0.05); color: #94a3b8; padding: 0.85rem 1.5rem;
          border-radius: 14px; font-weight: 600; font-size: 0.9rem; transition: all 0.2s;
        }
        .btn-premium-secondary:hover { background: rgba(255,255,255,0.08); color: white; }
      `}</style>
    </div>
  );
};
