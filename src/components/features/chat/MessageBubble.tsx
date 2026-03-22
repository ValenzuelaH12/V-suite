import { Trash2, Paperclip, CheckCheck, Check } from 'lucide-react'

export function MessageBubble({ 
  msg, 
  profile, 
  showAvatar, 
  onDelete, 
  onOpenMedia 
}: { 
  msg: any
  profile: any
  showAvatar: boolean
  onDelete: (id: number) => void
  onOpenMedia: (url: string) => void
}) {
  return (
    <div className={`message-wrapper ${msg.isMe ? 'is-me' : 'is-other'}`}>
      {!msg.isMe && showAvatar ? (
        <div className="avatar avatar-sm avatar-gradient ml-none">
          {msg.sender.charAt(0)}
        </div>
      ) : (
        !msg.isMe && <div className="avatar-placeholder"></div>
      )}
      
      <div className="message-content">
        {!msg.isMe && showAvatar && (
          <span className="message-sender">
            {msg.sender} <span className="message-role">({msg.role})</span>
          </span>
        )}
        
        <div className={`message ${msg.isMe ? 'sent' : 'received'} group relative`}>
          {(msg.isMe || ['admin', 'super_admin', 'direccion'].includes(profile?.rol)) && (
            <button 
              className="msg-delete-btn opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDelete(msg.id)}
              title="Eliminar mensaje"
            >
              <Trash2 size={12} />
            </button>
          )}
          {msg.mediaUrl && (
            <div className="message-media mb-sm">
              {msg.mediaType?.startsWith('image/') ? (
                <img src={msg.mediaUrl} alt="Media" className="media-preview" onClick={() => onOpenMedia(msg.mediaUrl)} />
              ) : msg.mediaType?.startsWith('video/') ? (
                <video src={msg.mediaUrl} controls className="media-preview" />
              ) : msg.mediaType?.startsWith('audio/') ? (
                <audio src={msg.mediaUrl} controls className="audio-player" />
              ) : (
                <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="file-attachment">
                  <Paperclip size={16} /> Ver archivo adjunto
                </a>
              )}
            </div>
          )}
          <p>{msg.text}</p>
          <div className="message-meta">
            <span className="message-time">{msg.time}</span>
            {msg.isMe && (
              <span className="message-status">
                {msg.read ? <CheckCheck size={14} className="text-info" /> : <Check size={14} />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
