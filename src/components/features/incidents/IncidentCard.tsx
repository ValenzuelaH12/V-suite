import { MoreVertical, MapPin, Clock } from 'lucide-react'

export function IncidentCard({ 
  inc, 
  onClick, 
  STATUS_DETAILS 
}: { 
  inc: any, 
  onClick: (inc: any) => void,
  STATUS_DETAILS: Record<string, any>
}) {
  return (
    <div className="incident-card glass-card">
      <div className="card-top">
        <div className="badges">
          <span className={`badge priority-${inc.priority}`}>
            {inc.priority === 'high' ? 'Alta' : inc.priority === 'medium' ? 'Media' : 'Baja'}
          </span>
          <span className="incident-id text-muted">#{inc.id}</span>
        </div>
        <button className="btn-ghost btn-icon btn-sm">
          <MoreVertical size={16} />
        </button>
      </div>
      
      <div 
        className="incident-content p-lg cursor-pointer group"
        onClick={() => onClick(inc)}
      >
        <div className="flex justify-between items-start mb-sm">
          <h3 className="incident-title px-0 py-none m-none">{inc.title}</h3>
          <span className={`badge priority-${inc.priority} text-[10px] py-none h-fit uppercase`}>
            {inc.priority === 'high' ? 'Alta' : inc.priority === 'medium' ? 'Media' : 'Baja'}
          </span>
        </div>
        
        <div className="incident-details px-0">
          <div className="detail-item">
            <MapPin size={14} className="text-muted" />
            <span>{inc.location}</span>
          </div>
          <div className="detail-item">
            <Clock size={14} className="text-muted" />
            <span>{inc.time}</span>
          </div>
        </div>

        {inc.media_urls?.length > 0 && (
          <div className="media-preview-strip mt-md">
            {inc.media_urls.slice(0, 3).map((url: string, i: number) => (
              <div key={i} className="media-thumb glass rounded-sm overflow-hidden border border-white/10">
                <img src={url} alt="" className="object-cover w-full h-full" />
              </div>
            ))}
            {inc.media_urls.length > 3 && (
              <div className="media-thumb-more glass rounded-sm flex items-center justify-center text-xs text-muted border border-white/10">
                +{inc.media_urls.length - 3}
              </div>
            )}
          </div>
        )}
        
        <div className="mt-md text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-xs font-semibold uppercase tracking-wider">
          Ver detalles <MoreVertical size={10} />
        </div>
      </div>
      
      <div className="card-bottom border-t">
        <div className="reporter">
          <div className="avatar avatar-sm avatar-gradient">
            {inc.reporter.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted truncate max-w-[80px]">{inc.reporter.split(' ')[0]}</span>
            <span className="text-[9px] text-accent font-bold truncate max-w-[80px] hover:text-white transition-colors">
              → {inc.assignee_name}
            </span>
          </div>
        </div>
        
        <div className={`status-pill status-${STATUS_DETAILS[inc.status]?.color || 'secondary'}`}>
          {STATUS_DETAILS[inc.status]?.label || inc.status}
        </div>
      </div>
    </div>
  )
}
