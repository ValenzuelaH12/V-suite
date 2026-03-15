import { useState, useEffect } from 'react'
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  X,
  Edit2,
  Trash2,
  Download,
  FileSpreadsheet,
  FileText
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Inventory() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    stock_actual: 0,
    stock_minimo: 5,
    unidad: 'unidades'
  })

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .order('nombre', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('inventario')
          .update({
            ...formData,
            actualizado_por: profile.id,
            ultima_actualizacion: new Date().toISOString()
          })
          .eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('inventario')
          .insert([{
            ...formData,
            actualizado_por: profile.id
          }])
        if (error) throw error
      }
      setIsModalOpen(false)
      setEditingItem(null)
      setFormData({ nombre: '', categoria: '', stock_actual: 0, stock_minimo: 5, unidad: 'unidades' })
      fetchInventory()
    } catch (error) {
      console.error('Error saving item:', error)
    }
  }

  const handleUpdateStock = async (id, current, delta) => {
    try {
      const { error } = await supabase
        .from('inventario')
        .update({ 
          stock_actual: Math.max(0, current + delta),
          ultima_actualizacion: new Date().toISOString(),
          actualizado_por: profile.id
        })
        .eq('id', id)
      if (error) throw error
      fetchInventory()
    } catch (error) {
      console.error('Error updating stock:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este artículo?')) return
    try {
      const { error } = await supabase.from('inventario').delete().eq('id', id)
      if (error) throw error
      fetchInventory()
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    if (filter === 'low') return matchesSearch && item.stock_actual <= item.stock_minimo
    return matchesSearch
  })

  const categories = [...new Set(items.map(i => i.categoria))]

  const exportToCSV = () => {
    const headers = ['ID', 'Nombre', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Unidad', 'Última Actualización']
    
    const csvData = filteredItems.map(item => [
      item.id,
      `"${item.nombre.replace(/"/g, '""')}"`,
      `"${item.categoria}"`,
      item.stock_actual,
      item.stock_minimo,
      `"${item.unidad}"`,
      item.ultima_actualizacion ? new Date(item.ultima_actualizacion).toLocaleString() : 'N/A'
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `Inventario_VSuite_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowExportMenu(false)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Reporte de Inventario - V-Suite', 14, 22)
    
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString()}`, 14, 30)

    const tableData = filteredItems.map(item => [
      item.nombre,
      item.categoria,
      `${item.stock_actual} ${item.unidad}`,
      `${item.stock_minimo} ${item.unidad}`,
      item.stock_actual <= item.stock_minimo ? 'Bajo' : 'Normal',
      item.ultima_actualizacion ? new Date(item.ultima_actualizacion).toLocaleDateString() : 'N/A'
    ])

    autoTable(doc, {
      startY: 36,
      head: [['Artículo', 'Categoría', 'Stock', 'Mínimo', 'Estado', 'Actualizado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 9 },
      margin: { top: 36 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'Bajo') {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [16, 185, 129];
          }
        }
      }
    })

    doc.save(`Inventario_VSuite_${new Date().toISOString().split('T')[0]}.pdf`)
    setShowExportMenu(false)
  }

  return (
    <div className="inventory-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario y Suministros</h1>
          <p className="page-subtitle">Control de stock de artículos operativos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Añadir Artículo</span>
        </button>
      </div>

      <div className="inventory-toolbar glass-card mb-lg px-lg py-md flex justify-between items-center gap-md">
        <div className="search-bar relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input 
            type="text" 
            className="input pl-10" 
            placeholder="Buscar por nombre o categoría..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-sm items-center">
          <button 
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
          <button 
            className={`btn btn-sm ${filter === 'low' ? 'btn-danger' : 'btn-ghost'}`}
            onClick={() => setFilter('low')}
          >
            Stock Bajo
          </button>
          <button className="btn btn-ghost btn-sm" onClick={fetchInventory} title="Refrescar">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <div className="relative ml-sm pl-sm border-l border-white/10">
            <button 
              className="btn btn-secondary btn-sm flex items-center gap-xs"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Exportar Inventario"
            >
              <Download size={14} />
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-sm w-44 glass-card border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 animate-fade-in">
                <button 
                  className="w-full text-left px-md py-sm hover:bg-white/5 flex items-center gap-sm transition-colors text-xs"
                  onClick={exportToCSV}
                >
                  <FileSpreadsheet size={14} className="text-success" />
                  Descargar CSV
                </button>
                <button 
                  className="w-full text-left px-md py-sm hover:bg-white/5 flex items-center gap-sm transition-colors text-xs border-t border-white/5"
                  onClick={exportToPDF}
                >
                  <FileText size={14} className="text-danger" />
                  Descargar PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="inventory-grid">
        {filteredItems.map(item => (
          <div key={item.id} className={`inventory-card glass-card ${item.stock_actual <= item.stock_minimo ? 'border-danger/30' : ''}`}>
            <div className="flex justify-between items-start mb-md">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold mb-xs">{item.categoria}</span>
                <h3 className="font-semibold text-lg">{item.nombre}</h3>
              </div>
              <div className="flex gap-xs">
                <button className="btn-icon btn-ghost btn-xs" onClick={() => {
                  setEditingItem(item)
                  setFormData({ ...item })
                  setIsModalOpen(true)
                }}><Edit2 size={14} /></button>
                <button className="btn-icon btn-ghost btn-xs text-danger" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="stock-display flex items-center justify-between p-md glass rounded-xl mb-lg">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted uppercase font-bold">En Stock</span>
                <div className="flex items-baseline gap-xs">
                  <span className={`text-2xl font-black ${item.stock_actual <= item.stock_minimo ? 'text-danger' : 'text-primary'}`}>
                    {item.stock_actual}
                  </span>
                  <span className="text-xs text-muted">{item.unidad}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted uppercase font-bold">Mínimo</span>
                <span className="text-sm font-semibold">{item.stock_minimo} {item.unidad}</span>
              </div>
            </div>

            <div className="card-footer flex justify-between items-center">
              <div className="flex gap-xs">
                <button className="btn-icon btn-secondary h-8 w-8" onClick={() => handleUpdateStock(item.id, item.stock_actual, -1)}>
                  <ArrowDownRight size={16} />
                </button>
                <button className="btn-icon btn-secondary h-8 w-8" onClick={() => handleUpdateStock(item.id, item.stock_actual, 1)}>
                  <ArrowUpRight size={16} />
                </button>
              </div>
              {item.stock_actual <= item.stock_minimo && (
                <div className="flex items-center gap-xs text-danger animate-pulse">
                  <AlertCircle size={14} />
                  <span className="text-[10px] font-bold uppercase">Reposición</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '1.25rem 1.5rem' }}>
                <div className="input-group mb-md">
                  <label className="input-label">Nombre del artículo</label>
                  <input type="text" className="input" value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="input-group">
                    <label className="input-label">Categoría</label>
                    <input type="text" className="input" list="categories" value={formData.categoria}
                      onChange={e => setFormData({...formData, categoria: e.target.value})} required />
                    <datalist id="categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Unidad</label>
                    <input type="text" className="input" value={formData.unidad}
                      onChange={e => setFormData({...formData, unidad: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Stock Actual</label>
                    <input type="number" className="input" value={formData.stock_actual}
                      onChange={e => setFormData({...formData, stock_actual: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Stock Mínimo</label>
                    <input type="number" className="input" value={formData.stock_minimo}
                      onChange={e => setFormData({...formData, stock_minimo: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingItem ? 'Guardar Cambios' : 'Crear Artículo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .inventory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--spacing-lg);
        }
        .inventory-card {
          padding: var(--spacing-lg);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .inventory-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.3);
        }
        .stock-display {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: var(--spacing-md); }
        .text-primary { color: var(--color-accent); }
      `}</style>
    </div>
  )
}
