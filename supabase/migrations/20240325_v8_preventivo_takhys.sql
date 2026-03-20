-- TABLAS DEL SISTEMA PREVENTIVO AVANZADO (TIPO TAKHYS)

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
  entidad_id UUID, -- NULL si es por tipo_habitacion o "todas las zonas"
  entidad_valor TEXT, -- Para almacenar "todas", "tipo:Suite", etc.
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

-- Habilitar RLS
ALTER TABLE preventivo_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivo_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivo_asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivo_revisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivo_resultados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (Multi-Tenant)
CREATE POLICY "Users can view their hotel's preventive templates" ON preventivo_plantillas
  FOR SELECT USING (hotel_id = (auth.jwt() ->> 'hotel_id')::UUID);

CREATE POLICY "Users can view their hotel's preventive assignments" ON preventivo_asignaciones
  FOR SELECT USING (hotel_id = (auth.jwt() ->> 'hotel_id')::UUID);

CREATE POLICY "Users can view their hotel's preventive revisions" ON preventivo_revisiones
  FOR ALL USING (hotel_id = (auth.jwt() ->> 'hotel_id')::UUID);

CREATE POLICY "Users can view results of revisions from their hotel" ON preventivo_resultados
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM preventivo_revisiones 
      WHERE id = revision_id 
      AND hotel_id = (auth.jwt() ->> 'hotel_id')::UUID
    )
  );
