-- REFACTORIZACIÓN FINAL DE MANTENIMIENTO (V5)
-- Pivot de Plantillas a Categoría/Subcategoría

-- 1. Añadir columnas de categorización a mantenimiento_preventivo
ALTER TABLE public.mantenimiento_preventivo ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE public.mantenimiento_preventivo ADD COLUMN IF NOT EXISTS subcategoria text;

-- 2. Asegurar que tenemos la tabla de categorías para selección dinámica (opcional)
CREATE TABLE IF NOT EXISTS public.mantenimiento_categorias (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    subcategorias text[] DEFAULT '{}', -- Array de subcategorías vinculadas
    hotel_id uuid REFERENCES public.hoteles(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLS para categorías
ALTER TABLE public.mantenimiento_categorias ENABLE ROW LEVEL SECURITY;

-- 4. Insertar datos base para todos los hoteles (usando hotel_id null como plantilla global si se desea, 
-- pero aquí lo haremos simple: insertar para el hotel actual o dejarlo dinámico)
-- Para este ejercicio, insertaremos unas categorías base si la tabla está vacía.
INSERT INTO public.mantenimiento_categorias (nombre, subcategorias)
VALUES 
('Zonas Comunes', ARRAY['Recepción', 'Pasillos', 'Aseos Públicos', 'Fachada']),
('Habitaciones', ARRAY['Mobiliario', 'Camas', 'Baño', 'Mini-bar']),
('Maquinaria/Filtros', ARRAY['HVAC', 'Aire Acondicionado', 'Bombas de Agua', 'Filtros Piscina']),
('Electricidad', ARRAY['Iluminación', 'Cuadros Eléctricos', 'Generador']),
('Fontanería', ARRAY['Grifería', 'Tuberías', 'Desagües'])
ON CONFLICT DO NOTHING;
