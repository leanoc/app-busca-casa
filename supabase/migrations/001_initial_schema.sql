-- ============================================================
-- AppBuscaCasa — Migración inicial del esquema de base de datos
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ============================================
-- EXTENSIONES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsqueda full-text

-- ============================================
-- PERFILES (extiende auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'Usuario',
  avatar_url TEXT,
  role TEXT CHECK (role IN ('user_a', 'user_b')) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUENTES DE SCRAPING
-- ============================================
CREATE TABLE public.real_estate_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT CHECK (type IN ('portal', 'local_agency')) NOT NULL DEFAULT 'local_agency',
  connector_key TEXT NOT NULL DEFAULT 'generic',
  last_scraped_at TIMESTAMPTZ,
  scrape_status TEXT CHECK (scrape_status IN ('idle', 'running', 'success', 'error')) DEFAULT 'idle',
  scrape_error TEXT,
  properties_found INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROPIEDADES
-- ============================================
CREATE TABLE public.properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.real_estate_sources(id) ON DELETE SET NULL,

  -- Datos básicos
  title TEXT NOT NULL,
  description TEXT,
  original_url TEXT,
  external_id TEXT, -- ID del portal de origen (para deduplicación)

  -- Ubicación
  address TEXT,
  locality TEXT CHECK (locality IN ('La Plata', 'Berisso', 'Ensenada', 'Otra')) DEFAULT 'La Plata',
  neighborhood TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),

  -- Económico
  price_usd NUMERIC(12, 2),
  price_ars NUMERIC(14, 2),
  expenses_ars NUMERIC(12, 2),

  -- Características físicas
  surface_total_m2 NUMERIC(8, 2),
  surface_covered_m2 NUMERIC(8, 2),
  rooms INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  toilets INTEGER,
  garage BOOLEAN DEFAULT FALSE,
  amenities JSONB DEFAULT '[]'::jsonb,

  -- Media
  photos JSONB DEFAULT '[]'::jsonb, -- Array de URLs de imágenes
  thumbnail_url TEXT,

  -- Estado de seguimiento
  status TEXT CHECK (status IN ('tracking', 'visited', 'discarded')) DEFAULT 'tracking',

  -- Metadata
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_manual BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Índice de búsqueda full-text
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(address, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(neighborhood, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'C')
  ) STORED
);

-- Índices
CREATE INDEX idx_properties_locality ON public.properties(locality);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_price ON public.properties(price_usd);
CREATE INDEX idx_properties_search ON public.properties USING GIN(search_vector);
CREATE INDEX idx_properties_source ON public.properties(source_id);
CREATE UNIQUE INDEX idx_properties_dedup ON public.properties(source_id, external_id)
  WHERE external_id IS NOT NULL;

-- ============================================
-- FAVORITOS
-- ============================================
CREATE TABLE public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, user_id)
);

CREATE INDEX idx_favorites_property ON public.favorites(property_id);
CREATE INDEX idx_favorites_user ON public.favorites(user_id);

-- ============================================
-- CALIFICACIONES (Doble Ciego)
-- ============================================
CREATE TABLE public.ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- === SECCIÓN A: Ficha Técnica del Inmueble (peso: 40%) ===
  score_electrical INTEGER CHECK (score_electrical BETWEEN 1 AND 5),
  note_electrical TEXT,

  score_gas INTEGER CHECK (score_gas BETWEEN 1 AND 5),
  note_gas TEXT,

  score_plumbing INTEGER CHECK (score_plumbing BETWEEN 1 AND 5),
  note_plumbing TEXT,

  score_humidity INTEGER CHECK (score_humidity BETWEEN 1 AND 5),
  note_humidity TEXT,

  score_windows INTEGER CHECK (score_windows BETWEEN 1 AND 5),
  note_windows TEXT,

  score_layout INTEGER CHECK (score_layout BETWEEN 1 AND 5),
  note_layout TEXT,

  -- === SECCIÓN B: Ficha Inmobiliaria y de Entorno (peso: 35%) ===
  score_expenses INTEGER CHECK (score_expenses BETWEEN 1 AND 5),
  note_expenses TEXT,

  score_common_areas INTEGER CHECK (score_common_areas BETWEEN 1 AND 5),
  note_common_areas TEXT,

  score_neighborhood INTEGER CHECK (score_neighborhood BETWEEN 1 AND 5),
  note_neighborhood TEXT,

  score_appreciation INTEGER CHECK (score_appreciation BETWEEN 1 AND 5),
  note_appreciation TEXT,

  -- === SECCIÓN C: Ficha Legal y Financiera (peso: 25%) ===
  score_legal_title INTEGER CHECK (score_legal_title BETWEEN 1 AND 5),
  note_legal_title TEXT,

  score_blueprints INTEGER CHECK (score_blueprints BETWEEN 1 AND 5),
  note_blueprints TEXT,

  score_debts INTEGER CHECK (score_debts BETWEEN 1 AND 5),
  note_debts TEXT,

  -- === Score General ===
  overall_impression INTEGER CHECK (overall_impression BETWEEN 1 AND 5),
  general_notes TEXT,

  -- Score ponderado calculado (se actualiza automáticamente)
  weighted_score NUMERIC(4, 2),

  -- Estado del envío (NULL = borrador, NOT NULL = enviado y bloqueado)
  submitted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(property_id, user_id)
);

CREATE INDEX idx_ratings_property ON public.ratings(property_id);
CREATE INDEX idx_ratings_user ON public.ratings(user_id);
CREATE INDEX idx_ratings_submitted ON public.ratings(submitted_at) WHERE submitted_at IS NOT NULL;

-- ============================================
-- FUNCIÓN: Calcular score ponderado
-- Pesos: A=40%, B=35%, C=25%
-- ============================================
CREATE OR REPLACE FUNCTION calculate_weighted_score(r public.ratings)
RETURNS NUMERIC AS $$
DECLARE
  section_a NUMERIC;
  section_b NUMERIC;
  section_c NUMERIC;
  items_a INTEGER := 0;
  items_b INTEGER := 0;
  items_c INTEGER := 0;
  total_a NUMERIC := 0;
  total_b NUMERIC := 0;
  total_c NUMERIC := 0;
BEGIN
  -- Sección A
  IF r.score_electrical IS NOT NULL THEN total_a := total_a + r.score_electrical; items_a := items_a + 1; END IF;
  IF r.score_gas IS NOT NULL THEN total_a := total_a + r.score_gas; items_a := items_a + 1; END IF;
  IF r.score_plumbing IS NOT NULL THEN total_a := total_a + r.score_plumbing; items_a := items_a + 1; END IF;
  IF r.score_humidity IS NOT NULL THEN total_a := total_a + r.score_humidity; items_a := items_a + 1; END IF;
  IF r.score_windows IS NOT NULL THEN total_a := total_a + r.score_windows; items_a := items_a + 1; END IF;
  IF r.score_layout IS NOT NULL THEN total_a := total_a + r.score_layout; items_a := items_a + 1; END IF;

  -- Sección B
  IF r.score_expenses IS NOT NULL THEN total_b := total_b + r.score_expenses; items_b := items_b + 1; END IF;
  IF r.score_common_areas IS NOT NULL THEN total_b := total_b + r.score_common_areas; items_b := items_b + 1; END IF;
  IF r.score_neighborhood IS NOT NULL THEN total_b := total_b + r.score_neighborhood; items_b := items_b + 1; END IF;
  IF r.score_appreciation IS NOT NULL THEN total_b := total_b + r.score_appreciation; items_b := items_b + 1; END IF;

  -- Sección C
  IF r.score_legal_title IS NOT NULL THEN total_c := total_c + r.score_legal_title; items_c := items_c + 1; END IF;
  IF r.score_blueprints IS NOT NULL THEN total_c := total_c + r.score_blueprints; items_c := items_c + 1; END IF;
  IF r.score_debts IS NOT NULL THEN total_c := total_c + r.score_debts; items_c := items_c + 1; END IF;

  section_a := CASE WHEN items_a > 0 THEN (total_a / items_a) ELSE 0 END;
  section_b := CASE WHEN items_b > 0 THEN (total_b / items_b) ELSE 0 END;
  section_c := CASE WHEN items_c > 0 THEN (total_c / items_c) ELSE 0 END;

  RETURN ROUND(
    (section_a * 0.40 + section_b * 0.35 + section_c * 0.25),
    2
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para actualizar weighted_score automáticamente
CREATE OR REPLACE FUNCTION update_weighted_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.weighted_score := calculate_weighted_score(NEW);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ratings_weighted_score
BEFORE INSERT OR UPDATE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION update_weighted_score();

-- ============================================
-- FUNCIÓN: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sources_updated_at BEFORE UPDATE ON public.real_estate_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_ratings_updated_at BEFORE UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCIÓN: Crear perfil automático al registrarse
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user_a')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VISTA: Estado del Doble Ciego
-- ============================================
CREATE OR REPLACE VIEW public.rating_blind_status AS
SELECT
  p.id AS property_id,
  p.title,
  p.status AS property_status,
  p.locality,
  p.price_usd,
  -- Rating Usuario A (rol user_a)
  ra.id AS rating_a_id,
  ra.user_id AS user_a_id,
  ra.submitted_at IS NOT NULL AS user_a_submitted,
  ra.submitted_at AS user_a_submitted_at,
  -- Rating Usuario B (rol user_b)
  rb.id AS rating_b_id,
  rb.user_id AS user_b_id,
  rb.submitted_at IS NOT NULL AS user_b_submitted,
  rb.submitted_at AS user_b_submitted_at,
  -- Estado del doble ciego
  CASE
    WHEN ra.submitted_at IS NOT NULL AND rb.submitted_at IS NOT NULL THEN 'completed'
    WHEN ra.submitted_at IS NOT NULL OR rb.submitted_at IS NOT NULL  THEN 'partial'
    WHEN ra.id IS NOT NULL OR rb.id IS NOT NULL                      THEN 'draft'
    ELSE 'pending'
  END AS blind_status,
  -- Scores (solo visibles cuando AMBOS enviaron)
  CASE WHEN ra.submitted_at IS NOT NULL AND rb.submitted_at IS NOT NULL
    THEN ra.weighted_score ELSE NULL
  END AS score_a_weighted,
  CASE WHEN ra.submitted_at IS NOT NULL AND rb.submitted_at IS NOT NULL
    THEN rb.weighted_score ELSE NULL
  END AS score_b_weighted,
  CASE WHEN ra.submitted_at IS NOT NULL AND rb.submitted_at IS NOT NULL
    THEN ra.overall_impression ELSE NULL
  END AS impression_a,
  CASE WHEN ra.submitted_at IS NOT NULL AND rb.submitted_at IS NOT NULL
    THEN rb.overall_impression ELSE NULL
  END AS impression_b,
  -- Promedio final
  CASE WHEN ra.submitted_at IS NOT NULL AND rb.submitted_at IS NOT NULL
    THEN ROUND((COALESCE(ra.weighted_score,0) + COALESCE(rb.weighted_score,0)) / 2, 2)
    ELSE NULL
  END AS final_avg_score
FROM public.properties p
LEFT JOIN public.profiles prof_a ON prof_a.role = 'user_a'
LEFT JOIN public.profiles prof_b ON prof_b.role = 'user_b'
LEFT JOIN public.ratings ra ON ra.property_id = p.id AND ra.user_id = prof_a.id
LEFT JOIN public.ratings rb ON rb.property_id = p.id AND rb.user_id = prof_b.id;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_sources ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- PROPERTIES: Ambos usuarios tienen acceso total
CREATE POLICY "properties_select_all" ON public.properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "properties_insert" ON public.properties FOR INSERT TO authenticated WITH CHECK (auth.uid() = added_by);
CREATE POLICY "properties_update_all" ON public.properties FOR UPDATE TO authenticated USING (true);
CREATE POLICY "properties_delete_own" ON public.properties FOR DELETE TO authenticated USING (auth.uid() = added_by);

-- FAVORITES: Todos ven todos, cada uno gestiona los suyos
CREATE POLICY "favorites_select_all" ON public.favorites FOR SELECT TO authenticated USING (true);
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RATINGS: Política de Doble Ciego
-- Puedo ver: mi propia calificación SIEMPRE,
--            la del otro SÓLO si ambos ya enviamos
CREATE POLICY "ratings_select_blind" ON public.ratings FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    submitted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.ratings my_r
      WHERE my_r.property_id = ratings.property_id
        AND my_r.user_id = auth.uid()
        AND my_r.submitted_at IS NOT NULL
    )
  )
);
CREATE POLICY "ratings_insert_own" ON public.ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Solo puedo actualizar si NO fue enviado aún (submitted_at IS NULL)
CREATE POLICY "ratings_update_draft_only" ON public.ratings FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND submitted_at IS NULL)
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings_delete_draft" ON public.ratings FOR DELETE TO authenticated
USING (auth.uid() = user_id AND submitted_at IS NULL);

-- REAL_ESTATE_SOURCES
CREATE POLICY "sources_select_all" ON public.real_estate_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "sources_insert" ON public.real_estate_sources FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "sources_update_all" ON public.real_estate_sources FOR UPDATE TO authenticated USING (true);
CREATE POLICY "sources_delete_own" ON public.real_estate_sources FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ============================================
-- FUNCIÓN RPC: Toggle favorito (upsert/delete)
-- ============================================
CREATE OR REPLACE FUNCTION public.toggle_favorite(p_property_id UUID)
RETURNS JSONB AS $$
DECLARE
  existing_id UUID;
  result JSONB;
BEGIN
  SELECT id INTO existing_id
  FROM public.favorites
  WHERE property_id = p_property_id AND user_id = auth.uid();

  IF existing_id IS NOT NULL THEN
    DELETE FROM public.favorites WHERE id = existing_id;
    result := jsonb_build_object('action', 'removed', 'property_id', p_property_id);
  ELSE
    INSERT INTO public.favorites (property_id, user_id)
    VALUES (p_property_id, auth.uid());
    result := jsonb_build_object('action', 'added', 'property_id', p_property_id);
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN RPC: Enviar calificación (submit)
-- Una vez enviada, no se puede modificar
-- ============================================
CREATE OR REPLACE FUNCTION public.submit_rating(p_rating_id UUID)
RETURNS JSONB AS $$
DECLARE
  r public.ratings%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.ratings
  WHERE id = p_rating_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Rating no encontrado');
  END IF;

  IF r.submitted_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Ya fue enviado anteriormente');
  END IF;

  UPDATE public.ratings
  SET submitted_at = NOW()
  WHERE id = p_rating_id AND user_id = auth.uid();

  RETURN jsonb_build_object('success', true, 'submitted_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HABILITAR REALTIME en tablas clave
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
