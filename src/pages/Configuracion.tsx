import { useState, useEffect } from 'react'
import { 
  Users, UserPlus, Shield, Hotel, Plus, X, RefreshCw, Trash2, MessageSquare, Activity, ClipboardList,
  LayoutDashboard, AlertTriangle, Calendar, Settings, Check, Package, QrCode, Smartphone
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const AVAILABLE_MODULES = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, desc: 'Vista general y estadísticas' },
  { id: 'incidencias', name: 'Incidencias', icon: AlertTriangle, desc: 'Gestión de reportes y averías' },
  { id: 'lecturas', name: 'Lecturas', icon: Activity, desc: 'Control de suministros' },
  { id: 'chat', name: 'Chat', icon: MessageSquare, desc: 'Comunicación interna' },
  { id: 'planificacion', name: 'Planificación', icon: Calendar, desc: 'Mantenimiento preventivo' },
  { id: 'inventario', name: 'Inventario', icon: Package, desc: 'Control de stock y suministros' },
  { id: 'configuracion', name: 'Configuración', icon: Settings, desc: 'Ajustes del sistema' }
]

export default function Configuracion() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('usuarios')
  const [users, setUsers] = useState([])
  const [zonas, setZonas] = useState([])
  const [habitaciones, setHabitaciones] = useState([])
  const [canales, setCanales] = useState([])
  const [contadores, setContadores] = useState([])
  const [tipos, setTipos] = useState([])
  const [mantenimiento, setMantenimiento] = useState([])
  const [elementos, setElementos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [isAddingZona, setIsAddingZona] = useState(false)
  const [isAddingHabitacion, setIsAddingHabitacion] = useState(false)
  const [isAddingTipo, setIsAddingTipo] = useState(false)
  const [isAddingCanal, setIsAddingCanal] = useState(false)
  const [isAddingContador, setIsAddingContador] = useState(false)
  const [isAddingMantenimiento, setIsAddingMantenimiento] = useState(false)
  const [isEditingContador, setIsEditingContador] = useState(false)
  const [isDeleting, setIsDeleting] = useState({ show: false, table: '', id: '', itemName: '' })
  const [selectedZona, setSelectedZona] = useState(null)
  const [msg, setMsg] = useState({ type: '', text: '' })
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    nombre: '',
    rol: 'recepcion',
    hotel: profile?.hotel || 'Hotel Central',
    permisos: ['dashboard', 'incidencias', 'chat']
  })

  const [editingUser, setEditingUser] = useState(null)
  const [editingContador, setEditingContador] = useState(null)
  const [newZona, setNewZona] = useState({ nombre: '' })
  const [newHabitacion, setNewHabitacion] = useState({ nombre: '', zona_id: '' })
  const [newTipo, setNewTipo] = useState({ nombre: '', categoria: 'general' })
  const [newCanal, setNewCanal] = useState({ id: '', nombre: '', descripcion: '' })
  const [newContador, setNewContador] = useState({ nombre: '', tipo: 'luz' })
  const [newMantenimiento, setNewMantenimiento] = useState({ 
    titulo: '', 
    descripcion: '', 
    frecuencia: 'mensual',
    proxima_fecha: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    const t = new Date().getTime()
    await Promise.all([
      fetchUsers(t), 
      fetchZonas(t), 
      fetchTipos(t), 
      fetchHabitaciones(t), 
      fetchCanales(t),
      fetchContadores(t),
      fetchMantenimiento(t),
      fetchElementos(t)
    ])
    setLoading(false)
  }

  const fetchUsers = async (t) => {
    try {
      const { data, error } = await supabase.from('perfiles').select('*').neq('id', '00000000-0000-0000-0000-000000000000').order('nombre')
      if (error) throw error
      setUsers(data)
    } catch (error) { console.error(error) }
  }

  const fetchZonas = async () => {
    try {
      const { data, error } = await supabase.from('zonas').select('*').order('nombre')
      if (error) throw error
      setZonas(data)
    } catch (error) { console.error(error) }
  }

  const fetchCanales = async () => {
    try {
      const { data, error } = await supabase.from('canales').select('*').order('created_at')
      if (error) throw error
      setCanales(data)
    } catch (error) { console.error(error) }
  }

  const fetchContadores = async () => {
    try {
      // Usar un filtro inútil pero dinámico para saltar caché de Chrome
      const { data, error } = await supabase
        .from('contadores')
        .select('*')
        .neq('id', '00000000-0000-0000-0000-000000000000') 
        .order('nombre')
      
      if (error) throw error
      setContadores(data)
    } catch (error) { console.error(error) }
  }

  const fetchMantenimiento = async () => {
    try {
      const { data, error } = await supabase.from('mantenimiento_preventivo').select('*').order('frecuencia')
      if (error) throw error
      setMantenimiento(data)
    } catch (error) { console.error(error) }
  }

  const fetchElementos = async () => {
    try {
      const { data, error } = await supabase.from('elementos_mantenimiento').select('*').order('nombre')
      if (error) throw error
      setElementos(data)
    } catch (error) { console.error(error) }
  }

  const fetchTipos = async () => {
    try {
      const { data, error } = await supabase.from('tipos_problemas').select('*').order('nombre')
      if (error) throw error
      setTipos(data)
    } catch (error) { console.error(error) }
  }

  const fetchHabitaciones = async () => {
    try {
      const { data, error } = await supabase.from('habitaciones').select('*').order('nombre')
      if (error) throw error
      setHabitaciones(data)
    } catch (error) { console.error(error) }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })

    // Validaciones
    if (newUser.nombre.trim().length < 2) {
      setMsg({ type: 'error', text: 'El nombre debe tener al menos 2 caracteres.' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      setMsg({ type: 'error', text: 'Introduce un email válido.' })
      return
    }
    if (newUser.password.length < 6) {
      setMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' })
      return
    }
    if (!newUser.permisos || newUser.permisos.length === 0) {
      setMsg({ type: 'error', text: 'Debes asignar al menos un permiso al usuario.' })
      return
    }

    try {
      const { error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            nombre: newUser.nombre.trim(),
            rol: newUser.rol,
            hotel: newUser.hotel,
            permisos: newUser.permisos
          }
        }
      })
      if (authError) throw authError
      setMsg({ type: 'success', text: 'Usuario creado exitosamente.' })
      setIsAddingUser(false)
      setNewUser({ email: '', password: '', nombre: '', rol: 'recepcion', hotel: profile?.hotel || 'Hotel Central', permisos: ['dashboard', 'incidencias', 'chat'] })
      fetchUsers()
    } catch (error) { setMsg({ type: 'error', text: error.message }) }
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    try {
      const { error } = await supabase
        .from('perfiles')
        .update({
          nombre: editingUser.nombre,
          rol: editingUser.rol,
          hotel: editingUser.hotel,
          permisos: editingUser.permisos
        })
        .eq('id', editingUser.id)
      
      if (error) throw error
      setMsg({ type: 'success', text: 'Usuario actualizado correctamente.' })
      setIsEditingUser(false)
      fetchUsers()
    } catch (error) { setMsg({ type: 'error', text: error.message }) }
  }


  const handleAddZona = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    try {
      const { error } = await supabase.from('zonas').insert([newZona])
      if (error) throw error
      setMsg({ type: 'success', text: 'Zona creada exitosamente.' })
      setIsAddingZona(false)
      setNewZona({ nombre: '' })
      fetchZonas()
    } catch (error) { 
      setMsg({ type: 'error', text: `Error al crear zona: ${error.message}` })
      console.error(error) 
    }
  }

  const handleAddTipo = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    try {
      const { error } = await supabase.from('tipos_problemas').insert([newTipo])
      if (error) throw error
      setMsg({ type: 'success', text: 'Tipo de incidencia creado exitosamente.' })
      setIsAddingTipo(false)
      setNewTipo({ nombre: '', categoria: 'general' })
      fetchTipos()
    } catch (error) { 
      setMsg({ type: 'error', text: `Error al crear tipo: ${error.message}` })
      console.error(error) 
    }
  }

  const handleAddHabitacion = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    try {
      const { error } = await supabase.from('habitaciones').insert([newHabitacion])
      if (error) throw error
      setMsg({ type: 'success', text: 'Habitación creada exitosamente.' })
      setIsAddingHabitacion(false)
      setNewHabitacion({ nombre: '', zona_id: '' })
      fetchHabitaciones()
    } catch (error) { 
      setMsg({ type: 'error', text: `Error al crear habitación: ${error.message}` })
      console.error(error) 
    }
  }

  const handleAddCanal = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    try {
      // Usar el nombre como ID simplificado si no se provee ID
      const canalId = newCanal.id || newCanal.nombre.toLowerCase().replace(/\s+/g, '_')
      const { error } = await supabase.from('canales').insert([{ ...newCanal, id: canalId }])
      if (error) throw error
      setMsg({ type: 'success', text: 'Canal de chat creado exitosamente.' })
      setIsAddingCanal(false)
      setNewCanal({ id: '', nombre: '', descripcion: '' })
      fetchCanales()
    } catch (error) { 
      setMsg({ type: 'error', text: `Error al crear canal: ${error.message}` })
    }
  }

  const handleAddContador = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    try {
      const { error } = await supabase.from('contadores').insert([newContador])
      if (error) throw error
      setMsg({ type: 'success', text: 'Contador creado exitosamente.' })
      setIsAddingContador(false)
      setNewContador({ nombre: '', tipo: 'luz' })
      fetchContadores()
    } catch (error) { 
      setMsg({ type: 'error', text: `Error al crear contador: ${error.message}` })
    }
  }

  const handleAddMantenimiento = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    try {
      const { error } = await supabase.from('mantenimiento_preventivo').insert([{
        ...newMantenimiento,
        creado_por: profile.id
      }])
      if (error) throw error
      setMsg({ type: 'success', text: 'Tarea de mantenimiento creada.' })
      setIsAddingMantenimiento(false)
      setNewMantenimiento({ 
        titulo: '', 
        descripcion: '', 
        frecuencia: 'mensual',
        proxima_fecha: new Date().toISOString().split('T')[0]
      })
      fetchMantenimiento()
    } catch (error) { 
      setMsg({ type: 'error', text: `Error al crear mantenimiento: ${error.message}` })
    }
  }

  const handleAddElemento = async (tareaId, nombre) => {
    if (!nombre.trim()) return
    try {
      const { error } = await supabase.from('elementos_mantenimiento').insert([{
        tarea_id: tareaId,
        nombre: nombre.trim()
      }])
      if (error) throw error
      fetchElementos()
    } catch (error) { 
      setMsg({ type: 'error', text: `Error al añadir elemento: ${error.message}` })
    }
  }

  const handleUpdateContador = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    try {
      const { error } = await supabase
        .from('contadores')
        .update({
          nombre: editingContador.nombre,
          tipo: editingContador.tipo
        })
        .eq('id', editingContador.id)

      if (error) throw error
      setMsg({ type: 'success', text: 'Contador actualizado.' })
      setIsEditingContador(false)
      fetchContadores()
    } catch (error) {
      setMsg({ type: 'error', text: `Error al actualizar: ${error.message}` })
    }
  }

  const handleDelete = (table, id, name = 'este elemento') => {
    setIsDeleting({ show: true, table, id, itemName: name })
  }

  const confirmDelete = async () => {
    const { table, id } = isDeleting
    if (!id) return
    
    setMsg({ type: '', text: '' })
    try {
      console.log(`Borrando de ${table} ID:`, id)
      
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .eq('id', id)
      
      if (error) throw error

      if (count === 0) {
        setMsg({ type: 'error', text: 'Error: El elemento no se borró (servidor retornó count=0).' })
      } else {
        setMsg({ type: 'success', text: 'BORRADO EXITOSO.' })
      }

      setIsDeleting({ show: false, table: '', id: '', itemName: '' })
      
      // Actualizar estado local inmediatamente para evitar esperar al fetch
      const idStr = String(id)
      if (table === 'contadores') setContadores(prev => prev.filter(c => String(c.id) !== idStr))
      if (table === 'canales') setCanales(prev => prev.filter(c => String(c.id) !== idStr))
      if (table === 'zonas') setZonas(prev => prev.filter(z => String(z.id) !== idStr))
      if (table === 'tipos_problemas') setTipos(prev => prev.filter(t => String(t.id) !== idStr))
      if (table === 'habitaciones') setHabitaciones(prev => prev.filter(h => String(h.id) !== idStr))
      if (table === 'perfiles') setUsers(prev => prev.filter(u => String(u.id) !== idStr))
      if (table === 'mantenimiento_preventivo') setMantenimiento(prev => prev.filter(m => String(m.id) !== idStr))
      if (table === 'elementos_mantenimiento') setElementos(prev => prev.filter(e => String(e.id) !== idStr))

      setTimeout(fetchAll, 500)
    } catch (error) { 
      setMsg({ type: 'error', text: `Error al borrar: ${error.message}` })
      console.error('Error al intentar eliminar:', error)
      setIsDeleting({ show: false, table: '', id: '', itemName: '' })
    }
  }

  return (
    <div className="config-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración v2.0</h1>
          <p className="page-subtitle">Gestión de equipo y parámetros (Modo Limpieza Caché)</p>
        </div>
        <div className="flex gap-md">
          {profile?.rol !== 'admin' && profile?.rol !== 'direccion' && (
            <div className="badge priority-high">Modo Lectura (Sin Permisos de Admin)</div>
          )}
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              const tabOrder = ['usuarios', 'zonas', 'tipos', 'canales', 'contadores', 'mantenimiento', 'v-nexus']
              const currentIndex = tabOrder.indexOf(activeTab)
              const nextIndex = (currentIndex + 1) % tabOrder.length
              setActiveTab(tabOrder[nextIndex])
            }}
          >
            <RefreshCw size={18} />
            <span>Siguiente Tab</span>
          </button>
        </div>
      </div>

      <div className="tabs-container mb-xl border-b overflow-x-auto">
        <button 
          className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
          onClick={() => setActiveTab('usuarios')}
        >
          <Users size={18} /> Usuarios
        </button>
        <button 
          className={`tab-btn ${activeTab === 'zonas' ? 'active' : ''}`}
          onClick={() => setActiveTab('zonas')}
        >
          <Hotel size={18} /> Zonas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tipos' ? 'active' : ''}`}
          onClick={() => setActiveTab('tipos')}
        >
          <Shield size={18} /> Tipos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'canales' ? 'active' : ''}`}
          onClick={() => setActiveTab('canales')}
        >
          <MessageSquare size={18} /> Canales Chat
        </button>
        <button 
          className={`tab-btn ${activeTab === 'contadores' ? 'active' : ''}`}
          onClick={() => setActiveTab('contadores')}
        >
          <Activity size={18} /> Contadores
        </button>
        <button 
          className={`tab-btn ${activeTab === 'mantenimiento' ? 'active' : ''}`}
          onClick={() => setActiveTab('mantenimiento')}
        >
          <ClipboardList size={18} /> Mantenimiento
        </button>
        <button 
          className={`tab-btn ${activeTab === 'v-nexus' ? 'active' : ''}`}
          onClick={() => setActiveTab('v-nexus')}
        >
          <QrCode size={18} /> V-Nexus (QRs)
        </button>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'success' ? 'success' : 'danger'} mb-lg`}>
          <span>{msg.text}</span>
        </div>
      )}

      <div className="config-content">
        {activeTab === 'usuarios' && (
          <div className="glass-card table-panel">
            <div className="panel-header border-b">
              <div className="flex items-center gap-md">
                <Users size={20} className="text-accent" />
                <h3>Equipo y Usuarios</h3>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddingUser(true)}>
                <UserPlus size={16} /> Agregar
              </button>
            </div>
            <div className="panel-body p-none">
              <div className="table-responsive">
                <table className="config-table">
                  <thead>
                    <tr><th>Nombre</th><th>Rol</th><th>Hotel</th><th>ID</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td><div className="user-cell"><div className="avatar avatar-sm avatar-gradient">{u.nombre?.charAt(0)}</div>{u.nombre}</div></td>
                        <td><span className={`badge-status ${u.rol}`}>{u.rol?.toUpperCase()}</span></td>
                        <td className="text-muted">{u.hotel}</td>
                        <td className="text-xs text-muted font-mono">{u.id.substring(0, 8)}...</td>
                        <td>
                          <div className="flex gap-sm">
                            <button className="btn-icon btn-ghost text-accent" onClick={() => { setEditingUser(u); setIsEditingUser(true); }}>
                              <RefreshCw size={16} />
                            </button>
                            <button className="btn-icon btn-ghost text-danger" onClick={() => handleDelete('perfiles', u.id, u.nombre)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'zonas' && (
          <div className="glass-card table-panel">
            <div className="panel-header border-b">
              <div className="flex items-center gap-md">
                <Hotel size={20} className="text-accent" />
                <h3>Zonas del Hotel</h3>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddingZona(true)}>
                <Plus size={16} /> Nueva Zona
              </button>
            </div>
            <div className="panel-body p-none">
              <div className="table-responsive">
                <table className="config-table">
                  <thead><tr><th>Zona</th><th>Habitaciones</th><th>Acción</th></tr></thead>
                  <tbody>
                    {zonas.map(z => (
                      <tr key={z.id}>
                        <td>
                          <div className="flex flex-col gap-xs py-xs">
                            <span className="text-primary font-bold">{z.nombre}</span>
                            <span className="text-[10px] text-muted uppercase tracking-wider">Creado: {new Date(z.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-xs">
                            {habitaciones.filter(h => h.zona_id === z.id).map(h => (
                              <span key={h.id} className="badge badge-secondary text-xs">{h.nombre}</span>
                            ))}
                            <button className="btn btn-ghost btn-xs text-accent" onClick={() => { setSelectedZona(z); setNewHabitacion({...newHabitacion, zona_id: z.id}); setIsAddingHabitacion(true); }}>
                              <Plus size={12} /> Hab.
                            </button>
                          </div>
                        </td>
                        <td><button className="btn-icon btn-ghost text-danger" onClick={() => handleDelete('zonas', z.id, z.nombre)}><Trash2 size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tipos' && (
          <div className="glass-card table-panel">
            <div className="panel-header border-b">
              <div className="flex items-center gap-md">
                <Shield size={20} className="text-accent" />
                <h3>Tipos de Problemas</h3>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddingTipo(true)}>
                <Plus size={16} /> Nuevo Tipo
              </button>
            </div>
            <div className="panel-body p-none">
              <div className="table-responsive">
                <table className="config-table">
                  <thead><tr><th>Nombre</th><th>Categoría</th><th>Acción</th></tr></thead>
                  <tbody>
                    {tipos.map(t => (
                      <tr key={t.id}>
                        <td>{t.nombre}</td>
                        <td><span className="badge-status general">{t.categoria}</span></td>
                        <td><button className="btn-icon btn-ghost text-danger" onClick={() => handleDelete('tipos_problemas', t.id, t.nombre)}><Trash2 size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'canales' && (
          <div className="glass-card table-panel">
            <div className="panel-header border-b">
              <div className="flex items-center gap-md">
                <MessageSquare size={20} className="text-accent" />
                <h3>Canales de Chat</h3>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddingCanal(true)}>
                <Plus size={16} /> Nuevo Canal
              </button>
            </div>
            <div className="panel-body p-none">
              <div className="table-responsive">
                <table className="config-table">
                  <thead><tr><th>Nombre</th><th>ID / Slug</th><th>Descripción</th><th>Acción</th></tr></thead>
                  <tbody>
                    {canales.map(c => (
                      <tr key={c.id}>
                        <td><strong>{c.nombre}</strong></td>
                        <td className="text-xs text-muted font-mono">{c.id}</td>
                        <td className="text-sm">{c.descripcion}</td>
                        <td><button className="btn-icon btn-ghost text-danger" onClick={() => handleDelete('canales', c.id, c.nombre)}><Trash2 size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contadores' && (
          <div className="glass-card table-panel">
            <div className="panel-header border-b">
              <div className="flex items-center gap-md">
                <Activity size={20} className="text-accent" />
                <h3>Contadores de Suministros</h3>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddingContador(true)}>
                <Plus size={16} /> Nuevo Contador
              </button>
            </div>
            <div className="panel-body p-none">
              <div className="table-responsive">
                <table className="config-table">
                  <thead><tr><th>Nombre</th><th>Tipo</th><th>Acción</th></tr></thead>
                  <tbody>
                    {contadores.map(c => (
                      <tr key={c.id}>
                        <td><strong>{c.nombre}</strong></td>
                        <td><span className={`badge-status ${c.tipo}`}>{c.tipo?.toUpperCase()}</span></td>
                        <td>
                          <div className="flex gap-sm">
                            <button className="btn-icon btn-ghost text-accent" onClick={() => { setEditingContador(c); setIsEditingContador(true); }}>
                              <RefreshCw size={16} />
                            </button>
                            <button className="btn-icon btn-ghost text-danger" onClick={() => handleDelete('contadores', c.id, c.nombre)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mantenimiento' && (
          <div className="glass-card table-panel">
            <div className="panel-header border-b">
              <div className="flex items-center gap-md">
                <ClipboardList size={20} className="text-accent" />
                <h3>Tareas de Mantenimiento Preventivo</h3>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddingMantenimiento(true)}>
                <Plus size={16} /> Nueva Tarea
              </button>
            </div>
            <div className="panel-body p-none">
              <div className="table-responsive">
                <table className="config-table">
                  <thead><tr><th>Tarea / Elementos</th><th>Frecuencia</th><th>Próxima Fecha</th><th>Acción</th></tr></thead>
                  <tbody>
                    {mantenimiento.map(m => (
                      <tr key={m.id}>
                        <td className="p-md">
                          <div className="flex flex-column gap-xs">
                            <strong className="text-lg">{m.titulo}</strong>
                            <span className="text-xs text-muted mb-sm">{m.descripcion}</span>
                            
                            <div className="bg-accent/5 p-sm rounded-md mt-xs">
                              <p className="text-xs font-bold text-accent mb-xs uppercase letter-spacing-wider">Elementos / Sub-tareas:</p>
                              <div className="flex flex-wrap gap-xs mb-sm">
                                {elementos.filter(e => e.tarea_id === m.id).map(e => (
                                  <span key={e.id} className="badge badge-neutral flex items-center gap-xs pr-xs">
                                    {e.nombre}
                                    <button 
                                      className="btn-icon btn-ghost p-none text-danger h-auto w-auto" 
                                      onClick={() => handleDelete('elementos_mantenimiento', e.id, e.nombre)}
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ))}
                                {elementos.filter(e => e.tarea_id === m.id).length === 0 && (
                                  <span className="text-xs text-muted italic">Sin elementos aún</span>
                                )}
                              </div>
                              <div className="flex gap-xs">
                                <input 
                                  type="text" 
                                  className="input input-sm border-accent/20" 
                                  placeholder="Añadir elemento (ej. Caldera 1)..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddElemento(m.id, e.target.value)
                                      e.target.value = ''
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center"><span className="badge badge-secondary">{m.frecuencia?.toUpperCase()}</span></td>
                        <td className="text-sm font-mono text-center">{m.proxima_fecha}</td>
                        <td className="text-center"><button className="btn-icon btn-ghost text-danger" onClick={() => handleDelete('mantenimiento_preventivo', m.id, m.titulo)}><Trash2 size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* V-Nexus Tab Content */}
        {activeTab === 'v-nexus' && (
          <div className="glass-card table-panel animate-fade-in">
            <div className="panel-header border-b">
              <div className="flex items-center gap-md">
                <QrCode size={20} className="text-accent" />
                <h3>V-Nexus: Portal de Huéspedes</h3>
              </div>
              <div className="badge badge-success">Portal Activo</div>
            </div>
            
            <div className="p-lg border-b bg-accent/5">
              <div className="flex items-center gap-lg">
                <div className="info-icon text-accent bg-accent/10 p-md rounded-xl">
                  <Smartphone size={32} />
                </div>
                <div>
                  <h4 className="mb-xs text-lg">¿Cómo funciona V-Nexus?</h4>
                  <p className="text-sm text-muted max-w-2xl">
                    Imprima estos códigos QR y colóquelos de forma visible en las habitaciones (ej: detrás de la puerta o en la mesita). 
                    El huésped solo tiene que escanearlo para reportar una incidencia o solicitar un servicio al instante, 
                    <strong> sin necesidad de descargar una app o iniciar sesión</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="panel-body p-none">
              <div className="table-responsive">
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>Habitación</th>
                      <th>Zona</th>
                      <th>Enlace Directo</th>
                      <th className="text-center">QR (Previsualización)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {habitaciones.map(h => {
                      const zonaName = zonas.find(z => z.id === h.zona_id)?.nombre || 'General'
                      const portalUrl = `${window.location.origin}/guest/${h.nombre}`
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portalUrl)}`
                      
                      return (
                        <tr key={h.id}>
                          <td><strong>Hab. {h.nombre}</strong></td>
                          <td className="text-muted">{zonaName}</td>
                          <td>
                            <div className="flex flex-col gap-xs">
                              <span className="text-xs font-mono select-all bg-muted/30 p-xs rounded border border-divider">
                                {portalUrl}
                              </span>
                              <a 
                                href={qrUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs text-accent font-bold hover:underline flex items-center gap-xs"
                              >
                                Descargar Imagen QR <RefreshCw size={10} />
                              </a>
                            </div>
                          </td>
                          <td className="py-md text-center">
                            <div className="qr-preview-container inline-block p-xs bg-white border rounded-lg shadow-sm">
                              <img 
                                src={qrUrl} 
                                alt={`QR Hab ${h.nombre}`} 
                                className="block"
                                width="64"
                                height="64"
                                loading="lazy"
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {habitaciones.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-xl text-muted">
                          No hay habitaciones configuradas aún. Vaya a la pestaña "Zonas" para agregar habitaciones.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALES */}
      {isAddingUser && (
        <div className="modal-overlay" onClick={() => setIsAddingUser(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Miembro</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsAddingUser(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div className="input-group mb-md"><label className="input-label">Nombre</label><input type="text" className="input" value={newUser.nombre} onChange={e => setNewUser({...newUser, nombre: e.target.value})} required /></div>
                <div className="grid-2 gap-md mb-md">
                  <div className="input-group"><label className="input-label">Email</label><input type="email" className="input" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required /></div>
                  <div className="input-group"><label className="input-label">Password</label><input type="password" className="input" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required /></div>
                </div>
                <div className="grid-2 gap-md">
                  <div className="input-group"><label className="input-label">Rol</label><select className="select" value={newUser.rol} onChange={e => setNewUser({...newUser, rol: e.target.value})}><option value="recepcion">Recepción</option><option value="mantenimiento">Mantenimiento</option><option value="limpieza">Limpieza</option></select></div>
                  <div className="input-group"><label className="input-label">Hotel</label><input type="text" className="input" value={newUser.hotel} onChange={e => setNewUser({...newUser, hotel: e.target.value})} /></div>
                </div>
                <div className="input-group mt-md">
                  <label className="input-label mb-md">Gestión de Accesos (Permisos)</label>
                  <div className="permissions-grid">
                    {AVAILABLE_MODULES.map(module => {
                      const Icon = module.icon
                      const isActive = newUser.permisos?.includes(module.id)
                      return (
                        <div 
                          key={module.id} 
                          className={`permission-card ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            const perms = isActive 
                              ? (newUser.permisos || []).filter(p => p !== module.id)
                              : [...(newUser.permisos || []), module.id]
                            setNewUser({...newUser, permisos: perms})
                          }}
                        >
                          <div className="permission-icon">
                            <Icon size={20} />
                          </div>
                          <div className="permission-info">
                            <span className="permission-name">{module.name}</span>
                            <span className="permission-desc">{module.desc}</span>
                          </div>
                          <div className={`permission-toggle ${isActive ? 'on' : ''}`}>
                            <div className="toggle-thumb" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Registrar</button></div>
            </form>
          </div>
        </div>
      )}

      {isAddingTipo && (
        <div className="modal-overlay" onClick={() => setIsAddingTipo(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Tipo de Incidencia</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsAddingTipo(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddTipo}>
              <div className="modal-body">
                <div className="input-group mb-md">
                  <label className="input-label">Nombre del Tipo</label>
                  <input type="text" className="input" placeholder="Ej. Fontanería, Electricidad..." value={newTipo.nombre} onChange={e => setNewTipo({...newTipo, nombre: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Categoría</label>
                  <select className="select" value={newTipo.categoria} onChange={e => setNewTipo({...newTipo, categoria: e.target.value})}>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="limpieza">Limpieza</option>
                    <option value="it">IT / Sistemas</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Crear Tipo</button></div>
            </form>
          </div>
        </div>
      )}

      {isAddingZona && (
        <div className="modal-overlay" onClick={() => setIsAddingZona(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Nueva Zona</h2><button className="btn-icon btn-ghost" onClick={() => setIsAddingZona(false)}><X size={20} /></button></div>
            <form onSubmit={handleAddZona}><div className="modal-body"><div className="input-group"><label className="input-label">Nombre de la Zona</label><input type="text" className="input" value={newZona.nombre} onChange={e => setNewZona({nombre: e.target.value})} required /></div></div><div className="modal-footer"><button type="submit" className="btn btn-primary">Crear Zona</button></div></form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO CANAL */}
      {isAddingCanal && (
        <div className="modal-overlay" onClick={() => setIsAddingCanal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Canal de Chat</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsAddingCanal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddCanal}>
              <div className="modal-body">
                <div className="input-group mb-md"><label className="input-label">Nombre del Canal</label><input type="text" className="input" placeholder="Ej. Dirección, Eventos..." value={newCanal.nombre} onChange={e => setNewCanal({...newCanal, nombre: e.target.value})} required /></div>
                <div className="input-group mb-md"><label className="input-label">ID / Slug (Opcional)</label><input type="text" className="input" placeholder="ej-direccion" value={newCanal.id} onChange={e => setNewCanal({...newCanal, id: e.target.value})} /></div>
                <div className="input-group"><label className="input-label">Descripción</label><textarea className="input" rows="3" value={newCanal.descripcion} onChange={e => setNewCanal({...newCanal, descripcion: e.target.value})}></textarea></div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Crear Canal</button></div>
            </form>
          </div>
        </div>
      )}

      {isAddingContador && (
        <div className="modal-overlay" onClick={() => setIsAddingContador(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Contador</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsAddingContador(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddContador}>
              <div className="modal-body">
                <div className="input-group mb-md">
                  <label className="input-label">Nombre del Contador</label>
                  <input type="text" className="input" placeholder="Ej. Contador Principal, Cocina..." value={newContador.nombre} onChange={e => setNewContador({...newContador, nombre: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Tipo de Suministro</label>
                  <select className="select" value={newContador.tipo} onChange={e => setNewContador({...newContador, tipo: e.target.value})}>
                    <option value="luz">Luz</option>
                    <option value="agua">Agua</option>
                    <option value="gas">Gas</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Crear Contador</button></div>
            </form>
          </div>
        </div>
      )}

      {isAddingMantenimiento && (
        <div className="modal-overlay" onClick={() => setIsAddingMantenimiento(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Programar Nueva Tarea</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsAddingMantenimiento(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddMantenimiento}>
              <div className="modal-body">
                <div className="input-group mb-md">
                  <label className="input-label">Título de la Tarea</label>
                  <input type="text" className="input" placeholder="Ej. Revisión Caldera, Limpieza de Filtros..." value={newMantenimiento.titulo} onChange={e => setNewMantenimiento({...newMantenimiento, titulo: e.target.value})} required />
                </div>
                <div className="input-group mb-md">
                  <label className="input-label">Descripción</label>
                  <textarea className="input" rows="2" placeholder="Detalles de la revisión..." value={newMantenimiento.descripcion} onChange={e => setNewMantenimiento({...newMantenimiento, descripcion: e.target.value})}></textarea>
                </div>
                <div className="grid-2 gap-md">
                  <div className="input-group">
                    <label className="input-label">Frecuencia</label>
                    <select className="select" value={newMantenimiento.frecuencia} onChange={e => setNewMantenimiento({...newMantenimiento, frecuencia: e.target.value})}>
                      <option value="diaria">Diaria</option>
                      <option value="semanal">Semanal</option>
                      <option value="mensual">Mensual</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="semestral">Semestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Primera Fecha</label>
                    <input type="date" className="input" value={newMantenimiento.proxima_fecha} onChange={e => setNewMantenimiento({...newMantenimiento, proxima_fecha: e.target.value})} required />
                  </div>
                </div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Guardar Tarea</button></div>
            </form>
          </div>
        </div>
      )}

      {isEditingContador && (
        <div className="modal-overlay" onClick={() => setIsEditingContador(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Contador</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsEditingContador(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateContador}>
              <div className="modal-body">
                <div className="input-group mb-md">
                  <label className="input-label">Nombre del Contador</label>
                  <input type="text" className="input" value={editingContador?.nombre || ''} onChange={e => setEditingContador({...editingContador, nombre: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Tipo de Suministro</label>
                  <select className="select" value={editingContador?.tipo || 'luz'} onChange={e => setEditingContador({...editingContador, tipo: e.target.value})}>
                    <option value="luz">Luz</option>
                    <option value="agua">Agua</option>
                    <option value="gas">Gas</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Guardar Cambios</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR USUARIO */}
      {isEditingUser && (
        <div className="modal-overlay" onClick={() => setIsEditingUser(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Usuario</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsEditingUser(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="modal-body">
                <div className="input-group mb-md"><label className="input-label">Nombre</label><input type="text" className="input" value={editingUser?.nombre || ''} onChange={e => setEditingUser({...editingUser, nombre: e.target.value})} required /></div>
                <div className="grid-2 gap-md">
                  <div className="input-group"><label className="input-label">Rol</label>
                    <select className="select" value={editingUser?.rol || ''} onChange={e => setEditingUser({...editingUser, rol: e.target.value})}>
                      <option value="recepcion">Recepción</option>
                      <option value="mantenimiento">Mantenimiento</option>
                      <option value="limpieza">Limpieza</option>
                      <option value="admin">Administrador</option>
                      <option value="direccion">Dirección</option>
                    </select>
                  </div>
                  <div className="input-group"><label className="input-label">Hotel</label><input type="text" className="input" value={editingUser?.hotel || ''} onChange={e => setEditingUser({...editingUser, hotel: e.target.value})} /></div>
                </div>
                <div className="input-group mt-md">
                  <label className="input-label mb-md">Gestión de Accesos (Permisos)</label>
                  <div className="permissions-grid">
                    {AVAILABLE_MODULES.map(module => {
                      const Icon = module.icon
                      const isActive = editingUser?.permisos?.includes(module.id)
                      return (
                        <div 
                          key={module.id} 
                          className={`permission-card ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            const perms = isActive 
                              ? (editingUser.permisos || []).filter(p => p !== module.id)
                              : [...(editingUser.permisos || []), module.id]
                            setEditingUser({...editingUser, permisos: perms})
                          }}
                        >
                          <div className="permission-icon">
                            <Icon size={20} />
                          </div>
                          <div className="permission-info">
                            <span className="permission-name">{module.name}</span>
                            <span className="permission-desc">{module.desc}</span>
                          </div>
                          <div className={`permission-toggle ${isActive ? 'on' : ''}`}>
                            <div className="toggle-thumb" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Guardar Cambios</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA HABITACIÓN */}
      {isAddingHabitacion && (
        <div className="modal-overlay" onClick={() => setIsAddingHabitacion(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Habitación en {selectedZona?.nombre}</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsAddingHabitacion(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddHabitacion}>
              <div className="modal-body">
                <div className="input-group"><label className="input-label">Número o Nombre</label>
                  <input type="text" className="input" placeholder="Ej. 101, Suite Real..." value={newHabitacion.nombre} onChange={e => setNewHabitacion({...newHabitacion, nombre: e.target.value})} required />
                </div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Añadir Habitación</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR (CUSTOM CONFIRM) */}
      {isDeleting.show && (
        <div className="modal-overlay" style={{zIndex: 2000}}>
          <div className="modal-content text-center" style={{maxWidth: '400px'}}>
            <div className="p-xl">
              <div className="bg-danger/10 w-fit p-md rounded-full mx-auto mb-md">
                <Trash2 size={32} className="text-danger" />
              </div>
              <h2 className="mb-sm">¿Confirmar Borrado?</h2>
              <p className="text-muted mb-xl">Estás a punto de eliminar <strong>{isDeleting.itemName}</strong>. Esta acción no se puede deshacer.</p>
              <div className="flex gap-md">
                <button className="btn btn-ghost flex-1" onClick={() => setIsDeleting({show: false, table: '', id: '', itemName: ''})}>Cancelar</button>
                <button className="btn btn-primary bg-danger border-danger flex-1" onClick={confirmDelete}>Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="config-info-cards mt-xl">
        <div className="glass-card status-card">
          <Shield size={24} className="text-info mb-sm" />
          <h4>Seguridad</h4>
          <p className="text-sm text-muted">Todos los datos están protegidos con RLS de Supabase.</p>
        </div>
        <div className="glass-card status-card">
          <Hotel size={24} className="text-accent mb-sm" />
          <h4>Sincronización</h4>
          <p className="text-sm text-muted">Cambios en tiempo real activados para todo el hotel.</p>
        </div>
      </div>

      <style>{`
        .tabs-container { 
          display: flex; 
          gap: var(--spacing-sm); 
          overflow-x: auto;
          padding-bottom: var(--spacing-sm);
          border-bottom: 1px solid var(--color-border);
          max-width: 100%;
          -webkit-overflow-scrolling: touch;
        }
        
        /* Mostrar scrollbar sutil en móvil para indicar que hay más tabs */
        @media (max-width: 768px) {
          .tabs-container::-webkit-scrollbar {
            display: block;
            height: 4px;
          }
          .tabs-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
          }
          .tabs-container::-webkit-scrollbar-thumb {
            background: var(--color-accent);
            border-radius: 10px;
          }
        }

        .tab-btn { 
          padding: var(--spacing-md) var(--spacing-lg); 
          background: none; 
          border: none; 
          color: var(--color-text-muted); 
          display: flex; 
          align-items: center; 
          gap: var(--spacing-sm);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .tab-btn.active { color: var(--color-accent); border-bottom-color: var(--color-accent); background: rgba(99, 102, 241, 0.05); }
        
        .config-content { 
          min-height: 400px;
          overflow-x: auto;
        }
        
        .btn-sm { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
        .mt-xl { margin-top: var(--spacing-xl); }
        
        .table-responsive {
          overflow-x: auto;
          margin-bottom: var(--spacing-lg);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }

        .config-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .config-table th { text-align: left; padding: 1rem; color: var(--color-text-muted); font-size: 0.8rem; border-bottom: 1px solid var(--color-border); }
        .config-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); }
        
        .badge-status { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: bold; }
        .badge-status.recepcion { background: rgba(99, 102, 241, 0.2); color: #818cf8; }
        .badge-status.general { background: rgba(255, 255, 255, 0.1); color: #ccc; }
        .badge-status.luz { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
        .badge-status.agua { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .badge-status.gas { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        
        .config-info-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-lg); }
        .status-card { padding: var(--spacing-lg); text-align: center; }

        @media (max-width: 768px) {
          .tab-btn {
            padding: var(--spacing-sm) var(--spacing-md);
            font-size: var(--font-size-sm);
          }
          .config-table th, .config-table td {
            padding: var(--spacing-sm);
          }
          .config-info-cards {
            grid-template-columns: 1fr;
          }
          .permissions-grid { grid-template-columns: 1fr; }
        }

        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-md);
        }

        .permission-card {
          padding: var(--spacing-md);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .permission-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: var(--color-border-hover);
        }

        .permission-card.active {
          background: rgba(99, 102, 241, 0.08);
          border-color: var(--color-accent);
        }

        .permission-icon {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
        }

        .permission-card.active .permission-icon {
          background: var(--color-accent);
          color: white;
        }

        .permission-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .permission-name {
          font-weight: 600;
          font-size: var(--font-size-sm);
          color: var(--color-text-primary);
        }

        .permission-desc {
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }

        .permission-toggle {
          width: 32px;
          height: 18px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          position: relative;
          transition: all 0.3s ease;
        }

        .permission-toggle.on {
          background: var(--color-success);
        }

        .toggle-thumb {
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .permission-toggle.on .toggle-thumb {
          left: calc(100% - 16px);
        }
      `}</style>
    </div>
  )
}



