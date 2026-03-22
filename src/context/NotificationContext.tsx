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
  const [dbNotifications, setDbNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const notificationSound = useRef(new Audio('https://notification-sounds.com/sounds/vibrant-beep.mp3'))

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
    // 1. Sonido premium (Usar el ref para mayor fiabilidad y evitar bloqueos)
    if (notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(e => console.warn('Audio play blocked or failed:', e));
    }

    console.log('📢 Disparando sendNotification:', title, options);
    
    // 2. Notificación Nativa (PC / PWA)
    if (permission !== 'granted') {
      console.warn('⚠️ Permiso de notificación no concedido:', permission);
      return;
    }

    try {
      // Intentar vía Service Worker (Mejor para PWA/PC)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            icon: '/pwa-192x192.png',
            badge: '/favicon.svg',
            vibrate: [200, 100, 200],
            ...options
          } as any);
          return;
        }
      }

      // Fallback: Notificación nativa directa
      new Notification(title, options);
    } catch (err) {
      console.warn('Error al disparar notificación:', err);
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
          sendNotification('[V-NEXUS] NUEVA SOLICITUD', {
            body: `${inc.title} en ${inc.location}`,
            tag: 'urgent-incident',
            requireInteraction: true,
            data: `/incidencias?id=${inc.id}`
          })
          
          // Toast visual interno
          toast.info(`[NEXUS] ${inc.title} en ${inc.location}`)
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

    // 2. Suscripción a la tabla de NOTIFICACIONES persistentes (DB)
    const dbNotifChannel = supabase
      .channel('db_notifications')
      .on('postgres_changes', {
        event: '*', // Escuchar todo: INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'notificaciones',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newNotif = payload.new
          console.log('🔔 Recibida notificación de DB:', newNotif)
          if (newNotif.user_id !== profile.id) return
          setDbNotifications(prev => [newNotif, ...prev])
          sendNotification(newNotif.title, { body: newNotif.message, data: newNotif.link })
          toast.info(`${newNotif.title}: ${newNotif.message}`)
        } 
        else if (payload.eventType === 'UPDATE') {
          setDbNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n))
        }
        else if (payload.eventType === 'DELETE') {
          setDbNotifications(prev => prev.filter(n => n.id !== payload.old.id))
        }
      })
      .subscribe((status) => {
        console.log('📡 Estado suscripción notificaciones DB:', status)
      })

    // Cargar notificaciones iniciales
    const fetchDbNotifications = async () => {
      const { data } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (data) setDbNotifications(data)
      setLoading(false)
    }
    fetchDbNotifications()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(dbNotifChannel)
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

  const markAsRead = async (id?: string) => {
    if (!profile) return
    try {
      if (id) {
        setDbNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        await supabase.from('notificaciones').update({ read: true }).eq('id', id)
      } else {
        setDbNotifications(prev => prev.map(n => ({ ...n, read: true })))
        await supabase.from('notificaciones').update({ read: true }).eq('user_id', profile.id)
      }
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const deleteNotification = async (id: string) => {
    if (!profile) return
    try {
      setDbNotifications(prev => prev.filter(n => n.id !== id))
      await supabase.from('notificaciones').delete().eq('id', id)
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const clearAllNotifications = async () => {
    if (!profile) return
    try {
      setDbNotifications([])
      await supabase.from('notificaciones').delete().eq('user_id', profile.id)
      toast.success('Notificaciones limpiadas')
    } catch (err) {
      console.error('Error clearing notifications:', err)
    }
  }

  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null)

  // Helper para convertir la clave VAPID pública
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Consultar si ya existe suscripción
      let sub = await registration.pushManager.getSubscription();
      
      if (!sub) {
        // Clave VAPID Pública (Generada para el usuario)
        // NOTA: En producción, esta clave debe coincidir con la de tu servidor de envíos
        const publicVapidKey = 'BL9KSv9l2_Zf9Of0xfdUQY9t5UiBX22Vc8cRDXV24hlK-dZOCJHf0t3al4oe8rDoFNp8kW3FccOqRKRjblw4I-k';
        
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
      }
      
      setPushSubscription(sub);
      console.log('✅ Suscripción Push activa:', sub);
      return sub;
    } catch (err) {
      console.error('Error suscribiendo a Push:', err);
      return null;
    }
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
      dbNotifications,
      loading,
      markAsRead,
      deleteNotification,
      clearAllNotifications,
      subscribeToPush,
      pushSubscription,
      sendNotification,
      permission 
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
