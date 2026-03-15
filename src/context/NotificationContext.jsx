import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const { profile } = useAuth()
  const [unreadPerChannel, setUnreadPerChannel] = useState({})
  const [chatNotifications, setChatNotifications] = useState([])
  const notificationSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'))

  // Total de mensajes no leídos
  const totalUnread = Object.values(unreadPerChannel).reduce((acc, count) => acc + count, 0)

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

        // 1. Actualizar contador por canal (solo si no estamos en ese canal y la ventana no está activa)
        // Nota: El componente Chat.jsx se encargará de resetear su propio canal activo
        setUnreadPerChannel(prev => ({
          ...prev,
          [msg.channel]: (prev[msg.channel] || 0) + 1
        }))

        // 2. Añadir a la lista de notificaciones temporales (para el Header)
        const newNotif = {
          id: `chat-${msg.id}`,
          type: 'chat',
          title: `Chat: ${msg.channel.toUpperCase()}`,
          subtitle: msg.text_content,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          link: '/chat',
          color: 'accent'
        }
        setChatNotifications(prev => [newNotif, ...prev].slice(0, 5))

        // 3. Alerta sonora y browser si procede
        if (document.hidden || window.location.pathname !== '/chat') {
          notificationSound.current.play().catch(() => {})
          if (Notification.permission === 'granted') {
            new Notification(`Nuevo mensaje en ${msg.channel.toUpperCase()}`, {
              body: msg.text_content,
              icon: '/favicon.ico'
            })
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile])

  const clearChannelUnread = (channelId) => {
    setUnreadPerChannel(prev => ({
      ...prev,
      [channelId]: 0
    }))
    // Opcional: Limpiar notificaciones de este canal en la lista global
    setChatNotifications(prev => prev.filter(n => !n.title.toLowerCase().includes(channelId.toLowerCase())))
  }

  return (
    <NotificationContext.Provider value={{ 
      unreadPerChannel, 
      totalUnread, 
      chatNotifications, 
      clearChannelUnread 
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
