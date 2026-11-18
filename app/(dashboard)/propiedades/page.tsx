"use client";

import { type Property, type PropertyFilters, type Locality, type PropertyStatus } from "@/types";
import { useState, useEffect, useCallback } from "react";
import { formatUSD, formatSurface } from "@/lib/utils/formatters";
import PropertyCard from "@/components/properties/PropertyCard";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Building2,
  X,
  ChevronDown,
  Loader2,
} from "lucide-react";

const LOCALITIES: Locality[] = ["La Plata", "Berisso", "Ensenada"];
const STATUSES: { value: PropertyStatus; label: string }[] = [
  { value: "tracking", label: "En seguimiento" },
  { value: "visited", label: "Visitadas" },
  { value: "discarded", label: "Descartadas" },
];

export default function PropiedadesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PropertyFilters>({});

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.locality?.length) params.set("locality", filters.locality.join(","));
      if (filters.status?.length) params.set("status", filters.status.join(","));
      if (filters.price_min) params.set("price_min", String(filters.price_min));
      if (filters.price_max) params.set("price_max", String(filters.price_max));
      if (filters.surface_min) params.set("surface_min", String(filters.surface_min));
      if (filters.search) params.set("search", filters.search);
      params.set("page", String(page));
      params.set("limit", "24");

      const res = await fetch(`/api/properties?${params.toString()}`);
      const data = await res.json();
      setProperties(data.properties || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const toggleLocality = (loc: Locality) => {
    setFilters((prev) => {
      const current = prev.locality || [];
      const updated = current.includes(loc)
        ? current.filter((l) => l !== loc)
        : [...current, loc];
      return { ...prev, locality: updated.length ? updated : undefined };
    });
    setPage(1);
  };

  const toggleStatus = (status: PropertyStatus) => {
    setFilters((prev) => {
      const current = prev.status || [];
      const updated = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      return { ...prev, status: updated.length ? updated : undefined };
    });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const activeFiltersCount = [
    filters.locality?.length,
    filters.status?.length,
    filters.price_min,
    filters.price_max,
    filters.surface_min,
    filters.search,
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-enter">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Propiedades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total.toLocaleString("es-AR")} propiedades encontradas
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <button
            id="btn-toggle-filters"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              showFilters || activeFiltersCount > 0
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="glass-card p-5 animate-enter space-y-4">
          {/* Búsqueda */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Búsqueda
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Título, dirección, barrio…"
                value={filters.search || ""}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, search: e.target.value || undefined }));
                  setPage(1);
                }}
                className="w-full bg-input border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Localidad */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Localidad
              </label>
              <div className="flex flex-col gap-1.5">
                {LOCALITIES.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => toggleLocality(loc)}
                    className={`text-left text-sm px-3 py-1.5 rounded-lg border transition-all ${
                      filters.locality?.includes(loc)
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                Estado
              </label>
              <div className="flex flex-col gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => toggleStatus(s.value)}
                    className={`text-left text-sm px-3 py-1.5 rounded-lg border transition-all ${
                      filters.status?.includes(s.value)
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Precio USD */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                Precio USD
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Mín."
                  value={filters.price_min || ""}
                  onChange={(e) => setFilters((p) => ({ ...p, price_min: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                />
                <input
                  type="number"
                  placeholder="Máx."
                  value={filters.price_max || ""}
                  onChange={(e) => setFilters((p) => ({ ...p, price_max: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Superficie */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                Superficie mínima
              </label>
              <input
                type="number"
                placeholder="Ej: 60"
                value={filters.surface_min || ""}
                onChange={(e) => setFilters((p) => ({ ...p, surface_min: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">metros cuadrados</p>
            </div>
          </div>
        </div>
      )}

      {/* Grid de propiedades */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="glass-card p-16 text-center animate-enter">
          <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron propiedades</h3>
          <p className="text-muted-foreground text-sm">
            {activeFiltersCount > 0
              ? "Probá modificando los filtros de búsqueda."
              : "Iniciá un scraping desde la sección Fuentes."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {properties.map((prop, i) => (
              <PropertyCard key={prop.id} property={prop} index={i} />
            ))}
          </div>

          {/* Paginación */}
          {total > 24 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-secondary/50 border border-border text-sm disabled:opacity-40 hover:bg-secondary transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-muted-foreground px-3">
                Página {page} de {Math.ceil(total / 24)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 24)}
                className="px-4 py-2 rounded-lg bg-secondary/50 border border-border text-sm disabled:opacity-40 hover:bg-secondary transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PropertyCardSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="skeleton aspect-video w-full" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-5 w-1/3 rounded" />
      </div>
    </div>
  );
}
