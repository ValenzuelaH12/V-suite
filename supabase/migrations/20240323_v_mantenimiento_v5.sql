-- ACTUALIZACIÓN MANTENIMIENTO PREVENTIVO (V5)
-- Añadiendo soporte para alcance jerárquico manual (Zonas > Espacios) dentro de cada plan.

-- 1. Asegurar que la tabla existe y añadir la columna scope
ALTER TABLE public.mantenimiento_planes ADD COLUMN IF NOT EXISTS scope jsonb DEFAULT '[]';

-- Comentario explicativo de la estructura del scope:
-- [
--   { "zona": "Planta 1", "espacios": ["Hab 101", "Hab 102", "Pasillo"] },
--   { "zona": "Sala Técnica", "espacios": ["Calderas", "Cuadros Eléctricos"] }
-- ]
COMMENT ON COLUMN public.mantenimiento_planes.scope IS 'Estructura jerárquica manual de ubicaciones donde aplica el plan.';

-- 2. Tareas (Para que soporten nombres de ubicación manual)
-- Si ya existía, nos aseguramos de que tenga las columnas necesarias
CREATE TABLE IF NOT EXISTS public.mantenimiento_tareas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id uuid REFERENCES public.hoteles(id) ON DELETE CASCADE,
    plan_id uuid REFERENCES public.mantenimiento_planes(id) ON DELETE CASCADE,
    
    -- Ubicación flexible:
    zona_nombre text,
    espacio_nombre text,
    habitacion_id uuid REFERENCES public.habitaciones(id) ON DELETE SET NULL, -- Opcional, por si se vincula a una real
    
    estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada', 'cancelada')),
    fecha_programada date NOT NULL,
    completada_en timestamptz,
    usuario_id uuid REFERENCES auth.users(id),
    comentarios text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.mantenimiento_tareas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hotel access for tareas_v5" ON public.mantenimiento_tareas;
CREATE POLICY "Hotel access for tareas_v5" ON public.mantenimiento_tareas 
FOR ALL USING (hotel_id IN (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()));

-- 3. Logs de Items
CREATE TABLE IF NOT EXISTS public.mantenimiento_items_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tarea_id uuid REFERENCES public.mantenimiento_tareas(id) ON DELETE CASCADE,
    nombre_item text NOT NULL,
    estado text DEFAULT 'ok', -- ok, aviso, grave
    observacion text,
    es_manual boolean DEFAULT false
);

ALTER TABLE public.mantenimiento_items_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Access for items_log_v5" ON public.mantenimiento_items_log;
CREATE POLICY "Access for items_log_v5" ON public.mantenimiento_items_log FOR ALL USING (
    tarea_id IN (SELECT id FROM public.mantenimiento_tareas WHERE hotel_id IN (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()))
);
