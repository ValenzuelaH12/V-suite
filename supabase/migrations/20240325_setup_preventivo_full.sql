-- INSTALACIÓN COMPLETA SISTEMA PREVENTIVO (V8) - CORREGIDO PARA MULTI-TENANT
-- Ejecuta este script si recibes el error "new row violates row-level security policy" o "relation does not exist"

-- 0. Habilitar extensión uuid-ossp si no está
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Plantillas
CREATE TABLE IF NOT EXISTS preventivo_plantillas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hoteles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  frecuencia TEXT NOT NULL CHECK (frecuencia IN ('diaria', 'semanal', 'mensual', 'trimestral', 'semestral', 'anual', 'evento', 'checkout')),
  tipo_objetivo TEXT NOT NULL CHECK (tipo_objetivo IN ('habitacion', 'zona', 'activo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categorías
CREATE TABLE IF NOT EXISTS preventivo_categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plantilla_id UUID NOT NULL REFERENCES preventivo_plantillas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ítems (Checklist)
CREATE TABLE IF NOT EXISTS preventivo_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id UUID NOT NULL REFERENCES preventivo_categorias(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  tipo_respuesta TEXT NOT NULL DEFAULT 'ok_nok' CHECK (tipo_respuesta IN ('ok_nok', 'si_no', 'numero', 'texto')),
  criticidad TEXT NOT NULL DEFAULT 'baja' CHECK (criticidad IN ('baja', 'media', 'alta')),
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Asignaciones Dinámicas
CREATE TABLE IF NOT EXISTS preventivo_asignaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plantilla_id UUID NOT NULL REFERENCES preventivo_plantillas(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hoteles(id) ON DELETE CASCADE,
  entidad_tipo TEXT NOT NULL CHECK (entidad_tipo IN ('habitacion', 'zona', 'activo', 'tipo_habitacion')),
  entidad_id UUID,
  entidad_valor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Revisiones (Instancias de Ejecución)
CREATE TABLE IF NOT EXISTS preventivo_revisiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plantilla_id UUID NOT NULL REFERENCES preventivo_plantillas(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hoteles(id) ON DELETE CASCADE,
  entidad_tipo TEXT NOT NULL,
  entidad_id UUID NOT NULL,
  ubicacion_nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completada', 'fallida')),
  ejecutado_por UUID REFERENCES perfiles(id),
  completado_el TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Resultados
CREATE TABLE IF NOT EXISTS preventivo_resultados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revision_id UUID NOT NULL REFERENCES preventivo_revisiones(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES preventivo_items(id) ON DELETE CASCADE,
  valor TEXT,
  comentario TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Habilitar RLS
ALTER TABLE preventivo_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivo_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivo_asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivo_revisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivo_resultados ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS (Multi-Tenant usando la función estándar del proyecto)
-- Eliminamos políticas anteriores
DROP POLICY IF EXISTS "Full access to preventive templates by hotel_id" ON preventivo_plantillas;
DROP POLICY IF EXISTS "Full access to preventive assignments by hotel_id" ON preventivo_asignaciones;
DROP POLICY IF EXISTS "Full access to preventive categories by template parent" ON preventivo_categorias;
DROP POLICY IF EXISTS "Full access to preventive items by category parent" ON preventivo_items;
DROP POLICY IF EXISTS "Full access to preventive revisions by hotel_id" ON preventivo_revisiones;
DROP POLICY IF EXISTS "Full access to preventive results by revision parent" ON preventivo_resultados;

-- Nuevas políticas usando public.get_user_hotel_id()
CREATE POLICY "Full access to preventive templates by hotel_id" ON preventivo_plantillas
  FOR ALL USING (hotel_id = public.get_user_hotel_id()) WITH CHECK (hotel_id = public.get_user_hotel_id());

CREATE POLICY "Full access to preventive assignments by hotel_id" ON preventivo_asignaciones
  FOR ALL USING (hotel_id = public.get_user_hotel_id()) WITH CHECK (hotel_id = public.get_user_hotel_id());

CREATE POLICY "Full access to preventive categories by template parent" ON preventivo_categorias
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM preventivo_plantillas p 
      WHERE p.id = plantilla_id 
      AND p.hotel_id = public.get_user_hotel_id()
    )
  );

CREATE POLICY "Full access to preventive items by category parent" ON preventivo_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM preventivo_categorias c
      JOIN preventivo_plantillas p ON c.plantilla_id = p.id
      WHERE c.id = categoria_id
      AND p.hotel_id = public.get_user_hotel_id()
    )
  );

CREATE POLICY "Full access to preventive revisions by hotel_id" ON preventivo_revisiones
  FOR ALL USING (hotel_id = public.get_user_hotel_id()) WITH CHECK (hotel_id = public.get_user_hotel_id());

CREATE POLICY "Full access to preventive results by revision parent" ON preventivo_resultados
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM preventivo_revisiones r
      WHERE r.id = revision_id
      AND r.hotel_id = public.get_user_hotel_id()
    )
  );
