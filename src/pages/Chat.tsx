import { useState, useRef, useEffect } from 'react'
import { Send, Image as ImageIcon, Video, Paperclip, Check, CheckCheck, RefreshCw, Plus, Users, Search, MessageSquare, X, Trash2, Mic, Square } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useNotifications } from '../context/NotificationContext'
import { useToast } from '../components/Toast'

export default function Chat() {
  const { profile } = useAuth()
  const toast = useToast()
  const [activeChannel, setActiveChannel] = useState('general')
  const [messages, setMessages] = useState([])
  const [channels, setChannels] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showChatMobile, setShowChatMobile] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [messageSearchQuery, setMessageSearchQuery] = useState('')
  
  const { unreadPerChannel, clearChannelUnread } = useNotifications()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileType, setFileType] = useState('image/*')
  
  const activeChannelInfo = channels.find(c => c.id === activeChannel)

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (profile) {
      fetchChannelsAndUsers()
    }
  }, [profile])

  const fetchChannelsAndUsers = async () => {
    try {
      // 1. Fetch canales
      // Por RLS, esto devolverá públicos + privados donde soy miembro
      const { data: channelsData, error: channelsError } = await supabase
        .from('canales')
        .select('*')
        .order('created_at', { ascending: true })

      if (channelsError) throw channelsError
      setChannels(channelsData)

      // 2. Fetch usuarios para DMs
      const { data: usersData, error: usersError } = await supabase
        .from('perfiles')
        .select('id, nombre, rol')
        .neq('id', profile.id)
        
      if (usersError) throw usersError
      setAllUsers(usersData)
      
    } catch (error: any) {
      console.error('Error fetching channels:', error)
      toast.error('Error cargando canales')
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

      const formatted = data.map(m => {
        // En DMs, marcar como leído provisionalmente a true o confiar en m.read
        const hasBeenReadByOthers = false 

        return {
          id: m.id,
          text: m.text_content,
          sender: m.sender?.nombre || 'Desconocido',
          role: m.sender?.rol || 'Staff',
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: m.sender_id === profile?.id,
          read: m.read || hasBeenReadByOthers,
          mediaUrl: m.media_url,
          mediaType: m.media_type
        }
      })

      setMessages(formatted)

      // Marcar mensajes no leídos automáticamente al abrir
      const unreadIds = data
        .filter(m => m.sender_id !== profile.id)
        .map(m => m.id)

      if (unreadIds.length > 0) {
        await supabase.from('mensajes').update({ read: true }).in('id', unreadIds)
      }

    } catch (error: any) {
      console.error('Error fetching messages:', error)
      toast.error('Error cargando mensajes')
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
      toast.error('Error subiendo archivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSend = async (e: any) => {
    e.preventDefault()
    if (!newMessage.trim() || !profile) return

    setUploading(true)
    try {
      const { error } = await supabase.from('mensajes').insert([{
        channel: activeChannel,
        text_content: newMessage.trim(),
        sender_id: profile.id
      }])
      
      if (error) throw error
      
      setNewMessage('')
    } catch (error: any) {
      toast.error('Error enviando mensaje')
    } finally {
      setUploading(false)
    }
  }

  // --- NOTAS DE VOZ ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        const file = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' })
        
        setUploading(true)
        try {
          const fileName = `${Date.now()}.webm`
          const filePath = `${activeChannel}/${fileName}`
          const { error: uploadError } = await supabase.storage.from('chat-media').upload(filePath, file)
          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(filePath)
          await supabase.from('mensajes').insert([{
            channel: activeChannel,
            text_content: '🎤 Nota de voz',
            sender_id: profile.id,
            media_url: publicUrl,
            media_type: 'audio/webm'
          }])
        } catch (error) {
          toast.error('Error al subir nota de voz')
        } finally {
          setUploading(false)
        }
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      toast.error('No se pudo acceder al micrófono')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleCreateDirectMessage = async (targetUser) => {
    try {
      // Create a unique channel ID for the DM
      const channelId = `dm_${[profile.id, targetUser.id].sort().join('_')}`
      const channelName = profile.nombre + ' & ' + targetUser.nombre

      // Check if channel already exists
      const { data: existingChannel, error: checkError } = await supabase
        .from('canales')
        .select('*')
        .eq('id', channelId)
        .maybeSingle()

      if (!existingChannel) {
        // Create new direct channel
        const { error: insertCanalError } = await supabase
          .from('canales')
          .insert([{ 
            id: channelId, 
            nombre: channelName
          }])

        if (insertCanalError) throw insertCanalError

        // Add both users as members
        const { error: membersError } = await supabase
          .from('canal_miembros')
          .insert([
            { canal_id: channelId, user_id: profile.id },
            { canal_id: channelId, user_id: targetUser.id }
          ])

        if (membersError) throw membersError
      }

      setShowNewChatModal(false)
      await fetchChannelsAndUsers()
      setActiveChannel(channelId)
      setShowChatMobile(true)

    } catch (error) {
      console.error('Error creating DM:', error)
      toast.error('Error creando chat: ' + error.message)
    }
  }

  const getChannelDisplayName = (channel) => {
    if (!channel || !channel.id) return 'Canal'
    // Detectar DM por prefijo del ID en vez de columna 'type'
    if (channel.id.startsWith('dm_')) {
      const names = channel.nombre?.split(' & ') || []
      return names.find(n => n !== profile?.nombre) || 'Usuario'
    }
    return channel.nombre || 'Sin nombre'
  }

  const renderChannelItem = (channel) => {
    const displayName = getChannelDisplayName(channel)
    const firstLetter = displayName?.charAt(0).toUpperCase()
    const isDM = channel?.id?.startsWith('dm_')
    
    let avatarClass = 'bg-secondary text-muted'
    if (channel.id === 'general') avatarClass = 'avatar-gradient'
    else if (channel.id === 'mantenimiento') avatarClass = 'bg-info-light text-info'
    else if (channel.id === 'limpieza') avatarClass = 'bg-success-light text-success'
    else if (channel.id === 'direccion') avatarClass = 'bg-danger-light text-danger'
    else if (isDM) avatarClass = 'bg-accent-light text-accent'

    return (
      <div 
        key={channel.id} 
        className={`channel-item ${activeChannel === channel.id ? 'active' : ''}`}
        onClick={() => {
          setActiveChannel(channel.id)
          setShowChatMobile(true)
        }}
      >
        <div className={`avatar avatar-sm ${avatarClass}`}>
          {firstLetter}
        </div>
        <div className="conversation-details">
          <div className="conversation-top">
            <h4>{isDM ? displayName : `#${displayName}`}</h4>
          </div>
          {unreadPerChannel[channel.id] > 0 && (
            <div className="unread-badge">{unreadPerChannel[channel.id]}</div>
          )}
        </div>
      </div>
    )
  }

  const handleDeleteChat = async () => {
    const channelName = activeChannelInfo?.nombre || activeChannel
    if (!confirm(`¿Eliminar TODOS los mensajes y archivos multimedia del chat "${channelName}"? Esta acción no se puede deshacer.`)) return

    try {
      // 1. Obtener mensajes con media para borrar archivos del storage
      const { data: msgsWithMedia } = await supabase
        .from('mensajes')
        .select('media_url')
        .eq('channel', activeChannel)
        .not('media_url', 'is', null)

      // 2. Borrar archivos del storage (best-effort)
      if (msgsWithMedia && msgsWithMedia.length > 0) {
        const filePaths = msgsWithMedia
          .map(m => {
            try {
              const url = new URL(m.media_url)
              const parts = url.pathname.split('/chat-media/')
              return parts.length > 1 ? parts[1] : null
            } catch { return null }
          })
          .filter(Boolean)

        if (filePaths.length > 0) {
          await supabase.storage.from('chat-media').remove(filePaths)
        }
      }

      // 3. Borrar todos los mensajes del canal
      const { error } = await supabase
        .from('mensajes')
        .delete()
        .eq('channel', activeChannel)

      if (error) throw error

      setMessages([])
      toast.success(`Chat "${channelName}" limpiado correctamente.`)
    } catch (error: any) {
      console.error('Error deleting chat:', error)
      toast.error('Error al borrar el chat')
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
              <button 
                className="btn-icon btn-ghost text-primary" 
                onClick={() => setShowNewChatModal(true)}
                title="Nuevo Chat/Grupo"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="search-bar variant-small mt-md">
              <input 
                type="text" 
                placeholder="Buscar chat..." 
                className="search-input" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="conversation-list">
            {/* Sección de Canales de Equipo */}
            <div className="chat-section">
              <h5 className="section-title">Canales de Equipo</h5>
              {channels
                .filter(c => c?.id && !c.id.startsWith('dm_'))
                .filter(c => {
                  // Filtrado por rol para canales sensibles
                  if (c.id === 'direccion' && !['direccion', 'admin'].includes(profile?.rol)) return false
                  return true
                })
                .filter(c => getChannelDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase()))
                .map(channel => renderChannelItem(channel))}
            </div>

            {/* Sección de Mensajes Directos */}
            <div className="chat-section mt-lg">
              <h5 className="section-title">Mensajes Directos</h5>
              {channels
                .filter(c => c?.id && c.id.startsWith('dm_'))
                .filter(c => getChannelDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase()))
                .map(channel => renderChannelItem(channel))}
              
              {channels.filter(c => c.id.startsWith('dm_')).length === 0 && (
                <p className="text-xs text-muted px-lg italic">Sin mensajes directos</p>
              )}
            </div>
          </div>
        </div>

        {/* Área de Chat Activo */}
        <div className={`chat-main ${!showChatMobile ? 'mobile-hidden' : ''}`}>
          <div className="chat-header border-b">
            <div className="active-chat-info">
              <button className="btn-icon btn-ghost mobile-only mr-sm" onClick={() => setShowChatMobile(false)}>
                <RefreshCw size={18} style={{ transform: 'rotate(-90deg)' }} />
              </button>
              <div className={`avatar ${
                activeChannelInfo?.id === 'general' ? 'avatar-gradient' : 
                activeChannelInfo?.id === 'direccion' ? 'bg-danger-light text-danger' :
                activeChannelInfo?.id === 'mantenimiento' ? 'bg-info-light text-info' : 
                activeChannelInfo?.id === 'limpieza' ? 'bg-success-light text-success' : 
                'bg-secondary text-muted'
              }`}>
                {getChannelDisplayName(activeChannelInfo).charAt(0).toUpperCase()}
              </div>
              <div>
                <h2>{activeChannelInfo?.id?.startsWith('dm_') ? getChannelDisplayName(activeChannelInfo) : `#${activeChannelInfo?.nombre || 'canal'}`}</h2>
                <span className="text-sm text-success">● Staff Online</span>
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <div className="search-bar variant-small hide-mobile" style={{ width: '180px' }}>
                <Search size={14} className="text-muted" />
                <input 
                  type="text" 
                  placeholder="Buscar mensaje..." 
                  className="search-input" 
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                />
              </div>
              <button 
                className="btn-icon btn-ghost" 
                onClick={handleDeleteChat}
                title="Borrar chat y multimedia"
                style={{ color: '#ef4444' }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
          
          <div className="messages-container">
            {messages
              .filter(m => m.text?.toLowerCase().includes(messageSearchQuery.toLowerCase()))
              .map((msg, index, filteredMessages) => {
                const showAvatar = index === 0 || filteredMessages[index - 1].sender !== msg.sender
              
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
            
            <div className="voice-record-container">
              {isRecording ? (
                <button type="button" className="btn-icon btn-danger pulse" onClick={stopRecording}>
                  <Square size={20} fill="currentColor" />
                </button>
              ) : (
                <button type="button" className="btn-icon btn-ghost text-primary" onClick={startRecording}>
                  <Mic size={20} />
                </button>
              )}
            </div>
            
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

      {/* Modal para Nuevo Chat / Chat Privado */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="modal-content glass-card p-none animate-scale-in max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="modal-header border-b p-lg flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-sm">
                <MessageSquare size={24} className="text-primary" /> Nuevo Chat
              </h2>
              <button className="btn-icon btn-ghost" onClick={() => setShowNewChatModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body p-lg">
              <div className="mb-md">
                <h3 className="text-sm font-semibold text-muted mb-sm uppercase tracking-wider">Contactos (Mensaje Directo)</h3>
                <div className="users-list">
                  {allUsers.length > 0 ? (
                    allUsers.map(user => (
                      <div 
                        key={user.id} 
                        className="user-list-item flex items-center gap-md p-md rounded-md cursor-pointer hover-bg-light transition-all"
                        onClick={() => handleCreateDirectMessage(user)}
                      >
                        <div className="avatar bg-primary-light text-primary">
                          {user.nombre?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{user.nombre}</div>
                          <div className="text-xs text-muted capitalize">{user.rol}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted italic p-md">No hay otros usuarios registrados.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .max-w-md { max-width: 28rem; }
        .w-full { width: 100%; }
        .p-none { padding: 0; }
        .p-lg { padding: var(--spacing-lg); }
        .p-md { padding: var(--spacing-md); }
        .mb-sm { margin-bottom: var(--spacing-sm); }
        .mb-md { margin-bottom: var(--spacing-md); }
        .text-xl { font-size: 1.25rem; font-weight: 700; }
        .text-sm { font-size: 0.875rem; }
        .text-xs { font-size: 0.75rem; }
        .font-semibold { font-weight: 600; }
        .font-medium { font-weight: 500; }
        .uppercase { text-transform: uppercase; }
        .tracking-wider { letter-spacing: 0.05em; }
        .capitalize { text-transform: capitalize; }
        .rounded-md { border-radius: 0.375rem; }
        .cursor-pointer { cursor: pointer; }
        .transition-all { transition: all 0.2s; }
        
        .animate-scale-in {
          animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .users-list {
          max-height: 300px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .hover-bg-light:hover {
          background: rgba(255, 255, 255, 0.05);
        }

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

        .section-title {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-text-muted);
          padding: 0 var(--spacing-lg) var(--spacing-sm);
          font-weight: 700;
        }

        .conversation-list {
          flex: 1;
          overflow-y: auto;
          padding-top: var(--spacing-md);
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
          max-width: 85%;
          padding: 0.75rem 1rem;
          border-radius: 18px;
          font-size: 0.9375rem;
          line-height: 1.45;
          position: relative;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .message.sent {
          background: var(--color-accent-gradient);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message.received {
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-text-primary);
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .message-media {
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 8px;
        }
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
