-- Tabla de Registros de Auditoría para V-Suite
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
    user_nombre text,
    hotel_id uuid REFERENCES public.hoteles(id) ON DELETE CASCADE,
    accion text NOT NULL, -- 'CREACION', 'ACTUALIZACION', 'ELIMINACION', 'LOGIN', 'CAMBIO_ESTADO'
    entidad text NOT NULL, -- 'USUARIO', 'HOTEL', 'INCIDENCIA', 'ZONA', 'ACTIVO', 'SUMINISTRO'
    descripcion text NOT NULL,
    detalles jsonb DEFAULT '{}'::jsonb,
    ip_address text
);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden ver los logs
CREATE POLICY "Solo admins pueden ver logs" 
ON public.audit_logs FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles 
        WHERE id = auth.uid() 
        AND (rol = 'admin' OR rol = 'direccion' OR rol = 'super_admin')
    )
);

-- Todos los usuarios autenticados pueden insertar logs (para que el sistema registre acciones)
CREATE POLICY "Cualquier autenticado puede crear logs" 
ON public.audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);
