import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check, X, PenTool } from 'lucide-react';
import { Button } from './Button';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel: () => void;
  title?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel, title = "Firma del Técnico" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuración del trazo
    ctx.strokeStyle = '#6366f1'; // Color Accent
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Ajustar tamaño del canvas al contenedor
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      // Al redimensionar se borra, así que configuramos de nuevo el estilo
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
    setHasSigned(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  const handleSave = () => {
    if (!hasSigned) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="modal-overlay z-[3000] flex items-center justify-center p-md bg-black/60 backdrop-blur-sm">
      <div className="v-glass-card max-w-lg w-full overflow-hidden animate-fade-in border border-white/20 shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
          <div className="flex items-center gap-xs">
            <PenTool className="text-accent" size={16} />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-white/10 rounded-full text-muted transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-lg bg-black/40">
          <p className="text-[10px] text-muted uppercase tracking-widest mb-md italic">
            Firme dentro del recuadro para validar la inspección
          </p>
          
          <div className="relative border-2 border-dashed border-white/10 rounded-2xl bg-black/60 overflow-hidden touch-none h-[250px] group">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full cursor-crosshair"
            />
            {!hasSigned && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
                <p className="text-xl font-black uppercase tracking-widest">RÚBRICA AQUÍ</p>
              </div>
            )}
          </div>

          <div className="flex gap-md mt-lg">
            <Button variant="ghost" onClick={clear} className="flex-1 flex items-center justify-center gap-2 border-white/5 hover:bg-rose-500/10 hover:text-rose-500">
              <Eraser size={18} />
              <span>Limpiar</span>
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasSigned}
              className="flex-1 flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
            >
              <Check size={18} />
              <span>Validar Firma</span>
            </Button>
          </div>
        </div>
        
        <div className="p-md bg-black/60 border-t border-white/5 text-center">
          <p className="text-[8px] text-muted/60 uppercase tracking-widest leading-relaxed">
            Esta firma quedará vinculada legalmente al informe de inspección nº {Math.floor(Math.random() * 90000) + 10000} <br/>
            con marca de tiempo y coordenadas de red.
          </p>
        </div>
      </div>
    </div>
  );
};
