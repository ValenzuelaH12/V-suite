import React, { useState } from 'react';
import { ClipboardList, Plus, Trash2, Calendar, FileText, CheckCircle } from 'lucide-react';
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
    plantillaId: '',
    hotel_id: activeHotelId || ''
  });

  const [newTemplate, setNewTemplate] = useState({ nombre: '', items: [] as string[], hotel_id: activeHotelId || '' });
  const [newTemplateItem, setNewTemplateItem] = useState('');

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
        plantillaId: '',
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
                    <span>Vinculado a: {templates.find(t => t.id === m.plantillaId)?.nombre || 'Checklist General'}</span>
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

      {/* Modal: Nueva Tarea */}
      <Modal
        isOpen={isAddingMaint}
        onClose={() => setIsAddingMaint(false)}
        title="Programar Mantenimiento"
        maxWidth="600px"
      >
        <form onSubmit={handleAddMaint} className="flex flex-col gap-md">
          <div className="form-group">
            <label>Título de la Tarea</label>
            <input 
              type="text" 
              required 
              value={newMaint.titulo}
              onChange={e => setNewMaint({...newMaint, titulo: e.target.value})}
              placeholder="Ej: Revisión mensual de Aire Acondicionado"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-md">
            <div className="form-group">
              <label>Frecuencia</label>
              <select 
                value={newMaint.frecuencia}
                onChange={e => setNewMaint({...newMaint, frecuencia: e.target.value})}
              >
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div className="form-group">
              <label>Próxima Fecha</label>
              <input 
                type="date" 
                required
                value={newMaint.proxima_fecha}
                onChange={e => setNewMaint({...newMaint, proxima_fecha: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Plantilla de Revisión (Opcional)</label>
            <select 
              value={newMaint.plantillaId}
              onChange={e => setNewMaint({...newMaint, plantillaId: e.target.value})}
            >
              <option value="">Sin plantilla</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Descripción / Notas</label>
            <textarea 
              value={newMaint.descripcion}
              onChange={e => setNewMaint({...newMaint, descripcion: e.target.value})}
              placeholder="Detalles específicos para el equipo técnico..."
              rows={3}
            />
          </div>

          <div className="modal-footer px-none pt-md">
            <Button type="button" variant="ghost" onClick={() => setIsAddingMaint(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">Crear Tarea</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Nueva Plantilla */}
      <Modal
        isOpen={isAddingTemplate}
        onClose={() => setIsAddingTemplate(false)}
        title="Nueva Plantilla de Revisión"
      >
        <form onSubmit={handleAddTemplate} className="flex flex-col gap-md">
          <div className="form-group">
            <label>Nombre de la Plantilla</label>
            <input 
              type="text" 
              required 
              value={newTemplate.nombre}
              onChange={e => setNewTemplate({...newTemplate, nombre: e.target.value})}
              placeholder="Ej: Checklist Habitaciones"
            />
          </div>

          <div className="form-group">
            <label>Añadir Elementos de Revisión</label>
            <div className="flex gap-sm">
              <input 
                type="text" 
                value={newTemplateItem}
                onChange={e => setNewTemplateItem(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTemplateItem.trim()) {
                      setNewTemplate({...newTemplate, items: [...newTemplate.items, newTemplateItem.trim()]});
                      setNewTemplateItem('');
                    }
                  }
                }}
                placeholder="Escribe y presiona Enter..."
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={() => {
                  if (newTemplateItem.trim()) {
                    setNewTemplate({...newTemplate, items: [...newTemplate.items, newTemplateItem.trim()]});
                    setNewTemplateItem('');
                  }
                }}
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-xs py-sm min-h-[40px]">
            {newTemplate.items.map((item, i) => (
              <Badge key={i} variant="neutral" className="flex items-center gap-2">
                {item}
                <button 
                  type="button"
                  onClick={() => setNewTemplate({...newTemplate, items: newTemplate.items.filter((_, idx) => idx !== i)})}
                  className="hover:text-danger"
                >
                  <Trash2 size={10} />
                </button>
              </Badge>
            ))}
          </div>

          <div className="modal-footer px-none pt-md">
            <Button type="button" variant="ghost" onClick={() => setIsAddingTemplate(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={newTemplate.items.length === 0}>Guardar Plantilla</Button>
          </div>
        </form>
      </Modal>

      <style>{`
        .maintenance-card, .template-card {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
        }
        .maintenance-card:hover, .template-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px -10px rgba(99, 102, 241, 0.15);
        }
        .hover-glow:hover {
          box-shadow: 0 0 30px -5px rgba(99, 102, 241, 0.2);
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};
    </div>
  );
};
