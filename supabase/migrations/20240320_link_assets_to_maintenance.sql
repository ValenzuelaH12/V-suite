-- VINCULACIÓN DE ACTIVOS CON MANTENIMIENTO PREVENTIVO
-- Permite que las tareas programadas se dirijan a equipos específicos o categorías de activos.

-- 1. Añadir columnas a mantenimiento_preventivo
ALTER TABLE public.mantenimiento_preventivo 
ADD COLUMN IF NOT EXISTS activo_id uuid REFERENCES public.activos(id) ON DELETE SET NULL;

ALTER TABLE public.mantenimiento_preventivo 
ADD COLUMN IF NOT EXISTS entidad_objetivo text DEFAULT 'habitaciones' 
CHECK (entidad_objetivo IN ('habitaciones', 'activos_categoria', 'activo_individual'));

-- 2. Añadir columna de estado a activos si no existe (para trazabilidad de mantenimiento)
ALTER TABLE public.activos 
ADD COLUMN IF NOT EXISTS ultima_revision timestamp with time zone;

ALTER TABLE public.activos 
ADD COLUMN IF NOT EXISTS proxima_revision date;

-- 3. Actualizar comentarios
COMMENT ON COLUMN public.mantenimiento_preventivo.entidad_objetivo IS 'Define si la tarea es para habitaciones, una categoría de activos o un activo específico';
COMMENT ON COLUMN public.mantenimiento_preventivo.activo_id IS 'ID del activo vinculado (si aplica)';
