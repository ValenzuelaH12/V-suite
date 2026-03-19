-- REPARACIÓN DE RLS PARA EL SISTEMA DE MANTENIMIENTO
-- Incluye soporte para super_admin y filtrado por hotel_id

-- 1. MANTENIMIENTO PREVENTIVO
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver mantenimiento" ON public.mantenimiento_preventivo;
DROP POLICY IF EXISTS "Solo mantenimiento y admins pueden gestionar tareas" ON public.mantenimiento_preventivo;
DROP POLICY IF EXISTS "Mantenimiento preventivo: select" ON public.mantenimiento_preventivo;
DROP POLICY IF EXISTS "Mantenimiento preventivo: all" ON public.mantenimiento_preventivo;

CREATE POLICY "Mantenimiento preventivo: select" ON public.mantenimiento_preventivo
FOR SELECT TO authenticated USING (
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
);

CREATE POLICY "Mantenimiento preventivo: all" ON public.mantenimiento_preventivo
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND (rol IN ('admin', 'direccion', 'mantenimiento', 'super_admin')))
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND (rol IN ('admin', 'direccion', 'mantenimiento', 'super_admin')))
);

-- 2. HISTORIAL DE MANTENIMIENTO
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver historial" ON public.historial_mantenimiento;
DROP POLICY IF EXISTS "Mantenimiento y admins pueden insertar historial" ON public.historial_mantenimiento;
DROP POLICY IF EXISTS "Historial mantenimiento: select" ON public.historial_mantenimiento;
DROP POLICY IF EXISTS "Historial mantenimiento: insert" ON public.historial_mantenimiento;

CREATE POLICY "Historial mantenimiento: select" ON public.historial_mantenimiento
FOR SELECT TO authenticated USING (
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
);

CREATE POLICY "Historial mantenimiento: insert" ON public.historial_mantenimiento
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND (rol IN ('admin', 'direccion', 'mantenimiento', 'super_admin')))
);

-- 3. EJECUCIÓN DETALLADA (EJECUCION Y ENTIDADES)
ALTER TABLE public.mantenimiento_ejecucion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mantenimiento_entidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mantenimiento ejecucion: all" ON public.mantenimiento_ejecucion;
CREATE POLICY "Mantenimiento ejecucion: all" ON public.mantenimiento_ejecucion
FOR ALL TO authenticated USING (
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
) WITH CHECK (
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
);

DROP POLICY IF EXISTS "Mantenimiento entidades: all" ON public.mantenimiento_entidades;
CREATE POLICY "Mantenimiento entidades: all" ON public.mantenimiento_entidades
FOR ALL TO authenticated USING (
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
) WITH CHECK (
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
);

-- 4. ELEMENTOS DE MANTENIMIENTO
DROP POLICY IF EXISTS "Mantenimiento elementos: all" ON public.elementos_mantenimiento;
CREATE POLICY "Mantenimiento elementos: all" ON public.elementos_mantenimiento
FOR ALL TO authenticated USING (
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
) WITH CHECK (
    hotel_id = (SELECT hotel_id FROM public.perfiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'super_admin')
);
