import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (data: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
        setHasPermission(true);
        startDetectionLoop();
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setHasPermission(false);
      setError('No se pudo acceder a la cámara. Por favor, asegúrese de dar permisos.');
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startDetectionLoop = () => {
    // Verificamos si el BarcodeDetector nativo está disponible
    // @ts-ignore
    if ('BarcodeDetector' in window) {
      // @ts-ignore
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      
      const loop = async () => {
        if (!isScanning || !videoRef.current) return;
        
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const result = barcodes[0].rawValue;
            handleScanResult(result);
            return;
          }
        } catch (e) {
          console.warn('Detección fallida temporalmente', e);
        }
        
        requestAnimationFrame(loop);
      };
      
      loop();
    } else {
      // Fallback: Informar que el navegador no soporta detección nativa sin librería
      setError('Su navegador no soporta el escaneo nativo de QR. Por favor, asegúrese de usar Chrome o Edge actualizado.');
    }
  };

  const handleScanResult = (result: string) => {
    setIsScanning(false);
    stopCamera();
    
    // El resultado suele ser una URL o un ID
    // Ejemplo: http://hotelops.pro/asset/123 -> extraemos el 123
    console.log('QR detectado:', result);
    
    if (onScanSuccess) {
      onScanSuccess(result);
    } else {
      // Lógica por defecto: si es un asset, navegamos a él
      if (result.includes('asset/')) {
        const id = result.split('asset/').pop();
        navigate(`/asset/${id}`);
      } else if (result.length > 5) {
        // Asumimos que es un ID de activo directo
        navigate(`/asset/${result}`);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay z-[2000] flex items-center justify-center p-md">
      <div className="v-glass-card max-w-md w-full overflow-hidden animate-fade-in relative border border-white/20">
        <div className="p-4 flex justify-between items-center border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-xs">
            <Sparkles className="text-accent" size={16} />
            <h2 className="text-sm font-black uppercase tracking-widest text-white">V-Scan QR</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-muted hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="relative aspect-square bg-black overflow-hidden group">
          {isScanning ? (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              {/* Scan Line Animation */}
              <div className="absolute left-0 right-0 h-1 bg-accent/80 shadow-[0_0_15px_rgba(var(--color-accent),1)] z-10 animate-scan" />
              
              {/* Corner Accents */}
              <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-accent rounded-tl-xl opacity-80" />
              <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-accent rounded-tr-xl opacity-80" />
              <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-accent rounded-bl-xl opacity-80" />
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-accent rounded-br-xl opacity-80" />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-md text-muted p-xl text-center">
              {error ? (
                <>
                  <AlertCircle size={48} className="text-rose-500 mb-sm" />
                  <p className="text-xs uppercase font-bold tracking-widest text-rose-500">{error}</p>
                </>
              ) : (
                <>
                  <RefreshCw size={32} className="animate-spin text-accent" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Iniciando Ópticas V-Suite...</p>
                </>
              )}
              <button 
                onClick={startCamera} 
                className="btn btn-secondary btn-sm mt-md"
              >
                Reintentar Cámara
              </button>
            </div>
          )}
        </div>

        <div className="p-xl bg-black/40 text-center">
          <div className="flex items-center justify-center gap-2 mb-md text-accent">
            <Camera size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Enfoque el código QR del activo</span>
          </div>
          <p className="text-[9px] text-muted leading-relaxed uppercase tracking-widest opacity-60">
            Escanee etiquetas de maquinaria o habitaciones para acceder <br/> al historial técnico y mantenimiento preventivo.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0.1; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 100%; opacity: 0.1; }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  );
};
