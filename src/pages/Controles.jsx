import { useState, useEffect } from 'react'
import { CheckSquare, ListTodo, MapPin, User, ChevronRight, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Controles() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('pendientes')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', area: '', items: 5 })
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('controles_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'controles' 
      }, () => {
        fetchTasks()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('controles')
        .select(`
          *,
          assignee:perfiles!assignee_id(nombre)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = data.map(task => ({
        id: task.id,
        title: task.title,
        area: task.area,
        assignee: task.assignee?.nombre || 'Sin asignar',
        status: task.status,
        items: task.items,
        completed: task.completed
      }))

      setTasks(formattedData)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!newTask.title || !newTask.area || !user) return
    
    try {
      const { error } = await supabase
        .from('controles')
        .insert([{
          title: newTask.title,
          area: newTask.area,
          items: parseInt(newTask.items) || 5,
          completed: 0,
          status: 'pending',
          assignee_id: user.id
        }])

      if (error) throw error

      fetchTasks()
      setIsModalOpen(false)
      setNewTask({ title: '', area: '', items: 5 })
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const toggleTaskProgress = async (task) => {
    let newCompleted = 0
    let newStatus = 'pending'

    if (task.completed < task.items) {
      newCompleted = task.completed + 1
      newStatus = newCompleted === task.items ? 'resolved' : 'in-progress'
    }

    try {
      const { error } = await supabase
        .from('controles')
        .update({ 
          completed: newCompleted,
          status: newStatus 
        })
        .eq('id', task.id)

      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error toggling progress:', error)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'pendientes') return task.status !== 'resolved'
    if (activeTab === 'completados') return task.status === 'resolved'
    return true
  })

  return (
    <div className="controles-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Controles y Tareas</h1>
          <p className="page-subtitle">Gestión de checklists y rutinas del hotel</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <ListTodo size={18} />
          <span>Nuevo Control</span>
        </button>
      </div>

      <div className="controles-toolbar glass-card mb-lg">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'pendientes' ? 'active' : ''}`}
            onClick={() => setActiveTab('pendientes')}
          >
            Pendientes / En Progreso
          </button>
          <button 
            className={`tab ${activeTab === 'completados' ? 'active' : ''}`}
            onClick={() => setActiveTab('completados')}
          >
            Completados
          </button>
        </div>
      </div>

      <div className="task-list">
        {filteredTasks.map(task => (
          <div key={task.id} className="task-row glass-card" onClick={() => toggleTaskProgress(task)}>
            <div className="task-left">
              <div className={`status-icon ${task.status === 'resolved' ? 'bg-success-light text-success' : task.status === 'in-progress' ? 'bg-warning-light text-warning' : 'bg-neutral-light text-muted'}`}>
                <CheckSquare size={24} />
              </div>
              <div className="task-info">
                <h3>{task.title}</h3>
                <div className="task-meta text-sm text-muted">
                  <span className="flex items-center gap-xs"><MapPin size={14}/> {task.area}</span>
                  <span className="divider">•</span>
                  <span className="flex items-center gap-xs"><User size={14}/> {task.assignee}</span>
                </div>
              </div>
            </div>
            
            <div className="task-right">
              <div className="progress-container">
                <div className="progress-text">
                  <span>Progreso</span>
                  <span className="font-bold">{task.completed}/{task.items}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${task.completed === task.items ? 'bg-success' : 'bg-accent'}`}
                    style={{ width: `${(task.completed / task.items) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <button className="btn-icon btn-ghost">
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Control / Checklist</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                <div className="input-group mb-md">
                  <label className="input-label">Título de la tarea</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Ej. Revisión extintores..."
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    required
                  />
                </div>
                <div className="input-group mb-md">
                  <label className="input-label">Área / Zona</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Ej. Planta baja"
                    value={newTask.area}
                    onChange={e => setNewTask({...newTask, area: e.target.value})}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Número de items a revisar</label>
                  <input 
                    type="number" 
                    className="input" 
                    min="1"
                    max="50"
                    value={newTask.items}
                    onChange={e => setNewTask({...newTask, items: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Control</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .mb-md { margin-bottom: var(--spacing-md); }
        .mb-lg { margin-bottom: var(--spacing-lg); }
        .gap-xs { gap: var(--spacing-xs); }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .font-bold { font-weight: 700; }
        
        .controles-toolbar {
          padding: var(--spacing-xs) var(--spacing-md);
          display: flex;
          align-items: center;
        }

        .task-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .task-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-lg) var(--spacing-xl);
          transition: transform var(--transition-fast);
          cursor: pointer;
        }

        .task-row:hover {
          transform: translateY(-2px);
          border-color: var(--color-accent-light);
        }

        .task-left {
          display: flex;
          align-items: center;
          gap: var(--spacing-xl);
        }

        .status-icon {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bg-neutral-light { background: rgba(255, 255, 255, 0.05); }

        .task-info h3 {
          font-size: var(--font-size-lg);
          font-weight: 600;
          margin-bottom: var(--spacing-xs);
        }

        .task-meta {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .divider { opacity: 0.5; }

        .task-right {
          display: flex;
          align-items: center;
          gap: var(--spacing-2xl);
          width: 350px;
        }

        .progress-container {
          flex: 1;
        }

        .progress-text {
          display: flex;
          justify-content: space-between;
          font-size: var(--font-size-sm);
          margin-bottom: var(--spacing-xs);
          color: var(--color-text-secondary);
        }

        .progress-bar {
          height: 8px;
          background: var(--color-bg-input);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.5s ease;
        }

        .bg-success { background: var(--color-success); }
        .bg-accent { background: var(--color-accent); }

        @media (max-width: 768px) {
          .task-row {
            flex-direction: column;
            align-items: stretch;
            gap: var(--spacing-lg);
          }
          .task-right {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  )
}
