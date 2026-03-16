-- REFACTORIZACIÓN FINAL DE MANTENIMIENTO (V4)
-- Pivot de Plantillas a Categoría/Subcategoría

-- 1. Añadir columnas de categorización a mantenimiento_preventivo
ALTER TABLE public.mantenimiento_preventivo ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE public.mantenimiento_preventivo ADD COLUMN IF NOT EXISTS subcategoria text;

-- 2. Limpieza de columnas obsoletas (Opcional, pero recomendado para pureza del modelo)
-- ALTER TABLE public.mantenimiento_preventivo DROP COLUMN IF EXISTS plantilla_id;

-- 3. Tabla para gestión de categorías de mantenimiento (opcional para control dinámico)
CREATE TABLE IF NOT EXISTS public.mantenimiento_categorias (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    hotel_id uuid REFERENCES public.hoteles(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. RLS para categorías
ALTER TABLE public.mantenimiento_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorías visibles por hotel" ON public.mantenimiento_categorias
FOR SELECT TO authenticated USING (hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin'));

CREATE POLICY "Gestión de categorías" ON public.mantenimiento_categorias
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND (rol IN ('admin', 'super_admin', 'direccion', 'mantenimiento'))));

-- 5. Datos iniciales sugeridos para categorías
-- INSERT INTO public.mantenimiento_categorias (nombre) VALUES ('Fontanería'), ('Electricidad'), ('HVAC'), ('Mobiliario'), ('Zonas Comunes');
