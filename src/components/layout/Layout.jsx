import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function Layout() {
  const { profile } = useAuth()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const notificationSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'))

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  useEffect(() => {
    if (!profile) return

    // Solicitar permiso de notificaciones
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [profile])

  return (
    <div className="app-layout text-primary bg-primary">
      <div className="bg-animated"></div>
      
      <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />
      
      <div className="main-wrapper">
        <Header toggleSidebar={toggleSidebar} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {isSidebarOpen && (
        <div className="sidebar-overlay mobile-only" onClick={closeSidebar}></div>
      )}

      <style>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
        }

        .main-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-left: var(--sidebar-width);
          min-height: 100vh;
          position: relative;
        }

        .main-content {
          flex: 1;
          padding: calc(var(--header-height) + var(--spacing-xl)) var(--spacing-xl) var(--spacing-xl);
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        @media (max-width: 768px) {
          .main-wrapper {
            margin-left: 0;
          }
          .main-content {
            padding: calc(var(--header-height) + var(--spacing-md)) var(--spacing-md) var(--spacing-md);
          }
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 95;
          animation: fadeIn 0.3s ease;
        }

        .mobile-only {
          display: none;
        }

        @media (max-width: 768px) {
          .mobile-only {
            display: block;
          }
        }
      `}</style>
    </div>
  )
}
