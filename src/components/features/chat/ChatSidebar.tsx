import { Plus } from 'lucide-react'

export function ChatSidebar({
  channels,
  activeChannel,
  searchQuery,
  onSearchChange,
  onChannelSelect,
  onNewChat,
  showChatMobile,
  profile,
  getChannelDisplayName,
  unreadPerChannel
}: {
  channels: any[]
  activeChannel: string
  searchQuery: string
  onSearchChange: (val: string) => void
  onChannelSelect: (id: string) => void
  onNewChat: () => void
  showChatMobile: boolean
  profile: any
  getChannelDisplayName: (channel: any) => string
  unreadPerChannel: Record<string, number>
}) {
  const renderChannelItem = (channel: any) => {
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
        onClick={() => onChannelSelect(channel.id)}
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

  return (
    <div className={`chat-sidebar border-r ${showChatMobile ? 'mobile-hidden' : ''}`}>
      <div className="chat-sidebar-header border-b">
        <div className="flex items-center justify-between">
          <h3>Mensajes</h3>
          <button 
            className="btn-icon btn-ghost text-primary" 
            onClick={onNewChat}
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
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      
      <div className="conversation-list">
        <div className="chat-section">
          <h5 className="section-title">Canales de Equipo</h5>
          {channels
            .filter(c => c?.id && !c.id.startsWith('dm_'))
            .filter(c => {
              if (c.id === 'direccion' && !['direccion', 'admin'].includes(profile?.rol)) return false
              return true
            })
            .filter(c => getChannelDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase()))
            .map(channel => renderChannelItem(channel))}
        </div>

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
  )
}
