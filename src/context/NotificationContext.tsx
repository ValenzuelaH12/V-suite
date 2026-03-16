import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useToast } from '../components/Toast'

const NotificationContext = createContext<any>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const toast = useToast()
  const [unreadPerChannel, setUnreadPerChannel] = useState<Record<string, number>>({})
  // ... rest of the file
  const [chatNotifications, setChatNotifications] = useState<any[]>([])
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const notificationSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'))

  const totalUnread = Object.values(unreadPerChannel).reduce((acc: number, count: number) => acc + count, 0)

  useEffect(() => {
    if (typeof Notification !== 'undefined' && permission === 'default') {
      Notification.requestPermission().then(setPermission)
    }
  }, [permission])

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      const notif = new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/favicon.svg',
        ...options
      })
      
      notif.onclick = () => {
        window.focus()
        notif.close()
      }
    }
    notificationSound.current.play().catch(() => {})
  }

  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('global_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes',
      }, (payload) => {
        const msg = payload.new
        if (!msg || msg.sender_id === profile.id) return

        setUnreadPerChannel(prev => ({
          ...prev,
          [msg.channel]: (prev[msg.channel] || 0) + 1
        }))

        const newNotif = {
          id: `chat-${msg.id}`,
          type: 'chat',
          title: `Mensaje en ${msg.channel}`,
          subtitle: msg.text_content,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          link: '/chat',
          color: 'accent'
        }
        setChatNotifications(prev => [newNotif, ...prev].slice(0, 5))

        if (document.hidden || window.location.pathname !== '/chat') {
          sendNotification(`Nuevo mensaje en ${msg.channel}`, {
            body: msg.text_content,
            tag: 'chat-notification'
          })
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'incidencias',
      }, (payload) => {
        console.log('🚨 Nueva incidencia detectada en tiempo real:', payload.new)
        const inc = payload.new
        if (!inc) return

        if (inc.priority === 'high' || inc.title.includes('V-NEXUS')) {
          sendNotification('🚨 ALERTA V-SUITE', {
            body: `${inc.title} en ${inc.location}`,
            tag: 'urgent-incident',
            requireInteraction: true
          })
          
          // Toast visual interno
          toast.info(`[V-NEXUS] ${inc.title} en ${inc.location}`)
        }
      })
      .subscribe((status) => {
        console.log('📡 Estado de suscripción global:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, permission])

  const clearChannelUnread = (channelId: string) => {
    setUnreadPerChannel(prev => ({
      ...prev,
      [channelId]: 0
    }))
    setChatNotifications(prev => prev.filter(n => !n.title.toLowerCase().includes(channelId.toLowerCase())))
  }

  return (
    <NotificationContext.Provider value={{ 
      unreadPerChannel, 
      totalUnread, 
      chatNotifications, 
      clearChannelUnread,
      sendNotification,
      permission 
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
