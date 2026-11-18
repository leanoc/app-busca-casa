"use client";

import { useState } from "react";
import { type RealEstateSource } from "@/types";
import { CONNECTOR_REGISTRY, detectConnector } from "@/lib/scrapers";
import {
  Globe,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  Trash2,
  Building2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils/formatters";

interface FuentesClientProps {
  initialSources: RealEstateSource[];
}

export default function FuentesClient({ initialSources }: FuentesClientProps) {
  const [sources, setSources] = useState<RealEstateSource[]>(initialSources);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scrapingIds, setScrapingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const detectedConnector = url ? detectConnector(url) : null;
  const connectorInfo = detectedConnector ? CONNECTOR_REGISTRY[detectedConnector] : null;

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name: name || connectorInfo?.name || url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`Scraping iniciado para "${name || url}". Las propiedades aparecerán en minutos.`);
      setUrl("");
      setName("");
      setShowForm(false);

      // Agregar source con estado running
      setSources((prev) => [
        {
          id: data.source_id,
          name: name || connectorInfo?.name || url,
          url,
          type: connectorInfo?.type || "local_agency",
          connector_key: detectedConnector || "generic",
          scrape_status: "running",
          scrape_error: null,
          properties_found: 0,
          created_by: null,
          last_scraped_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      // Polling de estado
      pollStatus(data.source_id);
    } catch (err) {
      setError(`${err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const triggerScrape = async (sourceId: string, sourceUrl: string) => {
    setScrapingIds((prev) => new Set(prev).add(sourceId));
    try {
      await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: sourceId, url: sourceUrl }),
      });
      pollStatus(sourceId);
    } finally {
      // Estado se actualiza vía polling
    }
  };

  const pollStatus = (sourceId: string) => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/scraper?source_id=${sourceId}`);
      const data = await res.json();
      const src = data.source;

      if (src) {
        setSources((prev) =>
          prev.map((s) => (s.id === sourceId ? { ...s, ...src } : s))
        );

        if (src.scrape_status !== "running") {
          clearInterval(interval);
          setScrapingIds((prev) => {
            const next = new Set(prev);
            next.delete(sourceId);
            return next;
          });
        }
      }
    }, 3000);

    // Máximo 5 minutos de polling
    setTimeout(() => clearInterval(interval), 300000);
  };

  const statusConfig = {
    idle: { icon: <Clock className="w-3.5 h-3.5" />, label: "Inactivo", color: "text-muted-foreground" },
    running: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: "Scraping…", color: "text-blue-400" },
    success: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Completado", color: "text-emerald-400" },
    error: { icon: <XCircle className="w-3.5 h-3.5" />, label: "Error", color: "text-red-400" },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-enter">
        <div>
          <h1 className="text-2xl font-display font-bold">Fuentes y Scraping</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Importá propiedades desde portales y agencias
          </p>
        </div>
        <button
          id="btn-add-source"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-glow"
        >
          <Plus className="w-4 h-4" />
          Nueva fuente
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-enter">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-enter">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Formulario nueva fuente */}
      {showForm && (
        <div className="glass-card p-5 animate-enter">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Agregar nueva fuente de propiedades
          </h2>

          <form onSubmit={handleAddSource} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                URL del catálogo o listado
              </label>
              <input
                type="url"
                id="input-source-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.zonaprop.com.ar/casas-venta-la-plata.html"
                required
                className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
              />
              {/* Auto-detección */}
              {connectorInfo && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Conector detectado:{" "}
                  <span className="font-medium text-foreground">{connectorInfo.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px]">
                    {connectorInfo.type}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Nombre (opcional)
              </label>
              <input
                type="text"
                id="input-source-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={connectorInfo?.name || "Nombre de la fuente"}
                className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Info sobre limitaciones */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Algunos portales (ZonaProp, ArgenProp) pueden requerir usar el bookmarklet de
                apoyo si bloquean el scraping automático.
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                id="btn-submit-source"
                disabled={submitting || !url}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Iniciando…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Iniciar scraping
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Conectores disponibles */}
      <div className="glass-card p-5 animate-enter">
        <h2 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
          Conectores disponibles
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Object.values(CONNECTOR_REGISTRY)
            .filter((c) => c.key !== "generic")
            .map((connector) => (
              <a
                key={connector.key}
                href={connector.baseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors group"
              >
                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground truncate">{connector.name}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
        </div>
      </div>

      {/* Lista de fuentes */}
      <div className="space-y-3 animate-enter" style={{ animationDelay: "0.1s" }}>
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Fuentes configuradas ({sources.length})
        </h2>

        {sources.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Globe className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No hay fuentes configuradas. Agregá la primera URL arriba.
            </p>
          </div>
        ) : (
          sources.map((source) => {
            const isRunning = source.scrape_status === "running" || scrapingIds.has(source.id);
            const sconf = statusConfig[isRunning ? "running" : source.scrape_status];

            return (
              <div
                key={source.id}
                id={`source-${source.id}`}
                className="glass-card p-4 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-sm text-foreground">{source.name}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {source.connector_key}
                    </span>
                    <span className={`flex items-center gap-1 text-[10px] ${sconf.color}`}>
                      {sconf.icon} {sconf.label}
                    </span>
                  </div>

                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors truncate block mt-0.5"
                  >
                    {source.url}
                  </a>

                  <div className="flex items-center gap-4 mt-1.5">
                    {source.properties_found > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {source.properties_found} propiedades
                      </span>
                    )}
                    {source.last_scraped_at && (
                      <span className="text-xs text-muted-foreground">
                        Último: {formatRelativeDate(source.last_scraped_at)}
                      </span>
                    )}
                    {source.scrape_error && (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {source.scrape_error.slice(0, 60)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id={`btn-rescrape-${source.id}`}
                    onClick={() => triggerScrape(source.id, source.url)}
                    disabled={isRunning}
                    className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Volver a scrapear"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
