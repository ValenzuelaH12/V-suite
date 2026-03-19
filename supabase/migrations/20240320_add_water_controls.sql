-- Migración: Tabla de Controles Técnico-Sanitarios del Agua
CREATE TABLE IF NOT EXISTS public.controles_agua (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    fecha timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    registrado_por uuid REFERENCES public.perfiles(id),
    punto_muestreo text NOT NULL, -- Ej: Piscina Principal, Spa, Depósito ACS, Agua de Red
    
    -- Parámetros Físico-Químicos
    cloro_libre numeric, -- mg/l
    cloro_total numeric, -- mg/l
    ph numeric,          -- 0-14
    turbidez numeric,    -- UNF
    temperatura numeric, -- °C
    bromo numeric,       -- mg/l (opcional)
    acido_isocianurico numeric, -- mg/l (opcional)
    
    notas text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.controles_agua ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (Multitenant)
DO $$ BEGIN
    CREATE POLICY "Usuarios pueden ver controles de su hotel" ON public.controles_agua
        FOR SELECT USING (
            hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
        );
        
    CREATE POLICY "Mantenimiento y admins pueden insertar controles" ON public.controles_agua
        FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'direccion', 'mantenimiento'))
        );

    CREATE POLICY "Solo admins pueden borrar controles" ON public.controles_agua
        FOR DELETE USING (
            EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'direccion'))
        );
EXCEPTION WHEN others THEN null; END $$;

-- Índice para búsquedas rápidas por hotel y fecha
CREATE INDEX IF NOT EXISTS idx_controles_agua_hotel_fecha ON public.controles_agua(hotel_id, fecha DESC);
