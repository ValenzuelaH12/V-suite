import { Bell, Search, Menu, X, AlertTriangle, Clock, ChevronRight, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { db } from '../../lib/db'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'
import { MessageSquare } from 'lucide-react'
import { HotelSelector } from './HotelSelector'
import { NetworkStatus } from './NetworkStatus'
import { NotificationCenter } from './NotificationCenter'
import { GlobalSearch } from './GlobalSearch'

export default function Header({ toggleSidebar }) {
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const { totalUnread: totalChatUnread, chatNotifications, dismissNotification, clearChannelUnread } = useNotifications()
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('vsuite_seen_notifications')
    return saved ? JSON.parse(saved) : []
  })

  // Search global
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const fetchNotifications = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: incs } = await supabase
        .from('incidencias')
        .select('id, title, priority, created_at')
        .in('status', ['pending', 'in-progress'])
        .order('created_at', { ascending: false })
        .limit(5)

      const { data: mantos } = await supabase
        .from('mantenimiento_preventivo')
        .select('id, titulo, proxima_fecha')
        .lte('proxima_fecha', today)
        .limit(5)

      const formattedNotifications = [
        ...chatNotifications.map(n => ({ ...n, icon: MessageSquare })),
        ...(incs || []).map(i => ({
          id: `inc-${i.id}`, type: 'incidencia', title: i.title,
          subtitle: `Prioridad ${i.priority}`,
          time: new Date(i.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          link: '/incidencias', icon: AlertTriangle,
          color: i.priority === 'high' ? 'danger' : 'warning'
        })),
        ...(mantos || []).map(m => ({
          id: `manto-${m.id}`, type: 'mantenimiento', title: m.titulo,
          subtitle: `Vence: ${m.proxima_fecha}`, time: 'Hoy',
          link: '/planificacion', icon: Clock, color: 'info'
        }))
      ]
      setNotifications(formattedNotifications.filter(n => !seenNotificationIds.includes(n.id)))
    } catch (error) { console.error('Error fetching notifications:', error) }
  }

  const handleNotificationClick = (n) => {
    // Si es chat, limpiar unread del canal
    if (n.type === 'chat') {
      const channelId = n.title.replace('Mensaje en ', '')
      clearChannelUnread(channelId)
    }
    
    // Marcar como vista (para persistencia local)
    const newSeen = [...seenNotificationIds, n.id]
    setSeenNotificationIds(newSeen)
    localStorage.setItem('vsuite_seen_notifications', JSON.stringify(newSeen))
    
    // Remover del estado global si es de chat
    dismissNotification(n.id)
    
    navigate(n.link)
    setShowNotifications(false)
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    
    // Listeners de Red
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [seenNotificationIds])

  useEffect(() => {
    const fetchPendingCount = async () => {
      const count = await db.offline_mutations.count();
      setPendingSyncCount(count);
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Búsqueda con debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowSearch(false)
      return
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      setShowSearch(true)
      const q = searchQuery.trim().toLowerCase()
      const results = []
      try {
        const { data: incs } = await supabase
          .from('incidencias')
          .select('id, title, location, status, priority')
          .or(`title.ilike.%${q}%,location.ilike.%${q}%`)
          .limit(5)
        if (incs) results.push(...incs.map(i => ({ ...i, _type: 'incidencia', _link: '/incidencias' })))

        const { data: inv } = await supabase
          .from('inventario')
          .select('id, nombre, categoria, stock_actual')
          .or(`nombre.ilike.%${q}%,categoria.ilike.%${q}%`)
          .limit(5)
        if (inv) results.push(...inv.map(i => ({ ...i, _type: 'inventario', _link: '/inventario' })))

        const { data: rooms } = await supabase
          .from('habitaciones')
          .select('id, nombre')
          .ilike('nombre', `%${q}%`)
          .limit(5)
        if (rooms) results.push(...rooms.map(r => ({ ...r, _type: 'habitacion', _link: '/configuracion' })))

      } catch(e) { console.error(e) }
      setSearchResults(results)
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearchSelect = (link) => {
    navigate(link)
    setSearchQuery('')
    setShowSearch(false)
  }

  return (
    <header className="header glass border-b">
      <div className="header-left">
        <button className="btn-icon btn-ghost mobile-menu-btn" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>

        <GlobalSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          searchLoading={searchLoading}
          searchResults={searchResults}
          onSearchSelect={handleSearchSelect}
        />
      </div>

      <div className="header-right">
        <NetworkStatus
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
        />

        <HotelSelector />
        
        <NotificationCenter />
      </div>


    </header>
  )
}
