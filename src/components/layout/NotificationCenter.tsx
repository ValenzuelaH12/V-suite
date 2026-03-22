import React, { useState } from 'react';
import { Bell, Check, Trash2, ExternalLink, Calendar, MessageSquare, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useNotifications } from '../../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { dbNotifications, markAsRead, totalUnread } = useNotifications();
  
  const unreadCount = dbNotifications.filter(n => !n.read).length + totalUnread;

  const getIcon = (type: string) => {
    switch (type) {
      case 'incident': return <AlertTriangle size={16} className="text-danger" />;
      case 'chat': return <MessageSquare size={16} className="text-accent" />;
      case 'maintenance': return <ShieldCheck size={16} className="text-success" />;
      default: return <Bell size={16} className="text-muted" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="btn-icon btn-ghost relative overflow-visible"
        title="Notificaciones"
      >
        <Bell size={20} className={unreadCount > 0 ? 'animate-pulse text-white' : 'text-muted'} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(var(--color-danger),0.5)]">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 v-glass-card p-0 shadow-2xl z-50 animate-scale-in border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
            <h3 className="font-bold text-sm uppercase tracking-widest text-white">Notificaciones</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAsRead()}
                className="text-[10px] font-black uppercase text-accent hover:underline"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {dbNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="mx-auto text-muted/20 mb-2" />
                <p className="text-xs text-muted font-bold uppercase tracking-widest">No hay notificaciones</p>
              </div>
            ) : (
              dbNotifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.link) window.location.href = notif.link;
                    setIsOpen(false);
                  }}
                  className={`p-4 border-b border-white/5 cursor-pointer transition-colors relative group
                    ${!notif.read ? 'bg-accent/5' : 'hover:bg-white/5'}
                  `}
                >
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 
                      ${!notif.read ? 'bg-accent/20' : 'bg-white/5'}
                    `}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-width-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate">{notif.title}</span>
                        <span className="text-[9px] text-muted font-bold whitespace-nowrap">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                  {!notif.read && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_5px_var(--color-accent)]" />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-black/20 border-t border-white/5 text-center">
             <button className="text-[10px] font-bold text-muted hover:text-white uppercase tracking-widest transition-colors">
               Ver todo el historial
             </button>
          </div>
        </div>
      )}
      
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
