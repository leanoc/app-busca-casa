import { type ScrapedProperty, type Locality, type ConnectorKey } from "@/types";

// ============================================================
// BASE PARSER — Clase abstracta para todos los conectores
// ============================================================

export interface ParserConfig {
  connectorKey: ConnectorKey;
  name: string;
  baseUrl?: string;
  userAgent?: string;
  delayMs?: number;
}

export interface ParseResult {
  properties: ScrapedProperty[];
  totalFound: number;
  errors: string[];
  pagesProcessed: number;
}

export abstract class BaseParser {
  protected config: ParserConfig;
  protected defaultUserAgent: string;

  constructor(config: ParserConfig) {
    this.config = config;
    this.defaultUserAgent =
      process.env.SCRAPER_USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  }

  /**
   * Punto de entrada principal: recibe la URL del catálogo y devuelve propiedades
   */
  abstract parse(catalogUrl: string): Promise<ParseResult>;

  /**
   * Parsear una propiedad individual desde su URL de detalle
   */
  abstract parseDetail(url: string): Promise<Partial<ScrapedProperty>>;

  /**
   * Fetch con headers de navegador para evitar bloqueos básicos
   */
  protected async fetchHtml(url: string, options?: RequestInit): Promise<string> {
    const delayMs = this.config.delayMs ?? parseInt(process.env.SCRAPER_DELAY_MS || "1500");
    await this.delay(delayMs);

    const response = await fetch(url, {
      headers: {
        "User-Agent": this.config.userAgent || this.defaultUserAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al acceder a ${url}`);
    }

    return response.text();
  }

  /**
   * Fetch con retorno JSON (para APIs internas)
   */
  protected async fetchJson<T = unknown>(url: string, options?: RequestInit): Promise<T> {
    const delayMs = this.config.delayMs ?? parseInt(process.env.SCRAPER_DELAY_MS || "1500");
    await this.delay(delayMs);

    const response = await fetch(url, {
      headers: {
        "User-Agent": this.config.userAgent || this.defaultUserAgent,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al acceder a ${url}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Normalizar localidad desde texto libre
   */
  protected normalizeLocality(text: string): Locality {
    const lower = text.toLowerCase();
    if (lower.includes("berisso")) return "Berisso";
    if (lower.includes("ensenada")) return "Ensenada";
    if (lower.includes("la plata") || lower.includes("plata")) return "La Plata";
    return "Otra";
  }

  /**
   * Extraer precio USD de un texto
   */
  protected extractUSD(text: string): number | undefined {
    const match = text.match(/u(?:s)?d?\s*\$?\s*([\d.,]+)/i);
    if (!match) return undefined;
    return this.parseNumber(match[1]);
  }

  /**
   * Extraer precio ARS de un texto
   */
  protected extractARS(text: string): number | undefined {
    const match = text.match(/\$\s*([\d.,]+)/);
    if (!match) return undefined;
    return this.parseNumber(match[1]);
  }

  /**
   * Parsear número con formato argentino (. como miles, , como decimal)
   */
  protected parseNumber(text: string): number | undefined {
    const cleaned = text.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Extraer superficie en m² de un texto
   */
  protected extractSurface(text: string): number | undefined {
    const match = text.match(/([\d.,]+)\s*m[²2]/i);
    if (!match) return undefined;
    return this.parseNumber(match[1]);
  }

  /**
   * Esperar N milisegundos
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Limpiar texto HTML
   */
  protected cleanText(text: string | null | undefined): string {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }

  /**
   * Construir URL absoluta desde relativa
   */
  protected absoluteUrl(path: string, base: string): string {
    if (path.startsWith("http")) return path;
    try {
      return new URL(path, base).toString();
    } catch {
      return path;
    }
  }
}
