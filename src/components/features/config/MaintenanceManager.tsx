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

  // Sync hotel_id when activeHotelId changes
  React.useEffect(() => {
    if (activeHotelId) {
      setNewMaint(prev => ({ ...prev, hotel_id: activeHotelId }));
      setNewTemplate(prev => ({ ...prev, hotel_id: activeHotelId }));
    }
  }, [activeHotelId]);
  const [newTemplateItem, setNewTemplateItem] = useState('');

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

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex gap-md mb-md">
        <Button 
          variant={activeSubTab === 'tareas' ? 'primary' : 'secondary'} 
          onClick={() => setActiveSubTab('tareas')}
          icon={Calendar}
        >
          Tareas Programadas
        </Button>
        <Button 
          variant={activeSubTab === 'plantillas' ? 'primary' : 'secondary'} 
          onClick={() => setActiveSubTab('plantillas')}
          icon={FileText}
        >
          Plantillas Checkbox
        </Button>
      </div>

      {activeSubTab === 'tareas' ? (
        <Card className="table-panel">
          <div className="panel-header border-b">
            <div className="flex items-center gap-md">
              <Calendar size={20} className="text-accent" />
              <h3 className="text-lg font-semibold">Mantenimiento Preventivo</h3>
            </div>
            <Button size="sm" onClick={() => setIsAddingMaint(true)} icon={Plus}>
              Nueva Tarea
            </Button>
          </div>
          <div className="panel-body p-none">
            <div className="table-responsive">
              <table className="config-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Frecuencia</th>
                    <th>Próxima Ejecución</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map(m => (
                    <tr key={m.id}>
                      <td className="font-medium">{m.titulo}</td>
                      <td><Badge variant="neutral">{m.frecuencia?.toUpperCase()}</Badge></td>
                      <td>{new Date(m.proxima_fecha).toLocaleDateString()}</td>
                      <td><Badge variant="success">ACTIVO</Badge></td>
                      <td>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-danger"
                          onClick={() => configService.delete('mantenimiento_preventivo', m.id).then(onRefresh)}
                          icon={Trash2}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="panel-header border-b">
            <div className="flex items-center gap-md">
              <ClipboardList size={20} className="text-accent" />
              <h3 className="text-lg font-semibold">Plantillas de Revisión</h3>
            </div>
            <Button size="sm" onClick={() => setIsAddingTemplate(true)} icon={Plus}>
              Nueva Plantilla
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md p-md">
            {templates.map(t => (
              <div key={t.id} className="glass card p-md border border-white/5 rounded-lg">
                <div className="flex justify-between items-center mb-sm">
                  <h4 className="font-bold">{t.nombre}</h4>
                  <Button variant="ghost" size="sm" className="text-danger" onClick={() => configService.delete('mantenimiento_plantillas', t.id).then(onRefresh)} icon={Trash2} />
                </div>
                <div className="flex flex-wrap gap-xs">
                  {t.items?.map((item: string, i: number) => (
                    <Badge key={i} variant="neutral" className="text-[10px]">{item}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
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
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTemplateItem.trim()) {
                      setNewTemplate.items.push(newTemplateItem.trim());
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
    </div>
  );
};
