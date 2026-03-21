import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Camera, 
  MessageSquare, 
  ChevronRight, 
  ChevronLeft,
  X,
  AlertTriangle,
  ClipboardCheck,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { preventivoService } from '../../../services/preventivoService';
import { incidentService } from '../../../services/incidentService';
import { SignaturePad } from '../../ui/SignaturePad';
import { PreventiveRevision, PreventiveResult } from '../../../types';

interface Props {
  revision: PreventiveRevision;
  onComplete: () => void;
  onCancel: () => void;
}

export const InspeccionChecklist = ({ revision, onComplete, onCancel }: Props) => {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [results, setResults] = useState<Record<string, Partial<PreventiveResult>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const data = await preventivoService.getTemplateDetail(revision.plantilla_id);
        setDetail(data);
      } catch (error) {
        console.error('Error loading template detail:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [revision.plantilla_id]);

  const activeCategory = detail?.preventivo_categorias?.[activeCategoryIdx];
  const items = activeCategory?.preventivo_items || [];
  const isLastCategory = activeCategoryIdx === (detail?.preventivo_categorias?.length || 0) - 1;

  const handleResult = (itemId: string, valor: string) => {
    setResults(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], item_id: itemId, valor }
    }));
  };

  const handleComment = (itemId: string, comentario: string) => {
    setResults(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], item_id: itemId, comentario }
    }));
  };

  const allItemsAnswered = items.every((item: any) => !!results[item.id]?.valor);

  const handleSubmitFinal = async (signatureData?: string) => {
    setIsSubmitting(true);
    try {
      const resultsArray = Object.values(results);
      
      // 1. Guardar resultados y finalizar la revisión básica
      await preventivoService.submitResults(revision.id, resultsArray as any);

      // 2. Motor de Reglas: Crear incidencias para cada NOK
      for (const res of resultsArray) {
        if (res.valor === 'nok' || res.valor === 'no') {
          const itemText = detail.preventivo_categorias
            .flatMap((c: any) => c.preventivo_items)
            .find((i: any) => i.id === res.item_id)?.texto;

          await incidentService.create({
            title: `Fallo detectado: ${itemText}`,
            description: `Detectado durante inspección preventiva '${detail.nombre}' en ${revision.ubicacion_nombre}. Comentario: ${res.comentario || 'Sin comentario'}`,
            location: revision.ubicacion_nombre,
            priority: 'medium',
            status: 'pending',
            hotel_id: revision.hotel_id,
            habitacion_id: revision.entidad_tipo === 'habitacion' ? revision.entidad_id : undefined,
            zona_id: revision.entidad_tipo === 'zona' ? revision.entidad_id : undefined,
            asset_id: revision.entidad_tipo === 'activo' ? revision.entidad_id : undefined
          }, revision.hotel_id);
        }
      }

      onComplete();
    } catch (error) {
      console.error('Error submitting checklist:', error);
      alert('Error al guardar los resultados.');
    } finally {
      setIsSubmitting(false);
      setShowSignatureModal(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-xl h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent" />
      <p className="mt-md text-muted">Cargando checklist operativo...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background animate-fade-in sm:max-w-md mx-auto relative overflow-hidden">
      {showSignatureModal && (
        <SignaturePad 
          onSave={(data) => {
            setSignature(data);
            handleSubmitFinal(data);
          }}
          onCancel={() => setShowSignatureModal(false)}
          title={`Validación: ${revision.ubicacion_nombre}`}
        />
      )}
      {/* Header */}
      <div className="p-lg flex justify-between items-center bg-white/5 border-b border-white/5">
        <div>
          <h2 className="text-lg font-bold truncate max-w-[200px]">{revision.ubicacion_nombre}</h2>
          <p className="text-[10px] text-accent font-black uppercase tracking-widest">{detail?.nombre}</p>
        </div>
        <button onClick={onCancel} className="p-sm hover:bg-white/10 rounded-full text-muted">
          <X size={24} />
        </button>
      </div>

      {/* Progress Stepper */}
      <div className="flex gap-1 p-xs bg-white/5 border-b border-white/5">
        {detail?.preventive_categorias?.map((_: any, idx: number) => (
          <div 
            key={idx} 
            className={`h-1 flex-1 rounded-full transition-all ${idx <= activeCategoryIdx ? 'bg-accent' : 'bg-white/10'}`} 
          />
        ))}
      </div>

      {/* Category Title */}
      <div className="p-lg">
        <h3 className="text-xl font-black text-white">{activeCategory?.nombre}</h3>
        <p className="text-xs text-muted">Responde a todos los ítems para continuar</p>
      </div>

      {/* Checklist Items */}
      <div className="flex-1 overflow-y-auto px-lg space-y-md pb-32">
        {items.map((item: any) => (
          <Card key={item.id} className={`p-md border-white/5 transition-all ${results[item.id]?.valor ? 'bg-white/5' : 'bg-accent/5 border-accent/10'}`}>
            <div className="space-y-md">
              <div className="flex justify-between gap-md">
                 <p className="font-semibold text-sm leading-tight">{item.texto}</p>
                 {item.criticidad === 'alta' && (
                   <div className="p-1 px-2 border border-danger/30 bg-danger/10 rounded text-[8px] font-bold text-danger flex items-center gap-1">
                      <ShieldAlert size={10} /> CRÍTICO
                   </div>
                 )}
              </div>

              <div className="flex gap-md">
                <button 
                  onClick={() => handleResult(item.id, 'ok')}
                  className={`flex-1 flex flex-col items-center justify-center p-md rounded-2xl border-2 transition-all gap-2 ${
                    results[item.id]?.valor === 'ok' 
                    ? 'bg-success/20 border-success text-success' 
                    : 'bg-white/5 border-transparent text-muted hover:border-white/10'
                  }`}
                >
                  <CheckCircle2 size={24} />
                  <span className="text-[10px] font-bold uppercase">Correcto</span>
                </button>
                <button 
                  onClick={() => handleResult(item.id, 'nok')}
                  className={`flex-1 flex flex-col items-center justify-center p-md rounded-2xl border-2 transition-all gap-2 ${
                    results[item.id]?.valor === 'nok' 
                    ? 'bg-danger/20 border-danger text-danger' 
                    : 'bg-white/5 border-transparent text-muted hover:border-white/10'
                  }`}
                >
                  <XCircle size={24} />
                  <span className="text-[10px] font-bold uppercase">Fallo</span>
                </button>
              </div>

              {results[item.id]?.valor === 'nok' && (
                <div className="space-y-sm animate-fade-in">
                  <div className="flex gap-sm">
                    <div className="flex-1 bg-white/5 rounded-xl border border-white/10 p-sm flex items-center gap-sm">
                       <MessageSquare size={16} className="text-muted" />
                       <input 
                         placeholder="Detalla el problema..." 
                         className="bg-transparent border-none text-white text-xs flex-1 focus:outline-none"
                         value={results[item.id]?.comentario || ''}
                         onChange={e => handleComment(item.id, e.target.value)}
                       />
                    </div>
                    <button className="p-sm bg-accent/10 rounded-xl border border-accent/20 text-accent">
                       <Camera size={18} />
                    </button>
                  </div>
                  <div className="p-2 border border-warning/20 bg-warning/5 rounded-lg flex items-start gap-2">
                     <AlertTriangle size={14} className="text-warning mt-0.5" />
                     <p className="text-[9px] text-warning/80">Se generará una incidencia automática al departamento correspondiente.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-lg bg-gradient-to-t from-background via-background/95 to-transparent border-t border-white/5 flex gap-md">
        {activeCategoryIdx > 0 && (
          <Button variant="ghost" onClick={() => setActiveCategoryIdx(prev => prev - 1)} disabled={isSubmitting}>
            <ChevronLeft size={18} /> Anterior
          </Button>
        )}
        
        {isLastCategory ? (
          <Button 
            className="flex-1 btn-xl shadow-xl shadow-accent/20" 
            disabled={!allItemsAnswered || isSubmitting}
            onClick={() => setShowSignatureModal(true)}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <>Finalizar Inspección <ClipboardCheck size={20} className="ml-2" /></>
            )}
          </Button>
        ) : (
          <Button 
            className="flex-1" 
            disabled={!allItemsAnswered}
            onClick={() => setActiveCategoryIdx(prev => prev + 1)}
          >
            Siguiente Categoría <ChevronRight size={18} />
          </Button>
        )}
      </div>
    </div>
  );
};
