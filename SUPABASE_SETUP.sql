-- ============================================
-- SCALEXTRIC CATALOG - SUPABASE SETUP
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. TABLA PRINCIPAL
CREATE TABLE autos (
  id BIGINT PRIMARY KEY,
  fabricante TEXT,
  referencia TEXT,
  ed_especial TEXT,
  año TEXT,
  dorsal TEXT,
  marca TEXT,
  modelo TEXT,
  version TEXT,
  categoria TEXT,
  caja TEXT,
  clasificacion TEXT,
  foto_url TEXT,
  notas TEXT,
  tengo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ÍNDICES para búsqueda rápida
CREATE INDEX idx_autos_marca ON autos(marca);
CREATE INDEX idx_autos_fabricante ON autos(fabricante);
CREATE INDEX idx_autos_categoria ON autos(categoria);
CREATE INDEX idx_autos_tengo ON autos(tengo);
CREATE INDEX idx_autos_search ON autos USING gin(
  to_tsvector('spanish', coalesce(marca,'') || ' ' || coalesce(modelo,'') || ' ' || coalesce(version,'') || ' ' || coalesce(referencia,'') || ' ' || coalesce(fabricante,''))
);

-- 3. ROW LEVEL SECURITY (desactivado para uso personal)
ALTER TABLE autos DISABLE ROW LEVEL SECURITY;

-- 4. STORAGE para fotos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fotos-autos', 'fotos-autos', true)
ON CONFLICT DO NOTHING;

-- Policy para que cualquiera pueda subir/ver fotos
CREATE POLICY "Public Access" ON storage.objects
  FOR ALL USING (bucket_id = 'fotos-autos');

-- ============================================
-- NOTA: El seed de los 1203 autos se hace
-- desde la app con el script seed.js
-- ============================================
