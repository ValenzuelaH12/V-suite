-- FIX RLS INCIDENCIAS & MULTI-TENANCY
-- Este script habilita la eliminación y asegura el aislamiento por hotel.

-- 1. Asegurar columna hotel_id
ALTER TABLE public.incidencias ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hoteles(id);

-- 2. Limpiar políticas antiguas y redundantes
DROP POLICY IF EXISTS "Todas las incidencias visibles" ON public.incidencias;
DROP POLICY IF EXISTS "Cualquier usuario puede insertar" ON public.incidencias;
DROP POLICY IF EXISTS "Cualquier usuario puede actualizar" ON public.incidencias;
DROP POLICY IF EXISTS "Usuarios pueden borrar sus incidencias" ON public.incidencias;

-- 3. Crear nuevas políticas con aislamiento estricto

-- SELECT: Ver solo incidencias de su hotel (o Super Admin ve todo)
CREATE POLICY "Incidencias visibles por hotel" 
ON public.incidencias FOR SELECT TO authenticated 
USING (
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
);

-- INSERT: Insertar solo en su propio hotel
CREATE POLICY "Insertar incidencias en su hotel" 
ON public.incidencias FOR INSERT TO authenticated 
WITH CHECK (
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
);

-- UPDATE: Actualizar solo incidencias de su hotel
CREATE POLICY "Actualizar incidencias de su hotel" 
ON public.incidencias FOR UPDATE TO authenticated 
USING (
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
);

-- DELETE: ELIMINACIÓN HABILITADA (Aislamiento por hotel + Super Admin)
CREATE POLICY "Eliminar incidencias de su hotel" 
ON public.incidencias FOR DELETE TO authenticated 
USING (
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
);
