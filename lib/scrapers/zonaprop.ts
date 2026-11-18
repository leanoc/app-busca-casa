import * as cheerio from "cheerio";
import { BaseParser, type ParseResult } from "./base-parser";
import { type ScrapedProperty } from "@/types";

// ============================================================
// PARSER: ZonaProp
// ============================================================
export class ZonaPropParser extends BaseParser {
  constructor() {
    super({ connectorKey: "zonaprop", name: "ZonaProp", baseUrl: "https://www.zonaprop.com.ar" });
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

        // Extraer total si está disponible
        if (page === 1) {
          const totalText = $('[data-qa="results-quantity"]').text();
          const match = totalText.match(/([\d.,]+)/);
          if (match) result.totalFound = this.parseNumber(match[1]) || 0;
        }

        // Seleccionar cards de propiedades
        const listings = $('[data-qa="posting PROPERTY"]');
        if (listings.length === 0) break;

        listings.each((_, el) => {
          try {
            const prop = this.parseListingCard($, $(el));
            if (prop) result.properties.push(prop);
          } catch (err) {
            result.errors.push(`Error en listado ZonaProp: ${err}`);
          }
        });

        // Paginación
        const nextLink = $('[data-qa="btn next page"]').attr("href");
        currentUrl = nextLink ? this.absoluteUrl(nextLink, this.config.baseUrl!) : "";
        page++;
      }
    } catch (err) {
      result.errors.push(`Error general ZonaProp: ${err}`);
    }

    return result;
  }

  private parseListingCard($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): ScrapedProperty | null {
    const titleEl = el.find('[data-qa="POSTING_CARD_DESCRIPTION"]');
    const title = this.cleanText(titleEl.text());
    if (!title) return null;

    const linkEl = el.find("a[href]").first();
    const relUrl = linkEl.attr("href") || "";
    const originalUrl = this.absoluteUrl(relUrl, this.config.baseUrl!);
    const externalId = relUrl.match(/(\d+)\.html/)?.[1];

    // Precio
    const priceText = el.find('[data-qa="POSTING_CARD_PRICE"]').text();
    const priceUsd = priceText.toLowerCase().includes("usd") ? this.extractUSD(priceText) : undefined;
    const priceArs = !priceText.toLowerCase().includes("usd") ? this.extractARS(priceText) : undefined;

    // Expensas
    const expensesText = el.find('[data-qa="POSTING_CARD_EXPENSES"]').text();
    const expensesArs = this.extractARS(expensesText);

    // Características
    const features = el.find('[data-qa="POSTING_CARD_FEATURES"] span');
    let surfaceTotal: number | undefined;
    let rooms: number | undefined;
    let bedrooms: number | undefined;
    let bathrooms: number | undefined;

    features.each((_, feat) => {
      const text = $(feat).text().toLowerCase();
      if (text.includes("m²") || text.includes("m2")) {
        surfaceTotal = this.extractSurface(text);
      } else if (text.includes("amb")) {
        rooms = parseInt(text) || undefined;
      } else if (text.includes("dorm")) {
        bedrooms = parseInt(text) || undefined;
      } else if (text.includes("baño")) {
        bathrooms = parseInt(text) || undefined;
      }
    });

    // Dirección
    const address = this.cleanText(el.find('[data-qa="POSTING_CARD_LOCATION"]').text());

    // Localidad
    const locality = this.normalizeLocality(address + " " + title);

    // Fotos
    const photos: string[] = [];
    el.find("img[src]").each((_, img) => {
      const src = $(img).attr("src") || $(img).attr("data-src") || "";
      if (src && !src.includes("placeholder") && src.startsWith("http")) {
        photos.push(src);
      }
    });
    const thumbnail_url = photos[0];

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
      thumbnail_url,
    };
  }

  async parseDetail(url: string): Promise<Partial<ScrapedProperty>> {
    const html = await this.fetchHtml(url);
    const $ = cheerio.load(html);

    const description = this.cleanText($('[data-qa="POSTING_DESCRIPTION"] p').text());
    const amenities: string[] = [];
    $('[data-qa="POSTING_AMENITIES"] li').each((_, el) => {
      amenities.push(this.cleanText($(el).text()));
    });

    return { description, amenities };
  }
}
