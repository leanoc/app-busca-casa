// ============================================================
// Tipos TypeScript globales para AppBuscaCasa
// ============================================================

export type Locality = "La Plata" | "Berisso" | "Ensenada" | "Otra";
export type PropertyStatus = "tracking" | "visited" | "discarded";
export type SourceType = "portal" | "local_agency";
export type ScrapeStatus = "idle" | "running" | "success" | "error";
export type BlindStatus = "pending" | "draft" | "partial" | "completed";
export type UserRole = "user_a" | "user_b";

// ---- Perfiles ----
export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ---- Fuentes de Scraping ----
export interface RealEstateSource {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  connector_key: ConnectorKey;
  last_scraped_at: string | null;
  scrape_status: ScrapeStatus;
  scrape_error: string | null;
  properties_found: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ConnectorKey =
  | "zonaprop"
  | "argenprop"
  | "remax"
  | "aguirre"
  | "alquilarg"
  | "kuligowski"
  | "axion"
  | "erica_mijailovsky"
  | "ridella"
  | "sts_propiedades"
  | "debona"
  | "generic";

// ---- Propiedades ----
export interface Property {
  id: string;
  source_id: string | null;
  title: string;
  description: string | null;
  original_url: string | null;
  external_id: string | null;

  // Ubicación
  address: string | null;
  locality: Locality;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;

  // Económico
  price_usd: number | null;
  price_ars: number | null;
  expenses_ars: number | null;

  // Características
  surface_total_m2: number | null;
  surface_covered_m2: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  toilets: number | null;
  garage: boolean;
  amenities: string[];

  // Media
  photos: string[];
  thumbnail_url: string | null;

  // Estado
  status: PropertyStatus;

  // Metadata
  scraped_at: string;
  added_by: string | null;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
}

// Property con datos enriquecidos
export interface PropertyWithMeta extends Property {
  source?: RealEstateSource;
  favorites?: Favorite[];
  my_favorite?: boolean;
  partner_favorite?: boolean;
  blind_status?: BlindStatus;
  my_rating?: Rating;
  ratings_count?: number;
}

// ---- Favoritos ----
export interface Favorite {
  id: string;
  property_id: string;
  user_id: string;
  created_at: string;
}

// ---- Calificaciones ----
export interface Rating {
  id: string;
  property_id: string;
  user_id: string;

  // Sección A — Técnica
  score_electrical: number | null;
  note_electrical: string | null;
  score_gas: number | null;
  note_gas: string | null;
  score_plumbing: number | null;
  note_plumbing: string | null;
  score_humidity: number | null;
  note_humidity: string | null;
  score_windows: number | null;
  note_windows: string | null;
  score_layout: number | null;
  note_layout: string | null;

  // Sección B — Entorno
  score_expenses: number | null;
  note_expenses: string | null;
  score_common_areas: number | null;
  note_common_areas: string | null;
  score_neighborhood: number | null;
  note_neighborhood: string | null;
  score_appreciation: number | null;
  note_appreciation: string | null;

  // Sección C — Legal
  score_legal_title: number | null;
  note_legal_title: string | null;
  score_blueprints: number | null;
  note_blueprints: string | null;
  score_debts: number | null;
  note_debts: string | null;

  // General
  overall_impression: number | null;
  general_notes: string | null;
  weighted_score: number | null;
  submitted_at: string | null;

  created_at: string;
  updated_at: string;
}

// Vista de estado doble ciego
export interface RatingBlindStatus {
  property_id: string;
  title: string;
  property_status: PropertyStatus;
  locality: Locality;
  price_usd: number | null;
  rating_a_id: string | null;
  user_a_id: string | null;
  user_a_submitted: boolean;
  user_a_submitted_at: string | null;
  rating_b_id: string | null;
  user_b_id: string | null;
  user_b_submitted: boolean;
  user_b_submitted_at: string | null;
  blind_status: BlindStatus;
  score_a_weighted: number | null;
  score_b_weighted: number | null;
  impression_a: number | null;
  impression_b: number | null;
  final_avg_score: number | null;
}

// ---- Filtros ----
export interface PropertyFilters {
  locality?: Locality[];
  status?: PropertyStatus[];
  price_min?: number;
  price_max?: number;
  surface_min?: number;
  rooms_min?: number;
  search?: string;
  source_id?: string;
  favorites_only?: boolean;
}

// ---- Scraper ----
export interface ScrapedProperty {
  title: string;
  description?: string;
  original_url?: string;
  external_id?: string;
  address?: string;
  locality?: Locality;
  neighborhood?: string;
  price_usd?: number;
  price_ars?: number;
  expenses_ars?: number;
  surface_total_m2?: number;
  surface_covered_m2?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  garage?: boolean;
  photos?: string[];
  thumbnail_url?: string;
  amenities?: string[];
}

export interface ScrapeResult {
  source_id: string;
  properties: ScrapedProperty[];
  total_found: number;
  errors: string[];
  duration_ms: number;
}

// ---- UI State ----
export interface NotificationItem {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
