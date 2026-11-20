import { type ConnectorKey } from "@/types";
import { type BaseParser } from "./base-parser";
import { ZonaPropParser } from "./zonaprop";
import { ArgenPropParser, RemaxParser, GenericParser } from "./argenprop-remax";

// ============================================================
// REGISTRY DE CONECTORES
// Mapea connector_key → Parser + metadata
// ============================================================

export interface ConnectorInfo {
  key: ConnectorKey;
  name: string;
  type: "portal" | "local_agency";
  baseUrl: string;
  logo?: string;
}

export const CONNECTOR_REGISTRY: Record<ConnectorKey, ConnectorInfo> = {
  zonaprop: {
    key: "zonaprop",
    name: "ZonaProp",
    type: "portal",
    baseUrl: "https://www.zonaprop.com.ar",
  },
  argenprop: {
    key: "argenprop",
    name: "ArgenProp",
    type: "portal",
    baseUrl: "https://www.argenprop.com",
  },
  remax: {
    key: "remax",
    name: "Remax",
    type: "portal",
    baseUrl: "https://www.remax.com.ar",
  },
  aguirre: {
    key: "aguirre",
    name: "Aguirre Propiedades",
    type: "local_agency",
    baseUrl: "https://www.aguirrepropiedades.com.ar",
  },
  alquilarg: {
    key: "alquilarg",
    name: "Alquilarg",
    type: "local_agency",
    baseUrl: "https://www.alquilarg.com/",
  },
  kuligowski: {
    key: "kuligowski",
    name: "Kuligowski",
    type: "local_agency",
    baseUrl: "https://kuligowskipropiedades.com.ar/",
  },
  axion: {
    key: "axion",
    name: "Axion Propiedades",
    type: "local_agency",
    baseUrl: "https://www.axionpropiedades.com/",
  },
  erica_mijailovsky: {
    key: "erica_mijailovsky",
    name: "Erica Mijailovsky",
    type: "local_agency",
    baseUrl: "https://www.ericamijailovsky.com.ar",
  },
  ridella: {
    key: "ridella",
    name: "Ridella Propiedades",
    type: "local_agency",
    baseUrl: "https://www.ridellapropiedades.com.ar/",
  },
  sts_propiedades: {
    key: "sts_propiedades",
    name: "STS Propiedades",
    type: "local_agency",
    baseUrl: "https://www.stspropiedades.com.ar",
  },
  debona: {
    key: "debona",
    name: "Debona",
    type: "local_agency",
    baseUrl: "https://debonapropiedades.com.ar/",
  },
  generic: {
    key: "generic",
    name: "Sitio Genérico",
    type: "local_agency",
    baseUrl: "",
  },
};

// ============================================================
// FACTORY: Crear instancia de parser por connector_key
// ============================================================
export function createParser(connectorKey: ConnectorKey, customBaseUrl?: string): BaseParser {
  switch (connectorKey) {
    case "zonaprop":
      return new ZonaPropParser();
    case "argenprop":
      return new ArgenPropParser();
    case "remax":
      return new RemaxParser();

    // Inmobiliarias locales — usan parser genérico con su baseUrl
    case "aguirre":
      return new GenericParser("aguirre", "Aguirre Propiedades", CONNECTOR_REGISTRY.aguirre.baseUrl);
    case "alquilarg":
      return new GenericParser("alquilarg", "Alquilarg", CONNECTOR_REGISTRY.alquilarg.baseUrl);
    case "kuligowski":
      return new GenericParser("kuligowski", "Kuligowski", CONNECTOR_REGISTRY.kuligowski.baseUrl);
    case "axion":
      return new GenericParser("axion", "Axion", CONNECTOR_REGISTRY.axion.baseUrl);
    case "erica_mijailovsky":
      return new GenericParser("erica_mijailovsky", "Erica Mijailovsky", CONNECTOR_REGISTRY.erica_mijailovsky.baseUrl);
    case "ridella":
      return new GenericParser("ridella", "Ridella", CONNECTOR_REGISTRY.ridella.baseUrl);
    case "sts_propiedades":
      return new GenericParser("sts_propiedades", "STS Propiedades", CONNECTOR_REGISTRY.sts_propiedades.baseUrl);
    case "debona":
      return new GenericParser("debona", "Debona", CONNECTOR_REGISTRY.debona.baseUrl);

    default:
      return new GenericParser("generic", "Sitio Genérico", customBaseUrl || "");
  }
}

// ============================================================
// AUTO-DETECT: Detectar el conector apropiado desde la URL
// ============================================================
export function detectConnector(url: string): ConnectorKey {
  const lower = url.toLowerCase();
  if (lower.includes("zonaprop.com")) return "zonaprop";
  if (lower.includes("argenprop.com")) return "argenprop";
  if (lower.includes("remax.com")) return "remax";
  if (lower.includes("aguirreprop")) return "aguirre";
  if (lower.includes("alquilarg")) return "alquilarg";
  if (lower.includes("kuligowski")) return "kuligowski";
  if (lower.includes("axion")) return "axion";
  if (lower.includes("ericamijailovsky") || lower.includes("mijailovsky")) return "erica_mijailovsky";
  if (lower.includes("ridella")) return "ridella";
  if (lower.includes("stspropiedades") || lower.includes("sts")) return "sts_propiedades";
  if (lower.includes("debona")) return "debona";
  return "generic";
}
