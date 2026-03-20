-- 1. LIMPIEZA TOTAL DE SISTEMAS PREVIOS
DROP TABLE IF EXISTS mantenimiento_notificaciones CASCADE;
DROP TABLE IF EXISTS mantenimiento_items_log CASCADE;
DROP TABLE IF EXISTS mantenimiento_tareas CASCADE;
DROP TABLE IF EXISTS mantenimiento_planes CASCADE;
DROP TABLE IF EXISTS mantenimiento_filtros CASCADE;
DROP TABLE IF EXISTS preventivo_inspecciones CASCADE;
DROP TABLE IF EXISTS preventivo_detalles CASCADE;

-- 2. TIPOS Y ENUMS
DO $$ BEGIN
    CREATE TYPE public.mantenimiento_tipo_frecuencia AS ENUM ('tiempo', 'uso');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.mantenimiento_estado_tarea AS ENUM ('pendiente', 'en_curso', 'completada', 'cancelada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.mantenimiento_tipo_orden AS ENUM ('preventiva', 'correctiva', 'inspeccion');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABLA DE PLANES (MAESTROS)
CREATE TABLE public.mantenimiento_planes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL,
    activo_id UUID NOT NULL REFERENCES public.activos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo_frecuencia public.mantenimiento_tipo_frecuencia DEFAULT 'tiempo',
    intervalo_valor INTEGER DEFAULT 30,
    items_base JSONB DEFAULT '[]'::jsonb,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    ultima_ejecucion DATE,
    proxima_ejecucion DATE,
    activo BOOLEAN DEFAULT true,
    prioridad TEXT DEFAULT 'media',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABLA DE TAREAS / ÓRDENES DE TRABAJO
CREATE TABLE public.mantenimiento_tareas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL,
    plan_id UUID REFERENCES public.mantenimiento_planes(id) ON DELETE SET NULL,
    activo_id UUID NOT NULL REFERENCES public.activos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo_orden public.mantenimiento_tipo_orden DEFAULT 'preventiva',
    estado public.mantenimiento_estado_tarea DEFAULT 'pendiente',
    prioridad TEXT DEFAULT 'media',
    fecha_programada DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_finalizada TIMESTAMPTZ,
    usuario_id UUID REFERENCES auth.users(id),
    checklist_log JSONB DEFAULT '[]'::jsonb,
    observaciones_finales TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS (SEGURIDAD MULTI-TENANT)
ALTER TABLE public.mantenimiento_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mantenimiento_tareas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maintenance plans of their hotel"
    ON public.mantenimiento_planes FOR SELECT
    USING (hotel_id = public.get_user_hotel_id());

CREATE POLICY "Users can manage maintenance plans of their hotel"
    ON public.mantenimiento_planes FOR ALL
    USING (hotel_id = public.get_user_hotel_id());

CREATE POLICY "Users can view maintenance tasks of their hotel"
    ON public.mantenimiento_tareas FOR SELECT
    USING (hotel_id = public.get_user_hotel_id());

CREATE POLICY "Users can manage maintenance tasks of their hotel"
    ON public.mantenimiento_tareas FOR ALL
    USING (hotel_id = public.get_user_hotel_id());

-- 6. ÍNDICES PARA RENDIMIENTO
CREATE INDEX idx_mantenimiento_planes_hotel ON public.mantenimiento_planes(hotel_id);
CREATE INDEX idx_mantenimiento_tareas_hotel ON public.mantenimiento_tareas(hotel_id);
CREATE INDEX idx_mantenimiento_tareas_estado ON public.mantenimiento_tareas(estado);
CREATE INDEX idx_mantenimiento_planes_proxima ON public.mantenimiento_planes(proxima_ejecucion);
