import React from 'react';
import { Search, Filter, List, Columns } from 'lucide-react';
import { DebouncedSearchInput } from '../../ui/DebouncedSearchInput';

interface IncidentToolbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  viewMode: 'list' | 'board';
  setViewMode: (mode: 'list' | 'board') => void;
  activeCount: number;
}

export const IncidentToolbar: React.FC<IncidentToolbarProps> = ({
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  viewMode,
  setViewMode,
  activeCount
}) => {
  return (
    <div className="incidencias-toolbar glass-card">
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'activas' ? 'active' : ''}`}
          onClick={() => setActiveTab('activas')}
        >
          Activas 
          <span className="badge badge-accent ml-sm">
            {activeCount}
          </span>
        </button>
        <button 
          className={`tab ${activeTab === 'resueltas' ? 'active' : ''}`}
          onClick={() => setActiveTab('resueltas')}
        >
          Resueltas
        </button>
        <button 
          className={`tab ${activeTab === 'todas' ? 'active' : ''}`}
          onClick={() => setActiveTab('todas')}
        >
          Todas
        </button>
      </div>

      <div className="toolbar-actions">
        <div className="search-bar variant-small">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por ID, título..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button className="btn btn-secondary btn-icon">
          <Filter size={18} />
        </button>

        <div className="flex bg-white/5 rounded-lg p-1 mr-2 border border-white/10 hidden md:flex">
          <button 
            onClick={() => setViewMode('list')} 
            className={`p-1.5 flex items-center gap-xs text-xs font-bold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'}`}
          >
            <List size={14} /> Lista
          </button>
          <button 
            onClick={() => setViewMode('board')} 
            className={`p-1.5 flex items-center gap-xs text-xs font-bold rounded-md transition-colors ${viewMode === 'board' ? 'bg-accent/20 text-accent ring-1 ring-accent/50 shadow-sm' : 'text-muted hover:text-white'}`}
          >
            <Columns size={14} /> Tablero
          </button>
        </div>

        <div className="hidden sm:block mx-sm w-full max-w-sm">
           <DebouncedSearchInput 
             value={searchTerm} 
             onChange={setSearchTerm} 
             placeholder="Buscar por título, lugar, #ID..." 
           />
        </div>
      </div>
    </div>
  );
};
