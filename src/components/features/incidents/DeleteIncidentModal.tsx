import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteIncidentModal: React.FC<DeleteIncidentModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="text-danger flex items-center gap-sm">
            <Trash2 size={20} /> Confirmar Eliminación
          </h2>
        </div>
        <div className="modal-body py-lg">
          <p className="text-secondary leading-relaxed">
            ¿Estás completamente seguro de que deseas eliminar esta incidencia? 
            <br /><br />
            <span className="font-bold text-danger">Esta acción no se puede deshacer y borrará permanentemente todo el historial relacionado.</span>
          </p>
        </div>
        <div className="modal-footer">
          <button 
            className="btn btn-secondary flex-1" 
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            className="btn btn-primary flex-1 bg-danger border-danger" 
            onClick={onConfirm}
          >
            Confirmar Borrado
          </button>
        </div>
      </div>
    </div>
  );
};
