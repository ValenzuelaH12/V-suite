import React, { useState, useEffect } from 'react';
import { History, Shield, User, Calendar, Search, Filter, RefreshCw, FileText, Trash2, Edit2, Plus, Power, ShieldCheck } from 'lucide-react';
import { auditService, AuditLog } from '../../../services/auditService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../../context/AuthContext';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const { profile } = useAuth();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.getAll(profile?.hotel_id);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [profile?.hotel_id]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ELIMINACION': return <Trash2 size={14} className="text-rose-400" />;
      case 'CREACION': return <Plus size={14} className="text-emerald-400" />;
      case 'ACTUALIZACION': return <Edit2 size={14} className="text-amber-400" />;
      case 'CAMBIO_ESTADO': return <Power size={14} className="text-sky-400" />;
      case 'LOGIN': return <ShieldCheck size={14} className="text-violet-400" />;
      default: return <FileText size={14} className="text-muted" />;
    }
  };

  const getEntityLabel = (entity: string) => {
    switch (entity) {
      case 'USUARIO': return { label: 'Usuario', icon: <User size={10} /> };
      case 'HOTEL': return { label: 'Hotel', icon: <Plus size={10} /> };
      case 'INCIDENCIA': return { label: 'Incidencia', icon: <History size={10} /> };
      case 'TIPO_INCIDENCIA': return { label: 'Categoría', icon: <Shield size={10} /> };
      default: return { label: entity, icon: <FileText size={10} /> };
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_nombre?.toLowerCase().includes(filter.toLowerCase()) || 
      log.descripcion.toLowerCase().includes(filter.toLowerCase());
    const matchesEntity = entityFilter === 'ALL' || log.entidad === entityFilter;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-lg animate-fade-in">
      <div className="v-glass-card p-lg border-white/5">
        <div className="flex flex-col md:flex-row gap-md justify-between items-center">
          <div className="flex items-center gap-md">
            <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20">
              <History size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Registro de Auditoría</h3>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Control de trazabilidad y seguridad V-Suite</p>
            </div>
          </div>
          
          <div className="flex gap-sm w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input 
                type="text" 
                placeholder="Buscar por usuario o acción..."
                className="input pl-10 text-xs w-full"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            <select 
              className="select text-xs w-32 bg-black/40"
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value)}
            >
              <option value="ALL">Todo</option>
              <option value="USUARIO">Usuarios</option>
              <option value="HOTEL">Hoteles</option>
              <option value="INCIDENCIA">Incidencias</option>
              <option value="TIPO_INCIDENCIA">Categorías</option>
            </select>
            <button onClick={fetchLogs} className="btn btn-secondary p-sm bg-white/5 hover:bg-white/10" title="Refrescar">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="v-glass-card overflow-hidden border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="p-4 text-[10px] font-black uppercase text-muted tracking-widest">Hora / Fecha</th>
                <th className="p-4 text-[10px] font-black uppercase text-muted tracking-widest">Operador</th>
                <th className="p-4 text-[10px] font-black uppercase text-muted tracking-widest">Acción</th>
                <th className="p-4 text-[10px] font-black uppercase text-muted tracking-widest">Entidad</th>
                <th className="p-4 text-[10px] font-black uppercase text-muted tracking-widest">Descripción Táctica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <RefreshCw size={30} className="animate-spin text-muted mx-auto mb-md" />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-muted italic">
                    No se han encontrado registros en el historial.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const entity = getEntityLabel(log.entidad);
                  return (
                    <tr key={log.id} className="group hover:bg-white/5 transition-colors duration-300">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono text-white opacity-80">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                          <span className="text-[9px] text-muted">{format(new Date(log.created_at), 'dd MMM yyyy', { locale: es })}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-sm">
                          <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold border border-accent/20">
                            {log.user_nombre?.[0] || '?'}
                          </div>
                          <span className="text-xs font-bold text-white mb-none p-none inline">{log.user_nombre}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-xs">
                          {getActionIcon(log.accion)}
                          <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">{log.accion}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-xs px-2 py-1 bg-white/5 rounded-lg border border-white/5 w-fit">
                          {React.cloneElement(entity.icon as React.ReactElement<any>, { size: 10, className: 'text-muted' })}
                          <span className="text-[10px] uppercase font-bold text-muted">{entity.label}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-[11px] text-white/90 font-medium">
                          {log.descripcion}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
