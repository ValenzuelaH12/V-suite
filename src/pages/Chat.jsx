import { useState, useRef, useEffect } from 'react'
import { Send, Image as ImageIcon, Video, Paperclip, Check, CheckCheck, RefreshCw, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useNotifications } from '../context/NotificationContext'

export default function Chat() {
  const { profile } = useAuth()
  const [activeChannel, setActiveChannel] = useState('general')
  const [messages, setMessages] = useState([])
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const { unreadPerChannel, clearChannelUnread } = useNotifications()
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const [fileType, setFileType] = useState('image/*')
  const [showChatMobile, setShowChatMobile] = useState(false)
  
  const activeChannelInfo = channels.find(c => c.id === activeChannel)

  useEffect(() => {
    // Pedir permiso para notificaciones
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [])

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase.from('canales').select('*').order('created_at', { ascending: true })
      if (error) throw error
      setChannels(data)
    } catch (error) {
      console.error('Error fetching channels:', error)
    }
  }

  useEffect(() => {
    if (channels.length === 0) return
    
    fetchMessages()
    
    // Limpiar contador al entrar al canal
    clearChannelUnread(activeChannel)

    const channel = supabase
      .channel('chat_messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mensajes',
      }, (payload) => {
        const isNew = payload.eventType === 'INSERT'
        const msg = payload.new
        if (isNew && msg) {
          // Solo refrescamos si es del canal activo
          if (msg.channel === activeChannel) {
            fetchMessages()
            // Si estamos viendo el chat, nos aseguramos de que se marque como leído
            clearChannelUnread(activeChannel)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChannel, channels.length])

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('mensajes')
        .select(`
          *,
          sender:perfiles!sender_id(nombre, rol)
        `)
        .eq('channel', activeChannel)
        .order('created_at', { ascending: true })

      if (error) throw error

      const formatted = data.map(m => ({
        id: m.id,
        text: m.text_content,
        sender: m.sender?.nombre || 'Desconocido',
        role: m.sender?.rol || 'Staff',
        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: m.sender_id === profile?.id,
        read: m.read,
        mediaUrl: m.media_url,
        mediaType: m.media_type
      }))

      setMessages(formatted)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileClick = (type) => {
    setFileType(type)
    setTimeout(() => fileInputRef.current?.click(), 100)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !profile) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${activeChannel}/${fileName}`

      const { data, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath)

      await supabase.from('mensajes').insert([{
        channel: activeChannel,
        text_content: file.type.startsWith('image/') ? '📷 Foto' : file.type.startsWith('video/') ? '🎥 Vídeo' : '📎 Archivo',
        sender_id: profile.id,
        media_url: publicUrl,
        media_type: file.type
      }])

    } catch (error) {
      alert('Error subiendo archivo: ' + error.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !profile) return

    const pendingMsg = newMessage
    setNewMessage('')

    try {
      const { error } = await supabase
        .from('mensajes')
        .insert([{
          channel: activeChannel,
          text_content: pendingMsg,
          sender_id: profile.id
        }])

      if (error) throw error
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <div className="chat-page animate-fade-in">
      <div className="chat-layout glass-card">
        
        {/* Lista de Conversaciones */}
        <div className={`chat-sidebar border-r ${showChatMobile ? 'mobile-hidden' : ''}`}>
          <div className="chat-sidebar-header border-b">
            <div className="flex items-center justify-between">
              <h3>Mensajes</h3>
            </div>
            <div className="search-bar variant-small mt-md">
              <input type="text" placeholder="Buscar chat..." className="search-input" />
            </div>
          </div>
          
          <div className="conversation-list">
            {channels.map(channel => {
              return (
                <div 
                  key={channel.id} 
                  className={`channel-item ${activeChannel === channel.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveChannel(channel.id)
                    setShowChatMobile(true)
                  }}
                >
                  <div className={`avatar ${channel.id === 'general' ? 'avatar-gradient' : channel.id === 'mantenimiento' ? 'bg-info-light text-info' : channel.id === 'limpieza' ? 'bg-success-light text-success' : 'bg-secondary text-muted'}`}>
                    {channel.nombre?.charAt(0).toUpperCase()}
                  </div>
                  <div className="conversation-details">
                    <div className="conversation-top">
                      <h4>{channel.nombre}</h4>
                    </div>
                    {unreadPerChannel[channel.id] > 0 && (
                      <div className="unread-badge">{unreadPerChannel[channel.id]}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Área de Chat Activo */}
        <div className={`chat-main ${!showChatMobile ? 'mobile-hidden' : ''}`}>
          <div className="chat-header border-b">
            <div className="active-chat-info">
              <button className="btn-icon btn-ghost mobile-only mr-sm" onClick={() => setShowChatMobile(false)}>
                <RefreshCw size={18} style={{ transform: 'rotate(-90deg)' }} />
              </button>
              <div className={`avatar ${activeChannelInfo?.id === 'general' ? 'avatar-gradient' : activeChannelInfo?.id === 'mantenimiento' ? 'bg-info-light text-info' : activeChannelInfo?.id === 'limpieza' ? 'bg-success-light text-success' : 'bg-secondary text-muted'}`}>
                {activeChannelInfo?.nombre?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2>{activeChannelInfo?.nombre}</h2>
                <span className="text-sm text-success">● Staff Online</span>
              </div>
            </div>
          </div>
          
          <div className="messages-container">
            {messages.map((msg, index) => {
              const showAvatar = index === 0 || messages[index - 1].sender !== msg.sender
              
              return (
                <div key={msg.id} className={`message-wrapper ${msg.isMe ? 'is-me' : 'is-other'}`}>
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
                    
                    <div className={`message ${msg.isMe ? 'sent' : 'received'}`}>
                      {msg.mediaUrl && (
                        <div className="message-media mb-sm">
                          {msg.mediaType?.startsWith('image/') ? (
                            <img src={msg.mediaUrl} alt="Media" className="media-preview" onClick={() => window.open(msg.mediaUrl, '_blank')} />
                          ) : msg.mediaType?.startsWith('video/') ? (
                            <video src={msg.mediaUrl} controls className="media-preview" />
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
            })}
            {uploading && (
              <div className="message-wrapper is-me">
                <div className="message-content">
                  <div className="message-bubble bg-primary opacity-70">
                    <p className="flex items-center gap-sm italic">
                      <RefreshCw size={14} className="animate-spin" /> Subiendo archivo...
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="chat-input-area border-t">
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept={fileType}
              onChange={handleFileUpload}
            />
            
            <button type="button" className="btn-icon btn-ghost text-muted" onClick={() => handleFileClick('*/*')}>
              <Paperclip size={20} />
            </button>
            <button type="button" className="btn-icon btn-ghost text-muted" onClick={() => handleFileClick('image/*')}>
              <ImageIcon size={20} />
            </button>
            <button type="button" className="btn-icon btn-ghost text-muted" onClick={() => handleFileClick('video/*')}>
              <Video size={20} />
            </button>
            
            <input 
              type="text" 
              className="chat-input" 
              placeholder="Escribe un mensaje..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={uploading}
            />
            
            <button 
              type="submit" 
              className={`btn-icon ${newMessage.trim() ? 'btn-primary' : 'btn-secondary text-muted'}`}
              disabled={!newMessage.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .chat-page {
          height: calc(100vh - var(--header-height) - calc(var(--spacing-xl) * 2));
          display: flex;
          flex-direction: column;
        }

        .chat-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
          background: rgba(17, 17, 40, 0.4);
        }

        .chat-sidebar {
          width: 320px;
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.2);
        }

        .chat-sidebar-header {
          padding: var(--spacing-lg);
        }

        .chat-sidebar-header h3 {
          font-weight: 700;
          font-size: var(--font-size-lg);
        }

        .conversation-list {
          flex: 1;
          overflow-y: auto;
        }

        .channel-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: 1.125rem 1.25rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          position: relative;
        }

        .channel-item:hover {
          background: rgba(255, 255, 255, 0.03);
          transform: translateX(2px);
        }

        .channel-item.active {
          background: rgba(99, 102, 241, 0.08);
        }
        
        .channel-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--color-accent);
        }

        .conversation-details {
          flex: 1;
          min-width: 0;
        }

        .conversation-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 2px;
        }

        .conversation-top h4 {
          font-size: var(--font-size-md);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .time {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
        }

        .last-message {
          font-size: var(--font-size-sm);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .unread-badge {
          background: var(--color-accent);
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0 6px;
          min-width: 20px;
          height: 20px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .chat-header {
          padding: var(--spacing-md) var(--spacing-lg);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0, 0, 0, 0.1);
        }

        .active-chat-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .active-chat-info h2 {
          font-size: var(--font-size-md);
          font-weight: 600;
        }

        .messages-container {
          flex: 1;
          padding: var(--spacing-lg);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .message-wrapper {
          display: flex;
          gap: var(--spacing-md);
          max-width: 80%;
        }

        .message-wrapper.is-me {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .message-wrapper.is-other {
          align-self: flex-start;
        }

        .avatar-placeholder { width: 32px; flex-shrink: 0; }
        .ml-none { margin-left: 0; }

        .message-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .is-me .message-content { align-items: flex-end; }
        .is-other .message-content { align-items: flex-start; }

        .message-sender {
          font-size: var(--font-size-xs);
          font-weight: 600;
          color: var(--color-text-secondary);
          margin-bottom: 2px;
          padding: 0 4px;
        }

        .message-role { color: var(--color-text-muted); font-weight: normal; }

        .message-meta {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          font-size: 0.65rem;
          opacity: 0.7;
        }
        .message {
          max-width: 80%;
          padding: 0.875rem 1.125rem;
          border-radius: var(--radius-lg);
          font-size: var(--font-size-md);
          line-height: 1.5;
          position: relative;
          box-shadow: var(--shadow-sm);
          animation: messageSlideIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }

        @keyframes messageSlideIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .message.sent {
          align-self: flex-end;
          background: var(--color-accent-gradient);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message.received {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--color-text-primary);
          border-bottom-left-radius: 4px;
        }

        .chat-input-area {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md) var(--spacing-lg);
          background: rgba(0, 0, 0, 0.2);
        }

        .chat-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--color-border);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-full);
          color: var(--color-text-primary);
          transition: all var(--transition-fast);
        }

        .chat-input:focus {
          border-color: var(--color-accent);
          background: rgba(255, 255, 255, 0.08);
        }

        .mb-sm { margin-bottom: var(--spacing-sm); }
        .gap-sm { gap: var(--spacing-sm); }
        .flex-wrap { flex-wrap: wrap; }
        .gap-xs { gap: var(--spacing-xs); }
        .opacity-70 { opacity: 0.7; }
        .italic { font-style: italic; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .media-preview {
          max-width: 100%;
          max-height: 300px;
          border-radius: var(--radius-md);
          display: block;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .media-preview:hover { transform: scale(1.02); }
        
        .file-attachment {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
          color: white;
          text-decoration: none;
          font-size: var(--font-size-sm);
        }
        .file-attachment:hover { background: rgba(255, 255, 255, 0.2); }

        .mr-sm { margin-right: var(--spacing-sm); }

        @media (max-width: 768px) {
          .chat-sidebar { 
            width: 100%;
            border-right: none;
          }
          .chat-main {
            width: 100%;
          }
          .mobile-hidden {
            display: none;
          }
          .message-wrapper { max-width: 92%; }
          .chat-input-area { padding: var(--spacing-sm); }
          .chat-header { padding: var(--spacing-sm) var(--spacing-md); }
          .active-chat-info h2 { font-size: var(--font-size-sm); }
        }
      `}</style>
    </div>
  )
}
