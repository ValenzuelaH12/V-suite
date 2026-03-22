import { useState, useRef, useEffect } from 'react'
import { Send, Image as ImageIcon, Video, Paperclip, Check, CheckCheck, RefreshCw, Plus, Users, Search, MessageSquare, X, Trash2, Mic, Square, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useNotifications } from '../context/NotificationContext'
import { useToast } from '../components/Toast'
import { NewChatModal } from '../components/features/chat/NewChatModal'
import { MessageBubble } from '../components/features/chat/MessageBubble'
import { ChatSidebar } from '../components/features/chat/ChatSidebar'
import { DeleteConfirmationModal } from '../components/features/chat/DeleteConfirmationModal'
import { ChatInput } from '../components/features/chat/ChatInput'

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
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'message' | 'chat';
    id: number | string | null;
    title: string;
    description: string;
  }>({
    show: false,
    type: 'message',
    id: null,
    title: '',
    description: ''
  })
  
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
        const isMsgChange = payload.new?.channel === activeChannel || payload.old?.channel === activeChannel
        if (isMsgChange) {
          fetchMessages()
          if (payload.eventType === 'INSERT') {
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
    if (!window.MediaRecorder) {
      toast.error('Tu navegador no soporta grabación de audio')
      return
    }

    try {
      console.log('Solicitando micrófono...')
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
      console.log('Grabación iniciada')
    } catch (error: any) {
      console.error('Error al acceder al micrófono:', error)
      toast.error('No se pudo acceder al micrófono. Verifica los permisos.')
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
            nombre: channelName,
            type: 'direct',
            created_by: profile.id
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

  const handleDeleteMessage = (messageId: number) => {
    setDeleteConfirm({
      show: true,
      type: 'message',
      id: messageId,
      title: '¿Eliminar mensaje?',
      description: 'Esta acción no se puede deshacer y el mensaje desaparecerá para todos.'
    })
  }

  const handleDeleteChat = () => {
    const channelName = getChannelDisplayName(activeChannelInfo)
    const isFixedChannel = ['general', 'mantenimiento', 'limpieza', 'direccion'].includes(activeChannel)
    
    setDeleteConfirm({
      show: true,
      type: 'chat',
      id: activeChannel,
      title: isFixedChannel ? '¿Vaciar chat?' : '¿Eliminar conversación?',
      description: isFixedChannel 
        ? `¿Confirmas que quieres borrar todos los mensajes y archivos del canal "${channelName}"?`
        : `¿Confirmas que quieres eliminar la conversación con "${channelName}"? Se borrará todo el historial y desaparecerá de tu lista.`
    })
  }

  const confirmDelete = async () => {
    const { type, id } = deleteConfirm
    if (!id) return

    try {
      if (type === 'message') {
        const { error } = await supabase
          .from('mensajes')
          .delete()
          .eq('id', id)

        if (error) throw error
        setMessages(prev => prev.filter(m => m.id !== id))
        toast.success('Mensaje eliminado')
      } else {
        const isFixedChannel = ['general', 'mantenimiento', 'limpieza', 'direccion'].includes(id as string)
        
        // 1. Obtener mensajes con media para borrar archivos del storage
        const { data: msgsWithMedia } = await supabase
          .from('mensajes')
          .select('media_url')
          .eq('channel', id)
          .not('media_url', 'is', null)

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

        // 2. Borrar historial
        const { error: msgError } = await supabase
          .from('mensajes')
          .delete()
          .eq('channel', id)

        if (msgError) throw msgError

        // 3. Si NO es un canal fijo, borrar el canal y sus miembros
        if (!isFixedChannel) {
          await supabase.from('canal_miembros').delete().eq('canal_id', id)
          await supabase.from('canales').delete().eq('id', id)
          
          toast.success('Conversación eliminada')
          setActiveChannel('general')
          fetchChannelsAndUsers()
        } else {
          setMessages([])
          toast.success('Chat vaciado correctamente')
        }
      }
    } catch (error: any) {
      console.error('Error in deletion:', error)
      toast.error('No tienes permisos o ocurrió un error')
    } finally {
      setDeleteConfirm(prev => ({ ...prev, show: false }))
    }
  }

  return (
    <div className="chat-page">
      <div className="chat-layout glass-card">
        
        <ChatSidebar 
          channels={channels}
          activeChannel={activeChannel}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onChannelSelect={(id) => {
            setActiveChannel(id)
            setShowChatMobile(true)
          }}
          onNewChat={() => setShowNewChatModal(true)}
          showChatMobile={showChatMobile}
          profile={profile}
          getChannelDisplayName={getChannelDisplayName}
          unreadPerChannel={unreadPerChannel}
        />

        {/* Área de Chat Activo */}
        <div className={`chat-main ${!showChatMobile ? 'mobile-hidden' : ''}`}>
          <div className="chat-header border-b">
            <div className="flex items-center gap-xs">
              <button 
                className="btn-icon btn-ghost mobile-only-flex mr-xs" 
                onClick={() => setShowChatMobile(false)}
                title="Volver a la lista"
              >
                <ArrowLeft size={20} className="text-accent" />
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
                <MessageBubble 
                  key={msg.id}
                  msg={msg}
                  profile={profile}
                  showAvatar={showAvatar}
                  onDelete={handleDeleteMessage}
                  onOpenMedia={(url) => window.open(url, '_blank')}
                />
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

          <ChatInput
            newMessage={newMessage}
            onNewMessageChange={setNewMessage}
            onSend={handleSend}
            onFileClick={handleFileClick}
            fileType={fileType}
            onFileUpload={handleFileUpload}
            isRecording={isRecording}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            uploading={uploading}
            fileInputRef={fileInputRef}
          />
        </div>
      </div>

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        allUsers={allUsers}
        onCreateDirectMessage={handleCreateDirectMessage}
      />

      <DeleteConfirmationModal 
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, show: false }))}
        onConfirm={confirmDelete}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
      />

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

        .msg-delete-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 10;
        }

        .message.received .msg-delete-btn {
          right: auto;
          left: -8px;
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
        
        .audio-player {
          width: 100%;
          border-radius: var(--radius-full);
          height: 36px;
        }
        
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
