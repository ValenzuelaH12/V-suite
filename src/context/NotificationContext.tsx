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
    // Registro de Service Worker para PWA / Push
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('Error registrando Service Worker:', err)
      })
    }

    if (typeof Notification !== 'undefined' && permission === 'default') {
      Notification.requestPermission().then(setPermission)
    }
  }, [permission])

  const sendNotification = async (title: string, options?: NotificationOptions) => {
    // Sonido siempre
    notificationSound.current.play().catch(() => {})

    if (permission !== 'granted') return

    try {
      // Método preferido para PWA: Service Worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        if (registration) {
          await registration.showNotification(title, {
            icon: '/pwa-192x192.png',
            badge: '/favicon.svg',
            ...options
          })
          return
        }
      }

      // Fallback: Constructor nativo (puede fallar en algunos móviles con "Illegal constructor")
      const notif = new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/favicon.svg',
        ...options
      })
      
      notif.onclick = () => {
        window.focus()
        if (options?.data) {
          window.location.href = options.data
        }
        notif.close()
      }
    } catch (err) {
      console.warn('Error al disparar notificación nativa:', err)
      // El Toast ya se dispara por separado, así que manejamos el fallo silenciosamente aquí
    }
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
            tag: 'chat-notification',
            data: '/chat'
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
            requireInteraction: true,
            data: `/incidencias?id=${inc.id}`
          })
          
          // Toast visual interno
          toast.info(`[V-NEXUS] ${inc.title} en ${inc.location}`)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'incidencias',
      }, (payload) => {
        const inc = payload.new
        const oldInc = payload.old
        
        // Notificar si se le asigna al usuario actual
        if (inc.assigned_to === profile.id && oldInc.assigned_to !== profile.id) {
          sendNotification('📍 NUEVA ASIGNACIÓN', {
            body: `Se te ha asignado: ${inc.title} en ${inc.location}`,
            tag: `assign-${inc.id}`,
            icon: '/icon-192x192.png',
            data: `/incidencias?id=${inc.id}`
          })
          toast.info(`Nueva incidencia asignada: ${inc.title}`)
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

  const dismissNotification = (id: string) => {
    setChatNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Monitor de Alertas Críticas (2h sin atención)
  useEffect(() => {
    if (!profile || (profile.rol !== 'admin' && profile.rol !== 'super_admin')) return

    const checkDelays = async () => {
      const { data: pendings } = await supabase
        .from('incidencias')
        .select('*')
        .eq('status', 'pending')
        .eq('priority', 'high')

      if (!pendings) return

      const now = new Date().getTime()
      pendings.forEach(inc => {
        const created = new Date(inc.created_at).getTime()
        const diffHours = (now - created) / (1000 * 60 * 60)

        if (diffHours > 2) {
          sendNotification('⚠️ ALERTA DE RETRASO', {
            body: `CRÍTICO: Incidencia #${inc.id} (${inc.title}) lleva ${Math.floor(diffHours)}h sin atención.`,
            tag: `delay-${inc.id}`,
            requireInteraction: true
          })
        }
      })
    }

    const timer = setInterval(checkDelays, 1000 * 60 * 30) // Cada 30 min
    checkDelays() // Ejecutar una vez al inicio

    return () => clearInterval(timer)
  }, [profile])

  return (
    <NotificationContext.Provider value={{ 
      unreadPerChannel, 
      totalUnread, 
      chatNotifications, 
      clearChannelUnread,
      dismissNotification,
      sendNotification,
      permission 
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
