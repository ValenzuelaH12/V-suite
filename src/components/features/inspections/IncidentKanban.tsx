import React from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Clock, CheckCircle, Search, AlertCircle, MapPin, MoreVertical } from 'lucide-react';

const STATUS_COLUMNS = [
  { id: 'pendiente', label: 'Pendiente', color: 'danger', icon: AlertCircle },
  { id: 'revision', label: 'Bajo Revisión', color: 'info', icon: Search },
  { id: 'proceso', label: 'En Proceso', color: 'warning', icon: Clock },
  { id: 'espera', label: 'En Espera', color: 'secondary', icon: Clock },
  { id: 'resuelto', label: 'Resuelto', color: 'success', icon: CheckCircle }
];

const ITEM_TYPE = 'INCIDENT';

const DraggableIncident = ({ incident, onClick }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { id: incident.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    })
  }), [incident.id]);

  return (
    <div 
      ref={drag as any}
      onClick={() => onClick(incident)}
      className={`glass-card p-4 mb-3 cursor-pointer transition-all hover:-translate-y-1 relative overflow-hidden group
        ${isDragging ? 'opacity-40 scale-95 border-accent' : 'hover:border-accent hover:shadow-[0_0_15px_rgba(var(--color-accent),0.2)]'}
      `}
      style={{
        borderTopWidth: '4px',
        borderTopColor: `var(--color-${incident.priority === 'urgent' ? 'danger' : incident.priority === 'high' ? 'danger' : incident.priority === 'medium' ? 'warning' : 'success'})`,
        borderTopStyle: 'solid'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex justify-between items-start mb-2 relative z-10">
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm bg-black/40
          ${incident.priority === 'high' || incident.priority === 'urgent' ? 'text-danger border border-danger/20' : incident.priority === 'medium' ? 'text-warning border border-warning/20' : 'text-success border border-success/20'}
        `}>
          {incident.priority === 'high' ? 'Alta' : incident.priority === 'medium' ? 'Media' : 'Baja'}
        </span>
        <span className="text-[10px] text-muted font-bold font-mono">#{String(incident.id).substring(0,6)}</span>
      </div>
      
      <h4 className="font-bold text-sm mb-3 leading-tight text-white relative z-10">{incident.title}</h4>
      
      <div className="flex flex-col gap-1.5 text-[10px] uppercase font-bold text-muted mb-3 relative z-10 tracking-widest">
        <span className="flex items-center gap-2"><MapPin size={12} className="text-secondary"/> <span className="truncate">{incident.location}</span></span>
        <span className="flex items-center gap-2"><Clock size={12} className="text-secondary"/> {incident.time}</span>
      </div>

      <div className="flex justify-between items-center border-t border-white/10 pt-3 mt-1 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-black shadow-lg">
            {incident.reporter.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-muted tracking-widest uppercase font-bold">Asignado a</span>
            <span className="text-[10px] text-primary font-bold truncate max-w-[80px]">{incident.assignee_name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DroppableColumn = ({ column, incidents, onDrop, onClickIncident }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item: { id: string }) => onDrop(item.id, column.id),
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  }), [column.id, onDrop]);

  return (
    <div 
      ref={drop as any} 
      className={`min-w-[280px] md:min-w-[320px] flex flex-col rounded-2xl p-2 transition-all duration-300 h-full border-2 border-transparent
        ${isOver ? 'bg-white/5 border-accent/50 shadow-[inset_0_0_20px_rgba(var(--color-accent),0.1)]' : 'bg-black/20'}
      `}
    >
      <div className="flex items-center justify-between mb-4 p-2 relative">
        <div className={`absolute bottom-0 left-2 right-2 h-px bg-gradient-to-r from-${column.color} to-transparent opacity-30`} />
        <div className="flex items-center gap-2">
          <column.icon size={16} className={`text-${column.color}`} />
          <h3 className="font-black tracking-widest uppercase text-xs text-white">{column.label}</h3>
        </div>
        <div className="bg-dark/50 border border-white/10 text-white min-w-[24px] h-6 flex items-center justify-center rounded-lg text-[10px] font-black shadow-md">
          {incidents.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-4">
        {incidents.map(inc => (
          <DraggableIncident key={inc.id} incident={inc} onClick={onClickIncident} />
        ))}
        
        {incidents.length === 0 && (
          <div className="border border-dashed border-white/10 rounded-xl h-24 flex items-center justify-center text-muted/50 text-[10px] font-black uppercase tracking-widest bg-dark/20">
            Arrastrar aquí
          </div>
        )}
      </div>
    </div>
  );
};

export const IncidentKanban = ({ incidents, onUpdateStatus, onClickIncident }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar h-[calc(100vh-280px)] min-h-[500px] snap-x">
        {STATUS_COLUMNS.map(col => (
          <div key={col.id} className="snap-center h-full">
            <DroppableColumn 
              column={col}
              incidents={incidents.filter(i => i.status === col.id)}
              onDrop={(id, status) => onUpdateStatus(id, status)}
              onClickIncident={onClickIncident}
            />
          </div>
        ))}
      </div>
    </DndProvider>
  );
};
