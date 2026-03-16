import { useState, useEffect } from 'react'
import { 
  Users, UserPlus, Shield, Hotel, Plus, X, RefreshCw, Trash2, MessageSquare, Activity, ClipboardList,
  LayoutDashboard, AlertTriangle, Calendar, Settings, Check, Package, QrCode, Smartphone, Wrench,
  ChevronDown, ChevronUp, DoorOpen, MapPin, Layers, Hash, BookOpen, FileText
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
  const [plantillas, setPlantillas] = useState([])
  const [elementos, setElementos] = useState([])
  const [activos, setActivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [isAddingZona, setIsAddingZona] = useState(false)
  const [isAddingHabitacion, setIsAddingHabitacion] = useState(false)
  const [isAddingTipo, setIsAddingTipo] = useState(false)
  const [isAddingCanal, setIsAddingCanal] = useState(false)
  const [isAddingContador, setIsAddingContador] = useState(false)
  const [isAddingMantenimiento, setIsAddingMantenimiento] = useState(false)
  const [isAddingPlantilla, setIsAddingPlantilla] = useState(false)
  const [isAddingActivo, setIsAddingActivo] = useState(false)
  const [isEditingContador, setIsEditingContador] = useState(false)
  const [isDeleting, setIsDeleting] = useState({ show: false, table: '', id: '', itemName: '' })
  const [selectedZona, setSelectedZona] = useState(null)
  const [msg, setMsg] = useState({ type: '', text: '' })
  
  // V-Nexus Filtering States
  const [activeFloor, setActiveFloor] = useState('1')
  const [selectedNexusZona, setSelectedNexusZona] = useState('all')
  const [nexusSearchQuery, setNexusSearchQuery] = useState('')
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
    proxima_fecha: new Date().toISOString().split('T')[0],
    plantillaId: ''
  })
  const [newPlantilla, setNewPlantilla] = useState({ nombre: '', items: [] })
  const [newPlantillaItem, setNewPlantillaItem] = useState('')
  const [newActivo, setNewActivo] = useState({
    nombre: '',
    tipo: 'maquinaria',
    zona_id: '',
    manual_url: '',
    especificaciones: {}
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
      fetchPlantillas(t),
      fetchElementos(t),
      fetchActivos(t)
    ])
    setLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'v-nexus' && habitaciones.length > 0 && activeFloor === '1') {
      const floors = Array.from(new Set(habitaciones.map(h => {
        const match = h.nombre.match(/^\d/);
        return match ? match[0] : 'Otros';
      }))).sort();
      if (floors.length > 0 && !floors.includes('1')) {
        setActiveFloor(floors[0]);
      }
    }
  }, [activeTab, habitaciones])

  const fetchUsers = async (t?: any) => {
    try {
      const { data, error } = await supabase.from('perfiles').select('*').neq('id', '00000000-0000-0000-0000-000000000000').order('nombre')
      if (error) throw error
      setUsers(data)
    } catch (error) { console.error(error) }
  }

  const fetchZonas = async (t?: any) => {
    try {
      const { data, error } = await supabase.from('zonas').select('*').order('nombre')
      if (error) throw error
      setZonas(data)
    } catch (error) { console.error(error) }
  }

  const fetchCanales = async (t?: any) => {
    try {
      const { data, error } = await supabase.from('canales').select('*').order('created_at')
      if (error) throw error
      setCanales(data)
    } catch (error) { console.error(error) }
  }

  const fetchContadores = async (t?: any) => {
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

  const fetchMantenimiento = async (t?: any) => {
    try {
      const { data, error } = await supabase.from('mantenimiento_preventivo').select('*').order('frecuencia')
      if (error) throw error
      setMantenimiento(data)
    } catch (error) { console.error(error) }
  }

  const fetchPlantillas = async (t?: any) => {
    try {
      const { data, error } = await supabase.from('mantenimiento_plantillas').select('*').order('nombre')
      if (error) throw error
      setPlantillas(data || [])
    } catch (error) { console.error(error) }
  }

  const fetchElementos = async (t?: any) => {
    try {
      const { data, error } = await supabase.from('elementos_mantenimiento').select('*').order('nombre')
      if (error) throw error
      setElementos(data)
    } catch (error) { console.error(error) }
  }

  const fetchTipos = async (t?: any) => {
    try {
      const { data, error } = await supabase.from('tipos_problemas').select('*').order('nombre')
      if (error) throw error
      setTipos(data)
    } catch (error) { console.error(error) }
  }

  const fetchActivos = async (t?: any) => {
    try {
      const { data, error } = await supabase.from('activos').select('*').order('nombre')
      if (error) throw error
      setActivos(data)
    } catch (error) { console.error(error) }
  }

  const fetchHabitaciones = async (t?: any) => {
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
      const { data: taskData, error: taskError } = await supabase.from('mantenimiento_preventivo').insert([{
        titulo: newMantenimiento.titulo,
        descripcion: newMantenimiento.descripcion,
        frecuencia: newMantenimiento.frecuencia,
        proxima_fecha: newMantenimiento.proxima_fecha,
        creado_por: profile.id
      }]).select()

      if (taskError) throw taskError
      
      // Si hay plantilla seleccionada, insertar sus ítems como elementos
      if (newMantenimiento.plantillaId && taskData?.[0]) {
        const plantilla = plantillas.find(p => p.id === newMantenimiento.plantillaId)
        if (plantilla && plantilla.items?.length > 0) {
          const elementsToInsert = plantilla.items.map(item => ({
            tarea_id: taskData[0].id,
            nombre: item
          }))
          const { error: elemError } = await supabase.from('elementos_mantenimiento').insert(elementsToInsert)
          if (elemError) console.error("Error insertando elementos de plantilla:", elemError)
        }
      }

      setMsg({ type: 'success', text: 'Tarea de mantenimiento creada con éxito.' })
      setIsAddingMantenimiento(false)
      setNewMantenimiento({ 
        titulo: '', 
        descripcion: '', 
        frecuencia: 'mensual',
        proxima_fecha: new Date().toISOString().split('T')[0],
        plantillaId: ''
      })
      fetchMantenimiento()
      fetchElementos()
    } catch (error) { 
      setMsg({ type: 'error', text: `Error al crear mantenimiento: ${error.message}` })
    }
  }

  const handleAddActivo = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    try {
      const { error } = await supabase.from('activos').insert([newActivo])
      if (error) throw error
      setMsg({ type: 'success', text: 'Activo registrado correctamente.' })
      setIsAddingActivo(false)
      setNewActivo({ nombre: '', tipo: 'maquinaria', zona_id: '', manual_url: '', especificaciones: {} })
      fetchActivos()
    } catch (error) {
      setMsg({ type: 'error', text: `Error al crear activo: ${error.message}` })
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

  const handleAddPlantilla = async (e) => {
    e.preventDefault()
    if (!newPlantilla.nombre.trim()) return
    setMsg({ type: '', text: '' })
    try {
      const { error } = await supabase.from('mantenimiento_plantillas').insert([{
        nombre: newPlantilla.nombre,
        items: newPlantilla.items
      }])
      if (error) throw error
      setMsg({ type: 'success', text: 'Plantilla creada correctamente.' })
      setIsAddingPlantilla(false)
      setNewPlantilla({ nombre: '', items: [] })
      fetchPlantillas()
    } catch (error) {
      setMsg({ type: 'error', text: `Error al crear plantilla: ${error.message}` })
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
      if (table === 'activos') setActivos(prev => prev.filter(a => String(a.id) !== idStr))
      if (table === 'mantenimiento_plantillas') setPlantillas(prev => prev.filter(p => String(p.id) !== idStr))

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
              const tabOrder = ['usuarios', 'zonas', 'tipos', 'canales', 'contadores', 'mantenimiento', 'plantillas', 'v-nexus', 'v-qr']
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
          className={`tab-btn ${activeTab === 'plantillas' ? 'active' : ''}`}
          onClick={() => setActiveTab('plantillas')}
        >
          <FileText size={18} /> Plantillas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'v-nexus' ? 'active' : ''}`}
          onClick={() => setActiveTab('v-nexus')}
        >
          <QrCode size={18} /> V-Nexus (QRs)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'v-qr' ? 'active' : ''}`}
          onClick={() => setActiveTab('v-qr')}
        >
          <Wrench size={18} /> V-QR (Activos)
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
          <div className="zonas-redesign animate-fade-in">
            {/* Header Premium */}
            <div className="zonas-header glass-card">
              <div className="zonas-header-left">
                <div className="zonas-icon-wrap">
                  <Layers size={24} />
                </div>
                <div>
                  <h3 className="zonas-title">Zonas del Hotel</h3>
                  <p className="zonas-subtitle">{zonas.length} zonas · {habitaciones.length} habitaciones en total</p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setIsAddingZona(true)}>
                <Plus size={16} /> Nueva Zona
              </button>
            </div>

            {/* Zona Cards Grid */}
            <div className="zonas-grid">
              {zonas.map((z, idx) => {
                const zonHabs = habitaciones.filter(h => h.zona_id === z.id)
                const gradients = [
                  'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 100%)',
                  'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,148,162,0.08) 100%)',
                  'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(239,68,68,0.08) 100%)',
                  'linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(168,85,247,0.08) 100%)',
                  'linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(99,102,241,0.08) 100%)',
                  'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,185,129,0.08) 100%)'
                ]
                const accentColors = ['#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#22c55e']
                const accent = accentColors[idx % accentColors.length]
                const gradient = gradients[idx % gradients.length]

                return (
                  <div key={z.id} className="zona-card glass-card" style={{ background: gradient, '--zona-accent': accent } as React.CSSProperties}>
                    {/* Card Header */}
                    <div className="zona-card-header">
                      <div className="zona-card-identity">
                        <div className="zona-avatar" style={{ background: `${accent}22`, color: accent, border: `2px solid ${accent}44` }}>
                          <MapPin size={18} />
                        </div>
                        <div>
                          <h4 className="zona-card-name">{z.nombre}</h4>
                          <span className="zona-card-date">
                            <Calendar size={10} /> {new Date(z.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="zona-card-actions">
                        <div className="zona-counter" style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}33` }}>
                          <DoorOpen size={13} />
                          <span>{zonHabs.length}</span>
                        </div>
                        <button 
                          className="zona-delete-btn" 
                          onClick={() => handleDelete('zonas', z.id, z.nombre)}
                          title="Eliminar zona completa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Habitaciones Grid */}
                    <div className="zona-habs-section">
                      <div className="zona-habs-label">
                        <Hash size={11} /> Habitaciones / Sitios
                      </div>
                      <div className="zona-habs-grid">
                        {zonHabs.map(h => (
                          <div key={h.id} className="zona-hab-chip" style={{ '--chip-accent': accent } as React.CSSProperties}>
                            <DoorOpen size={12} className="zona-hab-icon" />
                            <span className="zona-hab-name">{h.nombre}</span>
                            <button 
                              className="zona-hab-delete"
                              onClick={() => handleDelete('habitaciones', h.id, `Habitación ${h.nombre}`)}
                              title={`Borrar ${h.nombre}`}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {/* Add button */}
                        <button 
                          className="zona-hab-add" 
                          style={{ borderColor: `${accent}44`, color: accent }}
                          onClick={() => { setSelectedZona(z); setNewHabitacion({...newHabitacion, zona_id: z.id}); setIsAddingHabitacion(true); }}
                        >
                          <Plus size={14} />
                          <span>Añadir</span>
                        </button>
                      </div>
                      {zonHabs.length === 0 && (
                        <div className="zona-empty">
                          <DoorOpen size={20} style={{ opacity: 0.3 }} />
                          <span>Sin habitaciones asignadas</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <style>{`
              .zonas-redesign { display: flex; flex-direction: column; gap: var(--spacing-lg); }
              .zonas-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; }
              .zonas-header-left { display: flex; align-items: center; gap: 1rem; }
              .zonas-icon-wrap {
                width: 44px; height: 44px; border-radius: 12px;
                background: linear-gradient(135deg, var(--color-accent), #a855f7);
                display: flex; align-items: center; justify-content: center;
                color: white; box-shadow: 0 4px 15px rgba(99,102,241,0.35);
              }
              .zonas-title { font-size: 1.15rem; font-weight: 700; margin: 0; letter-spacing: -0.02em; }
              .zonas-subtitle { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 2px; }

              .zonas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: var(--spacing-lg); }

              .zona-card {
                padding: 0 !important; overflow: hidden;
                border: 1px solid rgba(255,255,255,0.06);
                transition: transform 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.3s ease;
              }
              .zona-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08);
              }

              .zona-card-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 1.15rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05);
              }
              .zona-card-identity { display: flex; align-items: center; gap: 0.75rem; }
              .zona-avatar {
                width: 38px; height: 38px; border-radius: 10px;
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.25s ease;
              }
              .zona-card:hover .zona-avatar { transform: scale(1.1) rotate(5deg); }
              .zona-card-name { font-weight: 700; font-size: 1rem; margin: 0; letter-spacing: -0.01em; }
              .zona-card-date {
                display: flex; align-items: center; gap: 4px;
                font-size: 0.65rem; color: var(--color-text-muted); text-transform: uppercase;
                letter-spacing: 0.05em; margin-top: 2px;
              }
              .zona-card-actions { display: flex; align-items: center; gap: 0.5rem; }
              .zona-counter {
                display: flex; align-items: center; gap: 4px;
                padding: 4px 10px; border-radius: 999px;
                font-size: 0.75rem; font-weight: 700;
              }
              .zona-delete-btn {
                width: 30px; height: 30px; border-radius: 8px; border: none;
                background: rgba(239,68,68,0.08); color: rgba(239,68,68,0.5);
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.2s ease;
              }
              .zona-delete-btn:hover { background: rgba(239,68,68,0.2); color: #ef4444; transform: scale(1.1); }

              .zona-habs-section { padding: 1rem 1.25rem 1.25rem; }
              .zona-habs-label {
                display: flex; align-items: center; gap: 5px;
                font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
                letter-spacing: 0.08em; color: var(--color-text-muted);
                margin-bottom: 0.65rem;
              }
              .zona-habs-grid { display: flex; flex-wrap: wrap; gap: 6px; }

              .zona-hab-chip {
                display: flex; align-items: center; gap: 5px;
                padding: 5px 8px 5px 10px;
                background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px; font-size: 0.78rem; font-weight: 500;
                transition: all 0.2s ease; position: relative;
              }
              .zona-hab-chip:hover {
                background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15);
                transform: translateY(-1px);
              }
              .zona-hab-icon { opacity: 0.4; flex-shrink: 0; }
              .zona-hab-name { white-space: nowrap; }
              .zona-hab-delete {
                width: 18px; height: 18px; border-radius: 50%;
                border: none; background: transparent; color: rgba(255,255,255,0.25);
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.2s ease; flex-shrink: 0;
                margin-left: 2px;
              }
              .zona-hab-chip:hover .zona-hab-delete { color: #ef4444; background: rgba(239,68,68,0.1); }
              .zona-hab-delete:hover { background: rgba(239,68,68,0.25) !important; transform: scale(1.15); }

              .zona-hab-add {
                display: flex; align-items: center; gap: 4px;
                padding: 5px 12px; border-radius: 8px;
                border: 1.5px dashed; background: transparent;
                font-size: 0.75rem; font-weight: 600;
                cursor: pointer; transition: all 0.2s ease;
              }
              .zona-hab-add:hover { background: rgba(255,255,255,0.05); transform: translateY(-1px); }

              .zona-empty {
                display: flex; align-items: center; gap: 8px;
                justify-content: center; padding: 1rem;
                color: var(--color-text-muted); font-size: 0.75rem;
                font-style: italic;
              }

              @media (max-width: 640px) {
                .zonas-grid { grid-template-columns: 1fr; }
                .zonas-header { flex-direction: column; gap: 0.75rem; align-items: flex-start; }
              }
            `}</style>
          </div>
        )}

        {activeTab === 'tipos' && (() => {
          const categoryConfig: Record<string, { icon: typeof Shield, gradient: string, accent: string, label: string }> = {
            'general':       { icon: Shield,        gradient: 'linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.06) 100%)',  accent: '#6366f1', label: 'General' },
            'electricidad':  { icon: Activity,       gradient: 'linear-gradient(135deg, rgba(245,158,11,0.14) 0%, rgba(239,68,68,0.06) 100%)',   accent: '#f59e0b', label: 'Electricidad' },
            'fontaneria':    { icon: Activity,       gradient: 'linear-gradient(135deg, rgba(14,165,233,0.14) 0%, rgba(99,102,241,0.06) 100%)',  accent: '#0ea5e9', label: 'Fontanería' },
            'limpieza':      { icon: Check,          gradient: 'linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(6,148,162,0.06) 100%)',   accent: '#10b981', label: 'Limpieza' },
            'climatizacion': { icon: Activity,       gradient: 'linear-gradient(135deg, rgba(6,182,212,0.14) 0%, rgba(14,165,233,0.06) 100%)',   accent: '#06b6d4', label: 'Climatización' },
            'seguridad':     { icon: AlertTriangle,  gradient: 'linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(236,72,153,0.06) 100%)',   accent: '#ef4444', label: 'Seguridad' },
            'mobiliario':    { icon: Package,         gradient: 'linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(236,72,153,0.06) 100%)',  accent: '#a855f7', label: 'Mobiliario' },
          }
          const defaultCfg = { icon: Shield, gradient: 'linear-gradient(135deg, rgba(148,163,184,0.12) 0%, rgba(100,116,139,0.06) 100%)', accent: '#94a3b8', label: 'Otro' }

          // Group by category
          const grouped = tipos.reduce((acc: Record<string, typeof tipos>, t: any) => {
            const cat = t.categoria || 'general'
            if (!acc[cat]) acc[cat] = []
            acc[cat].push(t)
            return acc
          }, {} as Record<string, typeof tipos>)

          return (
          <div className="tipos-redesign animate-fade-in">
            {/* Header Premium */}
            <div className="tipos-header glass-card">
              <div className="tipos-header-left">
                <div className="tipos-icon-wrap">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="tipos-title">Tipos de Problemas</h3>
                  <p className="tipos-subtitle">{tipos.length} tipos en {Object.keys(grouped).length} categorías</p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setIsAddingTipo(true)}>
                <Plus size={16} /> Nuevo Tipo
              </button>
            </div>

            {/* Category Groups */}
            <div className="tipos-categories">
              {Object.entries(grouped).map(([cat, items]) => {
                const cfg = categoryConfig[cat] || defaultCfg
                const IconComp = cfg.icon
                return (
                  <div key={cat} className="tipos-category-card glass-card" style={{ background: cfg.gradient }}>
                    {/* Category Header */}
                    <div className="tipos-cat-header">
                      <div className="tipos-cat-identity">
                        <div className="tipos-cat-avatar" style={{ background: `${cfg.accent}20`, color: cfg.accent, border: `2px solid ${cfg.accent}40` }}>
                          <IconComp size={18} />
                        </div>
                        <div>
                          <h4 className="tipos-cat-name">{cfg.label}</h4>
                          <span className="tipos-cat-count">{(items as any[]).length} {(items as any[]).length === 1 ? 'tipo' : 'tipos'}</span>
                        </div>
                      </div>
                      <div className="tipos-cat-badge" style={{ background: `${cfg.accent}18`, color: cfg.accent, border: `1px solid ${cfg.accent}33` }}>
                        {cat.toUpperCase()}
                      </div>
                    </div>

                    {/* Types Grid */}
                    <div className="tipos-items-section">
                      <div className="tipos-items-grid">
                        {(items as any[]).map((t: any) => (
                          <div key={t.id} className="tipo-chip" style={{ '--tipo-accent': cfg.accent } as React.CSSProperties}>
                            <div className="tipo-chip-dot" style={{ background: cfg.accent }} />
                            <span className="tipo-chip-name">{t.nombre}</span>
                            <button 
                              className="tipo-chip-delete"
                              onClick={() => handleDelete('tipos_problemas', t.id, t.nombre)}
                              title={`Borrar ${t.nombre}`}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <style>{`
              .tipos-redesign { display: flex; flex-direction: column; gap: var(--spacing-lg); }
              .tipos-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; }
              .tipos-header-left { display: flex; align-items: center; gap: 1rem; }
              .tipos-icon-wrap {
                width: 44px; height: 44px; border-radius: 12px;
                background: linear-gradient(135deg, #ef4444, #f59e0b);
                display: flex; align-items: center; justify-content: center;
                color: white; box-shadow: 0 4px 15px rgba(239,68,68,0.3);
              }
              .tipos-title { font-size: 1.15rem; font-weight: 700; margin: 0; letter-spacing: -0.02em; }
              .tipos-subtitle { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 2px; }

              .tipos-categories { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: var(--spacing-lg); }

              .tipos-category-card {
                padding: 0 !important; overflow: hidden;
                border: 1px solid rgba(255,255,255,0.06);
                transition: transform 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.3s ease;
              }
              .tipos-category-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08);
              }
              .tipos-cat-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 1.15rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05);
              }
              .tipos-cat-identity { display: flex; align-items: center; gap: 0.75rem; }
              .tipos-cat-avatar {
                width: 38px; height: 38px; border-radius: 10px;
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.25s ease;
              }
              .tipos-category-card:hover .tipos-cat-avatar { transform: scale(1.1) rotate(5deg); }
              .tipos-cat-name { font-weight: 700; font-size: 1rem; margin: 0; }
              .tipos-cat-count { font-size: 0.65rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
              .tipos-cat-badge {
                padding: 4px 10px; border-radius: 999px;
                font-size: 0.6rem; font-weight: 800; letter-spacing: 0.08em;
              }

              .tipos-items-section { padding: 1rem 1.25rem 1.25rem; }
              .tipos-items-grid { display: flex; flex-wrap: wrap; gap: 8px; }

              .tipo-chip {
                display: flex; align-items: center; gap: 8px;
                padding: 8px 10px 8px 12px;
                background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
                border-radius: 10px; font-size: 0.82rem; font-weight: 500;
                transition: all 0.2s ease;
              }
              .tipo-chip:hover {
                background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15);
                transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              }
              .tipo-chip-dot {
                width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
                box-shadow: 0 0 6px currentColor;
              }
              .tipo-chip-name { white-space: nowrap; }
              .tipo-chip-delete {
                width: 22px; height: 22px; border-radius: 6px;
                border: none; background: transparent; color: rgba(255,255,255,0.2);
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.2s ease; flex-shrink: 0;
                margin-left: 2px;
              }
              .tipo-chip:hover .tipo-chip-delete { color: #ef4444; background: rgba(239,68,68,0.1); }
              .tipo-chip-delete:hover { background: rgba(239,68,68,0.25) !important; transform: scale(1.15); }

              @media (max-width: 640px) {
                .tipos-categories { grid-template-columns: 1fr; }
                .tipos-header { flex-direction: column; gap: 0.75rem; align-items: flex-start; }
              }
            `}</style>
          </div>
          )
        })()}

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

        {activeTab === 'mantenimiento' && (() => {
          const freqConfig: Record<string, { gradient: string, accent: string, label: string }> = {
            'diario':    { gradient: 'linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(245,158,11,0.06) 100%)',    accent: '#ef4444', label: 'Diario' },
            'semanal':   { gradient: 'linear-gradient(135deg, rgba(245,158,11,0.14) 0%, rgba(234,179,8,0.06) 100%)',    accent: '#f59e0b', label: 'Semanal' },
            'quincenal': { gradient: 'linear-gradient(135deg, rgba(14,165,233,0.14) 0%, rgba(99,102,241,0.06) 100%)',   accent: '#0ea5e9', label: 'Quincenal' },
            'mensual':   { gradient: 'linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.06) 100%)',   accent: '#6366f1', label: 'Mensual' },
            'trimestral':{ gradient: 'linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(6,148,162,0.06) 100%)',    accent: '#10b981', label: 'Trimestral' },
            'semestral': { gradient: 'linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(236,72,153,0.06) 100%)',   accent: '#a855f7', label: 'Semestral' },
            'anual':     { gradient: 'linear-gradient(135deg, rgba(34,197,94,0.14) 0%, rgba(16,185,129,0.06) 100%)',    accent: '#22c55e', label: 'Anual' },
          }
          const defaultFreq = { gradient: 'linear-gradient(135deg, rgba(148,163,184,0.12) 0%, rgba(100,116,139,0.06) 100%)', accent: '#94a3b8', label: 'Otro' }

          const getDaysUntil = (dateStr: string) => {
            if (!dateStr) return null
            const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000*60*60*24))
            return diff
          }

          return (
          <div className="mant-redesign animate-fade-in">
            {/* Header Premium */}
            <div className="mant-header glass-card">
              <div className="mant-header-left">
                <div className="mant-icon-wrap">
                  <Wrench size={24} />
                </div>
                <div>
                  <h3 className="mant-title">Mantenimiento Preventivo</h3>
                  <p className="mant-subtitle">{mantenimiento.length} tareas programadas</p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setIsAddingMantenimiento(true)}>
                <Plus size={16} /> Nueva Tarea
              </button>
            </div>

            {/* Task Cards Grid */}
            <div className="mant-grid">
              {mantenimiento.map((m: any) => {
                const cfg = freqConfig[m.frecuencia] || defaultFreq
                const taskElements = elementos.filter((e: any) => e.tarea_id === m.id)
                const daysUntil = getDaysUntil(m.proxima_fecha)
                const isUrgent = daysUntil !== null && daysUntil <= 3
                const isPast = daysUntil !== null && daysUntil < 0

                return (
                  <div key={m.id} className="mant-card glass-card" style={{ background: cfg.gradient }}>
                    {/* Card Header */}
                    <div className="mant-card-header">
                      <div className="mant-card-identity">
                        <div className="mant-card-avatar" style={{ background: `${cfg.accent}20`, color: cfg.accent, border: `2px solid ${cfg.accent}40` }}>
                          <Wrench size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 className="mant-card-name">{m.titulo}</h4>
                          {m.descripcion && (
                            <p className="mant-card-desc">{m.descripcion}</p>
                          )}
                        </div>
                      </div>
                      <button 
                        className="mant-delete-btn" 
                        onClick={() => handleDelete('mantenimiento_preventivo', m.id, m.titulo)}
                        title="Eliminar tarea"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Info Bar */}
                    <div className="mant-info-bar">
                      <div className="mant-info-item">
                        <RefreshCw size={12} />
                        <span className="mant-freq-badge" style={{ background: `${cfg.accent}18`, color: cfg.accent, border: `1px solid ${cfg.accent}33` }}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className={`mant-info-item ${isPast ? 'mant-overdue' : isUrgent ? 'mant-urgent' : ''}`}>
                        <Calendar size={12} />
                        <span className="mant-date-text">
                          {m.proxima_fecha ? new Date(m.proxima_fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Sin fecha'}
                        </span>
                        {daysUntil !== null && (
                          <span className={`mant-countdown ${isPast ? 'past' : isUrgent ? 'urgent' : 'normal'}`}>
                            {isPast ? `${Math.abs(daysUntil)}d atrás` : daysUntil === 0 ? 'HOY' : `${daysUntil}d`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Elements Section */}
                    <div className="mant-elements-section">
                      <div className="mant-elements-label">
                        <ClipboardList size={11} /> Elementos / Sub-tareas
                      </div>
                      <div className="mant-elements-grid">
                        {taskElements.map((e: any) => (
                          <div key={e.id} className="mant-elem-chip">
                            <Check size={11} className="mant-elem-icon" style={{ color: cfg.accent }} />
                            <span className="mant-elem-name">{e.nombre}</span>
                            <button 
                              className="mant-elem-delete"
                              onClick={() => handleDelete('elementos_mantenimiento', e.id, e.nombre)}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {taskElements.length === 0 && (
                          <span className="mant-no-elems">Sin elementos aún</span>
                        )}
                      </div>
                      <div className="mant-add-elem">
                        <Plus size={13} style={{ color: cfg.accent, opacity: 0.6 }} />
                        <input 
                          type="text" 
                          className="mant-elem-input"
                          placeholder="Añadir elemento (Enter para guardar)..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              handleAddElemento(m.id, input.value)
                              input.value = ''
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <style>{`
              .mant-redesign { display: flex; flex-direction: column; gap: var(--spacing-lg); }
              .mant-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; }
              .mant-header-left { display: flex; align-items: center; gap: 1rem; }
              .mant-icon-wrap {
                width: 44px; height: 44px; border-radius: 12px;
                background: linear-gradient(135deg, #06b6d4, #6366f1);
                display: flex; align-items: center; justify-content: center;
                color: white; box-shadow: 0 4px 15px rgba(6,182,212,0.3);
              }
              .mant-title { font-size: 1.15rem; font-weight: 700; margin: 0; letter-spacing: -0.02em; }
              .mant-subtitle { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 2px; }

              .mant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: var(--spacing-lg); }

              .mant-card {
                padding: 0 !important; overflow: hidden;
                border: 1px solid rgba(255,255,255,0.06);
                transition: transform 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.3s ease;
              }
              .mant-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08);
              }

              .mant-card-header {
                display: flex; justify-content: space-between; align-items: flex-start;
                padding: 1.15rem 1.25rem; gap: 0.75rem;
              }
              .mant-card-identity { display: flex; align-items: flex-start; gap: 0.75rem; flex: 1; min-width: 0; }
              .mant-card-avatar {
                width: 38px; height: 38px; border-radius: 10px;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0; transition: transform 0.25s ease;
              }
              .mant-card:hover .mant-card-avatar { transform: scale(1.1) rotate(5deg); }
              .mant-card-name { font-weight: 700; font-size: 1rem; margin: 0; letter-spacing: -0.01em; line-height: 1.3; }
              .mant-card-desc { font-size: 0.72rem; color: var(--color-text-muted); margin-top: 3px; line-height: 1.4; }
              .mant-delete-btn {
                width: 30px; height: 30px; border-radius: 8px; border: none; flex-shrink: 0;
                background: rgba(239,68,68,0.08); color: rgba(239,68,68,0.5);
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.2s ease;
              }
              .mant-delete-btn:hover { background: rgba(239,68,68,0.2); color: #ef4444; transform: scale(1.1); }

              .mant-info-bar {
                display: flex; justify-content: space-between; align-items: center;
                padding: 0.65rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.04);
                border-bottom: 1px solid rgba(255,255,255,0.04);
                background: rgba(0,0,0,0.08);
              }
              .mant-info-item { display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: var(--color-text-muted); }
              .mant-freq-badge {
                padding: 2px 9px; border-radius: 999px;
                font-size: 0.62rem; font-weight: 800; letter-spacing: 0.06em;
              }
              .mant-date-text { font-weight: 500; }
              .mant-countdown {
                padding: 1px 7px; border-radius: 6px; font-size: 0.62rem; font-weight: 800;
              }
              .mant-countdown.normal { background: rgba(99,102,241,0.15); color: #818cf8; }
              .mant-countdown.urgent { background: rgba(245,158,11,0.2); color: #f59e0b; animation: pulse-glow 2s infinite; }
              .mant-countdown.past { background: rgba(239,68,68,0.2); color: #ef4444; animation: pulse-glow 1.5s infinite; }
              @keyframes pulse-glow { 0%,100%{ opacity:1; } 50%{ opacity:0.6; } }
              .mant-overdue .mant-date-text { color: #ef4444; }
              .mant-urgent .mant-date-text { color: #f59e0b; }

              .mant-elements-section { padding: 0.85rem 1.25rem 1.15rem; }
              .mant-elements-label {
                display: flex; align-items: center; gap: 5px;
                font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
                letter-spacing: 0.08em; color: var(--color-text-muted);
                margin-bottom: 0.6rem;
              }
              .mant-elements-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 0.6rem; }

              .mant-elem-chip {
                display: flex; align-items: center; gap: 5px;
                padding: 5px 7px 5px 9px;
                background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px; font-size: 0.76rem; font-weight: 500;
                transition: all 0.2s ease;
              }
              .mant-elem-chip:hover {
                background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15);
                transform: translateY(-1px);
              }
              .mant-elem-icon { flex-shrink: 0; }
              .mant-elem-name { white-space: nowrap; }
              .mant-elem-delete {
                width: 16px; height: 16px; border-radius: 50%;
                border: none; background: transparent; color: rgba(255,255,255,0.2);
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.2s ease; flex-shrink: 0;
              }
              .mant-elem-chip:hover .mant-elem-delete { color: #ef4444; background: rgba(239,68,68,0.1); }
              .mant-elem-delete:hover { background: rgba(239,68,68,0.25) !important; transform: scale(1.15); }
              .mant-no-elems { font-size: 0.72rem; color: var(--color-text-muted); font-style: italic; opacity: 0.6; }

              .mant-add-elem {
                display: flex; align-items: center; gap: 6px;
                padding: 5px 10px; border-radius: 8px;
                border: 1px dashed rgba(255,255,255,0.1);
                background: rgba(255,255,255,0.02);
                transition: border-color 0.2s;
              }
              .mant-add-elem:focus-within { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.04); }
              .mant-elem-input {
                flex: 1; border: none; background: transparent;
                font-size: 0.75rem; color: var(--color-text);
                outline: none; padding: 2px 0;
              }
              .mant-elem-input::placeholder { color: var(--color-text-muted); opacity: 0.5; }

              @media (max-width: 640px) {
                .mant-grid { grid-template-columns: 1fr; }
                .mant-header { flex-direction: column; gap: 0.75rem; align-items: flex-start; }
              }
            `}</style>
          </div>
          )
        })()}

        {/* Plantillas Tab Content */}
        {activeTab === 'plantillas' && (
          <div className="mant-redesign animate-fade-in">
            <div className="mant-header">
              <div className="mant-header-left">
                <div className="mant-icon-wrap" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="mant-title">Plantillas de Checklist</h2>
                  <p className="mant-subtitle">Define puntos de inspección estándar para tus activos</p>
                </div>
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => setIsAddingPlantilla(true)}
              >
                <Plus size={18} />
                <span>Nueva Plantilla</span>
              </button>
            </div>

            {isAddingPlantilla && (
              <div className="glass-card mb-xl p-xl animate-scale-in border-accent/20">
                <div className="flex justify-between items-center mb-lg">
                  <h3 className="text-xl font-bold flex items-center gap-md">
                    <FileText className="text-accent" /> Configurar Plantilla
                  </h3>
                  <button onClick={() => setIsAddingPlantilla(false)} className="text-muted hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleAddPlantilla} className="grid grid-cols-1 gap-lg">
                  <div className="input-field">
                    <label>Nombre de la Plantilla (ej: Aire Acondicionado)</label>
                    <input 
                      type="text" 
                      required
                      value={newPlantilla.nombre}
                      onChange={e => setNewPlantilla({...newPlantilla, nombre: e.target.value})}
                      placeholder="Nombre descriptivo..."
                    />
                  </div>

                  <div className="bg-white/5 p-lg rounded-xl border border-white/10">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted opacity-80 mb-md block">
                      Puntos de Inspección
                    </label>
                    <div className="flex flex-wrap gap-md mb-lg">
                      {newPlantilla.items.map((item, idx) => (
                        <div key={idx} className="mant-elem-chip">
                          <Check size={12} className="text-accent" />
                          <span>{item}</span>
                          <button 
                            type="button"
                            onClick={() => setNewPlantilla({
                              ...newPlantilla, 
                              items: newPlantilla.items.filter((_, i) => i !== idx)
                            })}
                            className="text-muted hover:text-danger ml-xs"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {newPlantilla.items.length === 0 && (
                        <span className="text-sm italic text-muted">Aún no has añadido puntos a esta plantilla</span>
                      )}
                    </div>
                    <div className="flex gap-md">
                      <input 
                        type="text" 
                        value={newPlantillaItem}
                        onChange={e => setNewPlantillaItem(e.target.value)}
                        placeholder="ej: Revisar nivel de gas refrigerante"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newPlantillaItem.trim()) {
                              setNewPlantilla({...newPlantilla, items: [...newPlantilla.items, newPlantillaItem.trim()]})
                              setNewPlantillaItem('')
                            }
                          }
                        }}
                        className="flex-1 bg-black/40 border-white/10 rounded-lg p-md text-sm"
                      />
                      <button 
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (newPlantillaItem.trim()) {
                            setNewPlantilla({...newPlantilla, items: [...newPlantilla.items, newPlantillaItem.trim()]})
                            setNewPlantillaItem('')
                          }
                        }}
                      >
                        Añadir
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-md pt-md">
                    <button type="button" onClick={() => setIsAddingPlantilla(false)} className="btn btn-secondary">Cancelar</button>
                    <button type="submit" className="btn btn-primary">Guardar Plantilla</button>
                  </div>
                </form>
              </div>
            )}

            <div className="mant-grid">
              {plantillas.map(p => (
                <div key={p.id} className="glass-card mant-card">
                  <div className="mant-card-header">
                    <div className="mant-card-identity">
                      <div className="mant-card-avatar" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <h4 className="mant-card-name">{p.nombre}</h4>
                        <p className="mant-card-desc">{p.items?.length || 0} puntos de revisión</p>
                      </div>
                    </div>
                    <button 
                      className="mant-delete-btn"
                      onClick={() => handleDelete('mantenimiento_plantillas', p.id, p.nombre)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="p-lg pt-none">
                    <div className="flex flex-wrap gap-xs">
                      {p.items?.slice(0, 5).map((item, i) => (
                        <span key={i} className="text-[10px] bg-white/5 border border-white/10 px-xs py-[2px] rounded text-muted">
                          {item}
                        </span>
                      ))}
                      {p.items?.length > 5 && (
                        <span className="text-[10px] text-accent">+{p.items.length - 5} más</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {plantillas.length === 0 && !isAddingPlantilla && (
                <div className="col-span-full py-xl text-center glass-card opacity-60">
                  <FileText size={48} className="mx-auto mb-lg text-muted op-40" />
                  <p>No hay plantillas creadas. Crea una para agilizar tus checklists.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* V-Nexus Tab Content */}
        {activeTab === 'v-nexus' && (
          <div className="nexus-container animate-fade-in">
            {/* Header V-Nexus */}
            <div className="glass-card nexus-header-card mb-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
              <div className="panel-header border-b p-xl relative z-10" style={{borderBottom: '1px solid rgba(255, 255, 255, 0.05)'}}>
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-white">V-Nexus: Portal Digital</h3>
                      <p className="text-sm text-muted">Gestión de QRs por planta y zona</p>
                    </div>
                  </div>
                  <div className="flex gap-md">
                     <div className="nexus-search relative">
                       <input 
                         type="text" 
                         placeholder="Buscar habitación..." 
                         className="nexus-search-input"
                         value={nexusSearchQuery}
                         onChange={e => setNexusSearchQuery(e.target.value)}
                       />
                       <Plus size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                     </div>
                     <div className="stat-pill">
                       <DoorOpen size={14} className="text-indigo-400" />
                       <span className="font-bold">{habitaciones.length}</span>
                       <span className="text-xs text-muted">Habitaciones</span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Floor Selection Bar */}
              <div className="floor-nav-bar p-md bg-black/20 relative z-10 flex items-center gap-md border-b border-white/5">
                <span className="text-[10px] font-black uppercase text-muted tracking-widest pl-md">Plantas:</span>
                <div className="flex gap-sm overflow-x-auto no-scrollbar py-sm">
                  {Array.from(new Set(habitaciones.map(h => {
                    const match = h.nombre.match(/^\d/);
                    return match ? match[0] : 'Otros';
                  }))).sort().map(floor => (
                    <button 
                      key={floor}
                      onClick={() => { setActiveFloor(floor); setSelectedNexusZona('all'); }}
                      className={`floor-btn ${activeFloor === floor ? 'active' : ''}`}
                    >
                      Planta {floor}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone Filter Bar */}
              <div className="zone-filter-bar p-md px-xl flex items-center gap-lg relative z-10 bg-black/10">
                <div className="flex items-center gap-2 text-xs text-indigo-300 font-bold">
                  <MapPin size={12} />
                  <span>Filtrar Zona:</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button 
                    onClick={() => setSelectedNexusZona('all')}
                    className={`filter-chip ${selectedNexusZona === 'all' ? 'active' : ''}`}
                  >
                    Todas
                  </button>
                  {zonas.filter(z => 
                    habitaciones.some(h => {
                      const floorMatch = h.nombre.match(/^\d/);
                      const roomFloor = floorMatch ? floorMatch[0] : 'Otros';
                      return roomFloor === activeFloor && h.zona_id === z.id;
                    })
                  ).map(z => (
                    <button 
                      key={z.id}
                      onClick={() => setSelectedNexusZona(z.id)}
                      className={`filter-chip ${selectedNexusZona === z.id ? 'active' : ''}`}
                    >
                      {z.nombre}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* QR Grid Grouped */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {habitaciones
                .filter(h => {
                  const floorMatch = h.nombre.match(/^\d/);
                  const roomFloor = floorMatch ? floorMatch[0] : 'Otros';
                  const matchesFloor = roomFloor === activeFloor;
                  const matchesZona = selectedNexusZona === 'all' || h.zona_id === selectedNexusZona;
                  const matchesSearch = h.nombre.toLowerCase().includes(nexusSearchQuery.toLowerCase());
                  return matchesFloor && matchesZona && matchesSearch;
                })
                .map((h: any) => {
                  const zonaName = zonas.find((z: any) => z.id === h.zona_id)?.nombre || 'General'
                  const portalUrl = `${window.location.origin}/guest/${h.nombre}`
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portalUrl)}`
                  
                  return (
                    <div key={h.id} className="nexus-room-card glass-card hover-glow">
                      <div className="room-card-header">
                        <div className="room-info">
                          <span className="room-label">Huésped</span>
                          <h4 className="room-number">Hab. {h.nombre}</h4>
                          <span className="room-zone-badge">{zonaName}</span>
                        </div>
                        <div className="room-qr-mini">
                          <img src={qrUrl} alt={`QR ${h.nombre}`} />
                          <div className="qr-overlay" onClick={() => window.open(qrUrl, '_blank')}>
                            <QrCode size={16} />
                          </div>
                        </div>
                      </div>
                      
                      <div className="room-card-actions">
                        <button 
                          className="nexus-btn-secondary"
                          onClick={() => { navigator.clipboard.writeText(portalUrl); alert('URL Copiada'); }}
                        >
                          <RefreshCw size={14} /> <span>URL</span>
                        </button>
                        <a 
                          href={qrUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="nexus-btn-primary"
                        >
                          <BookOpen size={14} /> <span>PDF QR</span>
                        </a>
                      </div>
                    </div>
                  )
                })}
            </div>

            <style>{`
              .nexus-header-card { padding: 0 !important; border-radius: 24px; border: 1px solid rgba(255,255,255,0.06); }
              .floor-btn { 
                padding: 10px 20px; border-radius: 14px; background: rgba(255,255,255,0.03); 
                border: 1px solid rgba(255,255,255,0.08); color: var(--color-text-muted); 
                font-weight: 700; font-size: 0.75rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                white-space: nowrap;
              }
              .floor-btn:hover { background: rgba(255,255,255,0.06); }
              .floor-btn.active { 
                background: var(--color-accent); color: white; border-color: var(--color-accent);
                box-shadow: 0 4px 15px rgba(99,102,241,0.3); transform: translateY(-2px);
              }
              
              .filter-chip {
                padding: 6px 14px; border-radius: 20px; background: transparent; border: 1px solid rgba(255,255,255,0.1);
                color: var(--color-text-muted); font-size: 0.7rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
              }
              .filter-chip:hover { border-color: var(--color-accent); color: white; }
              .filter-chip.active { background: rgba(99,102,241,0.1); border-color: var(--color-accent); color: var(--color-accent); }
              
              .stat-pill { 
                display: flex; align-items: center; gap: 10px; padding: 10px 18px; 
                background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);
              }
              
              .nexus-room-card { padding: 20px !important; border-radius: 20px; display: flex; flex-direction: column; gap: 20px; position: relative; }
              .room-card-header { display: flex; justify-content: space-between; align-items: center; }
              .room-label { font-[10px]; font-bold; uppercase; letter-spacing: 0.1em; color: var(--color-accent); opacity: 0.8; }
              .room-number { font-size: 1.25rem; font-black; color: white; margin: 4px 0; }
              .room-zone-badge { font-size: 0.65rem; color: var(--color-text-muted); background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 6px; }
              
              .room-qr-mini { width: 64px; height: 64px; background: white; border-radius: 12px; padding: 4px; position: relative; cursor: pointer; }
              .room-qr-mini img { width: 100%; height: 100%; border-radius: 8px; }
              .qr-overlay { 
                position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
                opacity: 0; transition: opacity 0.2s; border-radius: 12px; color: white;
              }
              .room-qr-mini:hover .qr-overlay { opacity: 1; }
              
              .room-card-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              .nexus-btn-primary, .nexus-btn-secondary {
                height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;
                font-size: 0.7rem; font-bold; transition: all 0.2s; cursor: pointer; border: none;
              }
              .nexus-btn-primary { background: var(--color-accent); color: white; }
              .nexus-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
              .nexus-btn-secondary { background: rgba(255,255,255,0.05); color: var(--color-text-muted); border: 1px solid rgba(255,255,255,0.1); }
              .nexus-btn-secondary:hover { background: rgba(255,255,255,0.1); color: white; }
              
              .nexus-search-input {
                background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
                padding: 10px 18px; padding-right: 40px; border-radius: 16px; font-size: 0.75rem;
                color: white; width: 220px; transition: all 0.2s;
              }
              .nexus-search-input:focus { border-color: var(--color-accent); outline: none; background: rgba(255,255,255,0.06); }

              .hover-glow:hover { box-shadow: 0 0 30px rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.3); transform: translateY(-3px); }
            `}</style>
          </div>
        )}

        {/* V-QR Tab Content */}
        {activeTab === 'v-qr' && (
          <div className="glass-card table-panel animate-fade-in" style={{background: 'rgba(15, 15, 26, 0.4)', borderRadius: '32px', border: '1px solid rgba(255, 255, 255, 0.05)', overflow: 'hidden'}}>
            <div className="panel-header border-b" style={{padding: '32px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)'}}>
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <QrCode size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">V-QR: Gestión de Activos</h3>
                    <p className="text-sm text-muted">Equipamiento técnico y maquinaria</p>
                  </div>
                </div>
                <button className="btn btn-primary px-6 rounded-2xl h-12 flex items-center gap-2" onClick={() => setIsAddingActivo(true)}>
                  <Plus size={18} /> Nuevo Activo
                </button>
              </div>
            </div>
            
            <div className="panel-body p-none">
              <div className="table-responsive" style={{border: 'none'}}>
                <table className="config-table">
                  <thead>
                    <tr style={{background: 'transparent'}}>
                      <th style={{padding: '24px'}}>Activo</th>
                      <th>Ubicación</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                      <th className="text-center">QR</th>
                      <th className="text-right" style={{paddingRight: '24px'}}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activos.map(a => {
                      const portalUrl = `${window.location.origin}/asset/${a.id}`
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portalUrl)}`
                      
                      return (
                        <tr key={a.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/[0.03]">
                          <td style={{padding: '24px'}}>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black">
                                {a.nombre[0]}
                              </div>
                              <strong className="text-white text-md">{a.nombre}</strong>
                            </div>
                          </td>
                          <td><span className="text-sm text-gray-400">{zonas.find(z => z.id === a.zona_id)?.nombre || 'General'}</span></td>
                          <td>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/50 bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                              {a.tipo?.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${a.estado === 'operativo' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : a.estado === 'averiado' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`} />
                              <span className={`text-[11px] font-bold uppercase tracking-wider ${a.estado === 'operativo' ? 'text-green-400' : a.estado === 'averiado' ? 'text-red-400' : 'text-yellow-400'}`}>
                                {a.estado?.toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="text-center">
                            <a href={qrUrl} target="_blank" rel="noreferrer" className="inline-block p-1 bg-white rounded-xl shadow-lg">
                              <img src={qrUrl} alt={`QR ${a.nombre}`} width="48" height="48" className="rounded-lg" />
                            </a>
                          </td>
                          <td className="text-right" style={{paddingRight: '24px'}}>
                            <button className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all" onClick={() => handleDelete('activos', a.id, a.nombre)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
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
                <div className="input-group"><label className="input-label">Descripción</label><textarea className="input" rows={3} value={newCanal.descripcion} onChange={e => setNewCanal({...newCanal, descripcion: e.target.value})}></textarea></div>
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
                  <textarea className="input" rows={2} placeholder="Detalles de la revisión..." value={newMantenimiento.descripcion} onChange={e => setNewMantenimiento({...newMantenimiento, descripcion: e.target.value})}></textarea>
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
                <div className="input-group mt-md">
                  <label className="input-label">Usar Plantilla de Checklist (Opcional)</label>
                  <select 
                    className="select" 
                    value={newMantenimiento.plantillaId} 
                    onChange={e => setNewMantenimiento({...newMantenimiento, plantillaId: e.target.value})}
                  >
                    <option value="">-- Sin Plantilla (Checklist Vacío) --</option>
                    {plantillas.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.items?.length || 0} pasos)</option>
                    ))}
                  </select>
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

      {/* MODAL NUEVO ACTIVO */}
      {isAddingActivo && (
        <div className="modal-overlay" onClick={() => setIsAddingActivo(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar Nuevo Activo</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsAddingActivo(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddActivo}>
              <div className="modal-body">
                <div className="input-group mb-md">
                  <label className="input-label">Nombre del Activo / Equipo</label>
                  <input type="text" className="input" placeholder="Ej. Caldera Central A, Aire Planta 1..." value={newActivo.nombre} onChange={e => setNewActivo({...newActivo, nombre: e.target.value})} required />
                </div>
                <div className="grid-2 gap-md mb-md">
                  <div className="input-group">
                    <label className="input-label">Tipo de Activo</label>
                    <select className="select" value={newActivo.tipo} onChange={e => setNewActivo({...newActivo, tipo: e.target.value})}>
                      <option value="maquinaria">Maquinaria</option>
                      <option value="climatizacion">Climatización</option>
                      <option value="fontaneria">Fontanería</option>
                      <option value="electricidad">Electricidad</option>
                      <option value="elevacion">Elevación</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Ubicación (Zona)</label>
                    <select className="select" value={newActivo.zona_id} onChange={e => setNewActivo({...newActivo, zona_id: e.target.value})}>
                      <option value="">Seleccionar Zona...</option>
                      {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">URL del Manual Técnico (PDF/Web)</label>
                  <input type="url" className="input" placeholder="https://ejemplo.com/manual.pdf" value={newActivo.manual_url} onChange={e => setNewActivo({...newActivo, manual_url: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Registrar Activo</button></div>
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



