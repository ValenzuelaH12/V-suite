-- MANTENIMIENTO PREVENTIVO AUTOMATIZADO (V6)
-- Restructuración centrada en Activos y Automatización

-- 1. Nuevos Enums y Tipos
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_frecuencia_mantenimiento') THEN
        CREATE TYPE tipo_frecuencia_mantenimiento AS ENUM ('tiempo', 'uso');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_orden_trabajo') THEN
        CREATE TYPE estado_orden_trabajo AS ENUM ('pendiente', 'en_curso', 'completada', 'cancelada');
    END IF;
END $$;

-- 2. Actualizar Tabla de Planes
-- Añadimos soporte para activos y gestión de fechas automáticas
ALTER TABLE public.mantenimiento_planes 
ADD COLUMN IF NOT EXISTS activo_id uuid REFERENCES public.activos(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS tipo_frecuencia tipo_frecuencia_mantenimiento DEFAULT 'tiempo',
ADD COLUMN IF NOT EXISTS intervalo_valor int DEFAULT 30,
ADD COLUMN IF NOT EXISTS fecha_inicio date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS ultima_ejecucion date,
ADD COLUMN IF NOT EXISTS proxima_ejecucion date,
ADD COLUMN IF NOT EXISTS descripcion text;

-- Migración de datos básica si existiera scope (opcional, aquí lo dejamos limpio para el nuevo modelo)
COMMENT ON COLUMN public.mantenimiento_planes.scope IS 'Depreciado en V6 en favor de activo_id';

-- 3. Actualizar Tabla de Tareas (Ahora Órdenes de Trabajo)
ALTER TABLE public.mantenimiento_tareas 
ADD COLUMN IF NOT EXISTS activo_id uuid REFERENCES public.activos(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS tipo_orden text DEFAULT 'preventiva' CHECK (tipo_orden IN ('preventiva', 'correctiva')),
ADD COLUMN IF NOT EXISTS fecha_limite date;

-- Actualizar constraint de estado para incluir 'en_curso'
ALTER TABLE public.mantenimiento_tareas 
DROP CONSTRAINT IF EXISTS mantenimiento_tareas_estado_check;

ALTER TABLE public.mantenimiento_tareas 
ADD CONSTRAINT mantenimiento_tareas_estado_check 
CHECK (estado IN ('pendiente', 'en_curso', 'completada', 'cancelada'));

-- 4. Notificaciones de Sistema (Básico)
CREATE TABLE IF NOT EXISTS public.mantenimiento_notificaciones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id uuid REFERENCES public.hoteles(id) ON DELETE CASCADE,
    mensaje text NOT NULL,
    leido boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.mantenimiento_notificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hotel access for notificaciones" ON public.mantenimiento_notificaciones 
FOR ALL USING (hotel_id IN (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()));

-- 5. Trigger para actualizar proxima_ejecucion (Opcional, pero mejor hacerlo en el cliente por flexibilidad de 'uso')
-- Lo dejaremos para que el cliente lo gestione al completar la tarea para máximo control de 'retrasos'.
