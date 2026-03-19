-- MANTENIMIENTO PREVENTIVO JERÁRQUICO (Fase 1)

-- 1. Actualizar Activos con Estados
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_activo') THEN
        CREATE TYPE estado_activo AS ENUM ('bueno', 'regular', 'malo', 'mantenimiento', 'fuera_servicio');
    END IF;
END $$;

ALTER TABLE public.activos 
ADD COLUMN IF NOT EXISTS estado estado_activo DEFAULT 'bueno',
ADD COLUMN IF NOT EXISTS ultima_inspeccion timestamptz,
ADD COLUMN IF NOT EXISTS proxima_inspeccion timestamptz;

-- 2. Tabla de Control de Filtros de Aire
CREATE TABLE IF NOT EXISTS public.mantenimiento_filtros (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id uuid REFERENCES public.hoteles(id) ON DELETE CASCADE,
    habitacion_id uuid REFERENCES public.habitaciones(id) ON DELETE CASCADE,
    ultima_limpieza timestamptz,
    proxima_limpieza timestamptz,
    frecuencia_dias int DEFAULT 90, -- Por defecto cada 3 meses
    notas text,
    actualizado_en timestamptz DEFAULT now()
);

-- 3. Historial de Inspecciones Preventivas
CREATE TABLE IF NOT EXISTS public.preventivo_inspecciones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id uuid REFERENCES public.hoteles(id) ON DELETE CASCADE,
    habitacion_id uuid REFERENCES public.habitaciones(id) ON DELETE CASCADE,
    usuario_id uuid REFERENCES auth.users(id),
    fecha_inspeccion timestamptz DEFAULT now(),
    comentarios text,
    puntuacion_general int -- 1 a 10 o similar si se requiere
);

CREATE TABLE IF NOT EXISTS public.preventivo_detalles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    inspeccion_id uuid REFERENCES public.preventivo_inspecciones(id) ON DELETE CASCADE,
    activo_id uuid REFERENCES public.activos(id) ON DELETE CASCADE,
    estado_visto estado_activo NOT NULL,
    observacion text
);

-- RLS
ALTER TABLE public.mantenimiento_filtros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventivo_inspecciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventivo_detalles ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Hotel access for filtros" ON public.mantenimiento_filtros FOR ALL USING (hotel_id IN (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()));
CREATE POLICY "Hotel access for inspecciones" ON public.preventivo_inspecciones FOR ALL USING (hotel_id IN (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()));
CREATE POLICY "Access for details" ON public.preventivo_detalles FOR ALL USING (
    inspeccion_id IN (SELECT id FROM public.preventivo_inspecciones WHERE hotel_id IN (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()))
);
