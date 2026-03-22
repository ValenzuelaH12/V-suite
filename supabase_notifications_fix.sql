-- ==========================================
-- CREACIÓN DE TABLA DE NOTIFICACIONES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.notificaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'system', -- 'incident' | 'chat' | 'maintenance' | 'system'
    link TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
DROP POLICY IF EXISTS "Usuarios ven sus propias notificaciones" ON public.notificaciones;
CREATE POLICY "Usuarios ven sus propias notificaciones" ON public.notificaciones
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sistema/Admins insertan notificaciones" ON public.notificaciones;
CREATE POLICY "Sistema/Admins insertan notificaciones" ON public.notificaciones
    FOR INSERT WITH CHECK (true); -- Permitir inserts para que el service layer funcione

DROP POLICY IF EXISTS "Usuarios marcan como leídas sus notificaciones" ON public.notificaciones;
CREATE POLICY "Usuarios marcan como leídas sus notificaciones" ON public.notificaciones
    FOR UPDATE USING (auth.uid() = user_id);

-- Habilitar Realtime para esta tabla
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
