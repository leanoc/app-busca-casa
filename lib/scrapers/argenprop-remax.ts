import * as cheerio from "cheerio";
import { BaseParser, type ParseResult } from "./base-parser";
import { type ScrapedProperty } from "@/types";

// ============================================================
// PARSER: ArgenProp
// ============================================================
export class ArgenPropParser extends BaseParser {
  constructor() {
    super({ connectorKey: "argenprop", name: "ArgenProp", baseUrl: "https://www.argenprop.com" });
  }

  async parse(catalogUrl: string): Promise<ParseResult> {
    const result: ParseResult = { properties: [], totalFound: 0, errors: [], pagesProcessed: 0 };

    try {
      let currentUrl = catalogUrl;
      let page = 1;
      const MAX_PAGES = 10;

      while (currentUrl && page <= MAX_PAGES) {
        const html = await this.fetchHtml(currentUrl);
        const $ = cheerio.load(html);
        result.pagesProcessed++;

        if (page === 1) {
          const totalText = $(".listing__quantity-results").text();
          const match = totalText.match(/([\d.,]+)/);
          if (match) result.totalFound = this.parseNumber(match[1]) || 0;
        }

        const listings = $(".card");
        if (listings.length === 0) break;

        listings.each((_, el) => {
          try {
            const prop = this.parseListingCard($, $(el));
            if (prop) result.properties.push(prop);
          } catch (err) {
            result.errors.push(`Error card ArgenProp: ${err}`);
          }
        });

        // Paginación
        const nextLink = $(".pagination__page-next a").attr("href");
        currentUrl = nextLink ? this.absoluteUrl(nextLink, this.config.baseUrl!) : "";
        page++;
      }
    } catch (err) {
      result.errors.push(`Error general ArgenProp: ${err}`);
    }

    return result;
  }

  private parseListingCard($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): ScrapedProperty | null {
    const title = this.cleanText(el.find(".card__title").text());
    if (!title) return null;

    const linkEl = el.find("a.card__title-link").first();
    const relUrl = linkEl.attr("href") || el.find("a").first().attr("href") || "";
    const originalUrl = this.absoluteUrl(relUrl, this.config.baseUrl!);
    const externalId = relUrl.split("-").pop()?.replace(/\D/g, "");

    const priceText = el.find(".card__price").text();
    const isUSD = priceText.toLowerCase().includes("u$s") || priceText.toLowerCase().includes("usd");
    const priceUsd = isUSD ? this.extractUSD(priceText) || this.extractARS(priceText) : undefined;
    const priceArs = !isUSD ? this.extractARS(priceText) : undefined;
    const expensesText = el.find(".card__expensas").text();
    const expensesArs = this.extractARS(expensesText);

    const address = this.cleanText(el.find(".card__address").text());
    const locality = this.normalizeLocality(address + " " + title);

    let surfaceTotal: number | undefined;
    let rooms: number | undefined;
    let bedrooms: number | undefined;
    let bathrooms: number | undefined;

    el.find(".card__common-data li").each((_, feat) => {
      const text = $(feat).text().toLowerCase();
      if (text.includes("m²") || text.includes("m2")) surfaceTotal = this.extractSurface(text);
      else if (text.includes("amb")) rooms = parseInt(text) || undefined;
      else if (text.includes("dorm")) bedrooms = parseInt(text) || undefined;
      else if (text.includes("baño")) bathrooms = parseInt(text) || undefined;
    });

    const photos: string[] = [];
    el.find("img").each((_, img) => {
      const src = $(img).attr("src") || $(img).attr("data-src") || "";
      if (src && src.startsWith("http") && !src.includes("placeholder")) photos.push(src);
    });

    return {
      title,
      original_url: originalUrl,
      external_id: externalId,
      address,
      locality,
      price_usd: priceUsd,
      price_ars: priceArs,
      expenses_ars: expensesArs,
      surface_total_m2: surfaceTotal,
      rooms,
      bedrooms,
      bathrooms,
      photos,
      thumbnail_url: photos[0],
    };
  }

  async parseDetail(url: string): Promise<Partial<ScrapedProperty>> {
    const html = await this.fetchHtml(url);
    const $ = cheerio.load(html);
    const description = this.cleanText($(".description__text").text());
    const amenities: string[] = [];
    $(".property-features li").each((_, el) => {
      amenities.push(this.cleanText($(el).text()));
    });
    return { description, amenities };
  }
}

// ============================================================
// PARSER: Remax (usa API interna JSON)
// ============================================================
interface RemaxApiResponse {
  listings: RemaxListing[];
  totalCount: number;
}

interface RemaxListing {
  id: string;
  title: string;
  publicTitle: string;
  location?: { address?: string; city?: string; state?: string };
  price?: { amount?: number; currency?: string };
  expenses?: { amount?: number };
  features?: { totalSurface?: number; coveredSurface?: number; rooms?: number; bedrooms?: number; bathrooms?: number };
  media?: Array<{ url?: string }>;
  slug?: string;
}

export class RemaxParser extends BaseParser {
  private readonly API_BASE = "https://www.remax.com.ar/api/listings";

  constructor() {
    super({ connectorKey: "remax", name: "Remax", baseUrl: "https://www.remax.com.ar" });
  }

  async parse(catalogUrl: string): Promise<ParseResult> {
    const result: ParseResult = { properties: [], totalFound: 0, errors: [], pagesProcessed: 0 };

    try {
      // Extraer parámetros de búsqueda de la URL de catálogo
      const urlObj = new URL(catalogUrl);
      const pageSize = 20;
      let page = 1;
      const MAX_PAGES = 10;

      while (page <= MAX_PAGES) {
        // Intentar API interna primero, caer a HTML si falla
        const apiUrl = `${this.API_BASE}?page=${page}&pageSize=${pageSize}&operationType=2&locationIds=&businessType=1`;

        let data: RemaxApiResponse;
        try {
          data = await this.fetchJson<RemaxApiResponse>(apiUrl, {
            headers: { Referer: catalogUrl },
          });
        } catch {
          // Fallback a HTML scraping
          const html = await this.fetchHtml(catalogUrl);
          const props = this.parseHtmlFallback(html, catalogUrl);
          result.properties.push(...props);
          result.totalFound = props.length;
          break;
        }

        result.pagesProcessed++;
        if (page === 1) result.totalFound = data.totalCount || 0;

        const listings = data.listings || [];
        if (listings.length === 0) break;

        for (const listing of listings) {
          try {
            result.properties.push(this.mapListing(listing));
          } catch (err) {
            result.errors.push(`Error mapeando Remax listing: ${err}`);
          }
        }

        if (result.properties.length >= result.totalFound || listings.length < pageSize) break;
        page++;
      }
    } catch (err) {
      result.errors.push(`Error general Remax: ${err}`);
    }

    return result;
  }

  private mapListing(listing: RemaxListing): ScrapedProperty {
    const address = [listing.location?.address, listing.location?.city].filter(Boolean).join(", ");
    const locality = this.normalizeLocality(
      `${listing.location?.city || ""} ${listing.location?.state || ""}`
    );
    const currency = listing.price?.currency?.toUpperCase() || "USD";
    const price = listing.price?.amount || undefined;
    const photos = (listing.media || [])
      .map((m) => m.url)
      .filter((u): u is string => !!u);

    return {
      title: listing.publicTitle || listing.title,
      original_url: listing.slug ? `${this.config.baseUrl}/propiedades/${listing.slug}` : undefined,
      external_id: listing.id,
      address,
      locality,
      price_usd: currency === "USD" ? price : undefined,
      price_ars: currency === "ARS" ? price : undefined,
      expenses_ars: listing.expenses?.amount,
      surface_total_m2: listing.features?.totalSurface,
      surface_covered_m2: listing.features?.coveredSurface,
      rooms: listing.features?.rooms,
      bedrooms: listing.features?.bedrooms,
      bathrooms: listing.features?.bathrooms,
      photos,
      thumbnail_url: photos[0],
    };
  }

  private parseHtmlFallback(html: string, baseUrl: string): ScrapedProperty[] {
    const cheerio = require("cheerio");
    const $ = cheerio.load(html);
    const props: ScrapedProperty[] = [];

    $(".listing-card, .property-card, article").each((_: number, el: any) => {
      const title = this.cleanText($(el).find("h2, h3, .title").first().text());
      if (!title) return;
      const link = $(el).find("a").first().attr("href") || "";
      props.push({
        title,
        original_url: this.absoluteUrl(link, baseUrl),
        locality: "La Plata",
      });
    });

    return props;
  }

  async parseDetail(url: string): Promise<Partial<ScrapedProperty>> {
    const html = await this.fetchHtml(url);
    const cheerio = require("cheerio");
    const $ = cheerio.load(html);
    const description = this.cleanText($(".description, .property-description").text());
    return { description };
  }
}

// ============================================================
// PARSER GENÉRICO: Para inmobiliarias locales (Cheerio)
// ============================================================
export class GenericParser extends BaseParser {
  constructor(connectorKey: string, name: string, baseUrl: string) {
    super({ connectorKey: connectorKey as never, name, baseUrl });
  }

  async parse(catalogUrl: string): Promise<ParseResult> {
    const result: ParseResult = { properties: [], totalFound: 0, errors: [], pagesProcessed: 0 };

    try {
      const html = await this.fetchHtml(catalogUrl);
      const $ = cheerio.load(html);
      result.pagesProcessed = 1;

      // 1. Detección específica para sitios basados en plantillas inmobiliarias (ej: Kuligowski, Erica Mijailovsky)
      let listings: cheerio.Cheerio<any> = $("#results .property, .results .property, #results article");

      // 2. Si no encontró, buscar por selectores genéricos evitando elementos que contengan a toda la lista
      if (listings.length === 0) {
        const selectors = [
          "div.property",
          "article.property",
          "div.propiedad",
          "article.propiedad",
          "div.listing-card",
          "div.card-propiedad",
          "article",
          ".property",
          ".propiedad",
          ".listing",
        ];

        for (const sel of selectors) {
          const found = $(sel).filter((_, el) => $(el).find(sel).length === 0);
          if (found.length >= 2) {
            listings = found;
            break;
          }
        }
      }

      listings.each((_, el) => {
        try {
          const $el = $(el);
          const linkEl = $el.find("a[href*='/inmueble/']").first().length 
            ? $el.find("a[href*='/inmueble/']").first() 
            : $el.find("a[href]").first();
            
          const relUrl = linkEl.attr("href") || "";
          if (!relUrl || relUrl.startsWith("mailto:") || relUrl.startsWith("tel:") || relUrl.includes("quienes-somos") || relUrl.includes("contacto")) {
            return;
          }

          const originalUrl = this.absoluteUrl(relUrl, catalogUrl);
          const externalId = relUrl.split("/").filter(Boolean).pop() || originalUrl;

          // Extraer título real
          let title = this.cleanText(
            $el.find("h1, h2, h3, h4, .title, .titulo, [class*='title'], [class*='titulo']").first().text()
          );
          
          const allText = $el.text();
          const priceUsd = this.extractUSD(allText);
          const priceArs = !priceUsd ? this.extractARS(allText) : undefined;
          const surfaceTotal = this.extractSurface(allText);

          // Si el título es solo "Casa" o "Departamento", intentar enriquecerlo con la dirección o subtítulo
          const address = this.cleanText(
            $el.find('[class*="address"], [class*="location"], [class*="direcci"], address, figure, aside').first().text()
          );

          if (title.length < 5 && address) {
            title = `${title} - ${address.slice(0, 40)}`;
          } else if (!title) {
            title = address ? address.slice(0, 50) : "Propiedad";
          }

          const photos: string[] = [];
          $el.find("img").each((_, img) => {
            const src = $(img).attr("src") || $(img).attr("data-src") || $(img).attr("data-lazy") || "";
            if (src && src.startsWith("http") && !src.includes("placeholder") && !src.includes("logo")) {
              photos.push(src);
            }
          });

          result.properties.push({
            external_id: externalId,
            title,
            original_url: originalUrl,
            address: address || undefined,
            locality: this.normalizeLocality(address + " " + title),
            price_usd: priceUsd,
            price_ars: priceArs,
            surface_total_m2: surfaceTotal,
            photos,
            thumbnail_url: photos[0],
          });
        } catch (err) {
          result.errors.push(`Error en card genérico: ${err}`);
        }
      });

      result.totalFound = result.properties.length;
    } catch (err) {
      result.errors.push(`Error general parser genérico (${this.config.name}): ${err}`);
    }

    return result;
  }

  async parseDetail(_url: string): Promise<Partial<ScrapedProperty>> {
    return {};
  }
}
