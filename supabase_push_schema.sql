-- Tabla para almacenar las suscripciones Push de los usuarios
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    device_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver y gestionar sus propias suscripciones
CREATE POLICY "Usuarios pueden gestionar sus propias suscripciones"
    ON push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id);

-- Índice para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
