-- REFACTORIZACIÓN FINAL DE MANTENIMIENTO (V6)
-- Pivot de Plantillas a Categoría/Subcategoría Dinámica

-- 1. Asegurar columnas en mantenimiento_preventivo
ALTER TABLE public.mantenimiento_preventivo ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE public.mantenimiento_preventivo ADD COLUMN IF NOT EXISTS subcategoria text;

-- 2. Tabla de categorías (hotel-aware)
CREATE TABLE IF NOT EXISTS public.mantenimiento_categorias (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    subcategorias text[] DEFAULT '{}',
    hotel_id uuid REFERENCES public.hoteles(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLS para categorías
ALTER TABLE public.mantenimiento_categorias ENABLE ROW LEVEL SECURITY;

-- Política de lectura (incluye globales si hotel_id es null, o del propio hotel)
CREATE POLICY "Categorías visibles" ON public.mantenimiento_categorias
FOR SELECT TO authenticated 
USING (
    hotel_id IS NULL OR 
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
);

-- Política de gestión
CREATE POLICY "Gestión de categorías" ON public.mantenimiento_categorias
FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND (rol IN ('admin', 'super_admin', 'direccion', 'mantenimiento')))
);

-- 4. Datos por defecto (Solo si no existen)
INSERT INTO public.mantenimiento_categorias (nombre, subcategorias)
SELECT x.nombre, x.subcategorias
FROM (
  SELECT 'Zonas Comunes' as nombre, ARRAY['Recepción', 'Pasillos', 'Fachada', 'Piscina'] as subcategorias
  UNION ALL SELECT 'Habitaciones', ARRAY['Mobiliario', 'Baño', 'Climatización']
  UNION ALL SELECT 'Maquinaria', ARRAY['Filtros HVAC', 'Bombas', 'Ascensores']
) x
WHERE NOT EXISTS (SELECT 1 FROM public.mantenimiento_categorias WHERE nombre = x.nombre AND hotel_id IS NULL);
