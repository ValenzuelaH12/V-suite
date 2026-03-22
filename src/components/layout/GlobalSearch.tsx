import { Search, ChevronRight } from 'lucide-react'

export function GlobalSearch({
  searchQuery,
  onSearchChange,
  showSearch,
  setShowSearch,
  searchLoading,
  searchResults,
  onSearchSelect
}: {
  searchQuery: string
  onSearchChange: (val: string) => void
  showSearch: boolean
  setShowSearch: (val: boolean) => void
  searchLoading: boolean
  searchResults: any[]
  onSearchSelect: (link: string) => void
}) {
  return (
    <div className="search-bar" style={{ position: 'relative' }}>
      <Search size={18} className="search-icon" />
      <input 
        type="text" 
        placeholder="Buscar incidencias, habitaciones, inventario..." 
        className="search-input"
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        onFocus={() => searchResults.length > 0 && setShowSearch(true)}
        onBlur={() => setTimeout(() => setShowSearch(false), 200)}
      />
      {showSearch && (
        <div className="global-search-results" style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'rgba(15,15,35,0.97)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 200,
          maxHeight: '320px', overflowY: 'auto'
        }}>
          {searchLoading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#6b6b8d', fontSize: '0.8rem' }}>Buscando...</div>
          ) : searchResults.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#6b6b8d', fontSize: '0.8rem' }}>Sin resultados para "{searchQuery}"</div>
          ) : (
            searchResults.map((r, idx) => (
              <div key={idx} className="search-result-item" style={{
                padding: '0.6rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s'
              }} onMouseDown={() => onSearchSelect(r._link)}>
                <span className={`search-badge badge-${r._type}`} style={{
                  fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '2px 6px', borderRadius: '4px', flexShrink: 0,
                  background: r._type === 'incidencia' ? 'rgba(239,68,68,0.15)' : r._type === 'inventario' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                  color: r._type === 'incidencia' ? '#f87171' : r._type === 'inventario' ? '#4ade80' : '#a5b4fc'
                }}>{r._type === 'incidencia' ? 'INC' : r._type === 'inventario' ? 'INV' : 'HAB'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.title || r.nombre}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6b6b8d' }}>
                    {r._type === 'incidencia' ? `${r.location} · ${r.status}` : r._type === 'inventario' ? `${r.categoria} · Stock: ${r.stock_actual}` : ''}
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: '#6b6b8d', flexShrink: 0 }} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
