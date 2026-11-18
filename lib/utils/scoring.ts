import { type Rating } from "@/types";

// Pesos de cada sección
const SECTION_WEIGHTS = {
  A: 0.4, // Técnica
  B: 0.35, // Entorno
  C: 0.25, // Legal
};

// Ítems de la Sección A con sus pesos relativos internos
export const SECTION_A_ITEMS = [
  {
    key: "score_electrical",
    noteKey: "note_electrical",
    label: "Instalación Eléctrica",
    description: "Tablero, térmicas/disyuntor, tomacorrientes",
    icon: "Zap",
    weight: 1,
  },
  {
    key: "score_gas",
    noteKey: "note_gas",
    label: "Gas y Calefacción",
    description: "Antigüedad de equipos, estado normativo",
    icon: "Flame",
    weight: 1,
  },
  {
    key: "score_plumbing",
    noteKey: "note_plumbing",
    label: "Plomería",
    description: "Presión de agua, grifería, materiales",
    icon: "Droplets",
    weight: 1,
  },
  {
    key: "score_humidity",
    noteKey: "note_humidity",
    label: "Humedades y Filtraciones",
    description: "Estado de techos, cimientos, placares",
    icon: "CloudRain",
    weight: 1.2,
  },
  {
    key: "score_windows",
    noteKey: "note_windows",
    label: "Aberturas y Aislamiento",
    description: "Estado de puertas/ventanas, aislamiento acústico/térmico",
    icon: "Square",
    weight: 1,
  },
  {
    key: "score_layout",
    noteKey: "note_layout",
    label: "Distribución y Luz Natural",
    description: "Orientación Norte/Este, ventilación cruzada",
    icon: "Sun",
    weight: 1,
  },
] as const;

// Ítems de la Sección B
export const SECTION_B_ITEMS = [
  {
    key: "score_expenses",
    noteKey: "note_expenses",
    label: "Expensas y Costos Fijos",
    description: "Verificación de expensas extraordinarias",
    icon: "DollarSign",
    weight: 1.5,
  },
  {
    key: "score_common_areas",
    noteKey: "note_common_areas",
    label: "Áreas Comunes y Edificio",
    description: "Ascensor, palier, terraza/amenities",
    icon: "Building2",
    weight: 0.8,
  },
  {
    key: "score_neighborhood",
    noteKey: "note_neighborhood",
    label: "Barrio y Conectividad",
    description: "Transporte, comercios, seguridad, ruido",
    icon: "MapPin",
    weight: 2,
  },
  {
    key: "score_appreciation",
    noteKey: "note_appreciation",
    label: "Potencial de Valorización",
    description: "Proyectos de zona, valor de reventa",
    icon: "TrendingUp",
    weight: 1.2,
  },
] as const;

// Ítems de la Sección C
export const SECTION_C_ITEMS = [
  {
    key: "score_legal_title",
    noteKey: "note_legal_title",
    label: "Situación de Dominio",
    description: "Escritura, gravámenes, embargos/inhibiciones",
    icon: "FileText",
    weight: 1.5,
  },
  {
    key: "score_blueprints",
    noteKey: "note_blueprints",
    label: "Planos y Subdivisiones",
    description: "Coincidencia planos vs. metros reales (PH/depto)",
    icon: "Layers",
    weight: 1,
  },
  {
    key: "score_debts",
    noteKey: "note_debts",
    label: "Deudas Impositivas",
    description: "ARBA, Municipal, servicios",
    icon: "AlertCircle",
    weight: 1,
  },
] as const;

// Calcular score ponderado del cliente
export function calculateWeightedScore(rating: Partial<Rating>): number {
  const scoreSection = (
    items: typeof SECTION_A_ITEMS | typeof SECTION_B_ITEMS | typeof SECTION_C_ITEMS
  ) => {
    let total = 0;
    let totalWeight = 0;
    for (const item of items) {
      const val = rating[item.key as keyof Rating] as number | null | undefined;
      if (val != null) {
        total += val * item.weight;
        totalWeight += item.weight;
      }
    }
    return totalWeight > 0 ? total / totalWeight : 0;
  };

  const sA = scoreSection(SECTION_A_ITEMS);
  const sB = scoreSection(SECTION_B_ITEMS);
  const sC = scoreSection(SECTION_C_ITEMS);

  return Math.round((sA * SECTION_WEIGHTS.A + sB * SECTION_WEIGHTS.B + sC * SECTION_WEIGHTS.C) * 100) / 100;
}

// Convertir score (1-5) a color visual
export function scoreToColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 4.5) return "text-emerald-400";
  if (score >= 3.5) return "text-green-400";
  if (score >= 2.5) return "text-yellow-400";
  if (score >= 1.5) return "text-orange-400";
  return "text-red-400";
}

// Convertir score a label
export function scoreToLabel(score: number | null): string {
  if (score === null) return "Sin calificar";
  if (score >= 4.5) return "Excelente";
  if (score >= 3.5) return "Muy bueno";
  if (score >= 2.5) return "Regular";
  if (score >= 1.5) return "Malo";
  return "Muy malo";
}

// Verificar si una calificación está completa (todos los campos obligatorios)
export function isRatingComplete(rating: Partial<Rating>): boolean {
  const allItems = [...SECTION_A_ITEMS, ...SECTION_B_ITEMS, ...SECTION_C_ITEMS];
  return allItems.every((item) => {
    const val = rating[item.key as keyof Rating];
    return val != null && (val as number) >= 1;
  });
}

// Porcentaje de completitud de la calificación
export function ratingCompletionPercent(rating: Partial<Rating>): number {
  const allItems = [...SECTION_A_ITEMS, ...SECTION_B_ITEMS, ...SECTION_C_ITEMS];
  const filled = allItems.filter((item) => {
    const val = rating[item.key as keyof Rating];
    return val != null && (val as number) >= 1;
  }).length;
  return Math.round((filled / allItems.length) * 100);
}
