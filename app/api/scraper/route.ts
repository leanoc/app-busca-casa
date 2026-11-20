import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createParser, detectConnector } from "@/lib/scrapers";
import { type ScrapedProperty } from "@/types";

// POST /api/scraper — Inicia el scraping de una fuente
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { source_id, url, name } = body as { source_id?: string; url: string; name?: string };

    if (!url) {
      return NextResponse.json({ error: "URL requerida" }, { status: 400 });
    }

    // Detectar o crear fuente
    let sourceId = source_id;
    if (!sourceId) {
      const connectorKey = detectConnector(url);
      const { data: newSource, error: sourceError } = await supabase
        .from("real_estate_sources")
        .insert({
          name: name || url,
          url,
          type: ["zonaprop", "argenprop", "remax"].includes(connectorKey) ? "portal" : "local_agency",
          connector_key: connectorKey,
          created_by: user.id,
        })
        .select()
        .single();

      if (sourceError || !newSource) throw sourceError || new Error("No se pudo crear la fuente");
      sourceId = newSource.id;
    }

    if (!sourceId) {
      return NextResponse.json({ error: "No se pudo identificar la fuente" }, { status: 500 });
    }

    // Marcar como "running"
    await supabase
      .from("real_estate_sources")
      .update({ scrape_status: "running", scrape_error: null })
      .eq("id", sourceId);

    // Ejecutar scraping en background (no esperamos el resultado completo)
    // Para producción, esto debería ser un queue job (Supabase Edge Functions)
    runScrapeJob(supabase, sourceId, url, user.id).catch(console.error);

    return NextResponse.json({
      success: true,
      source_id: sourceId,
      message: "Scraping iniciado",
    });
  } catch (error) {
    console.error("Error en POST /api/scraper:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// GET /api/scraper?source_id=xxx — Estado del scraping
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sourceId = request.nextUrl.searchParams.get("source_id");
    if (!sourceId) {
      return NextResponse.json({ error: "source_id requerido" }, { status: 400 });
    }

    const { data: source, error } = await supabase
      .from("real_estate_sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (error) throw error;

    return NextResponse.json({ source });
  } catch (error) {
    console.error("Error en GET /api/scraper:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/scraper?id=xxx — Eliminar fuente y sus propiedades asociadas
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID de fuente requerido" }, { status: 400 });
    }

    // 1. Eliminar propiedades asociadas a esta fuente
    await supabase.from("properties").delete().eq("source_id", id);

    // 2. Eliminar la fuente
    const { error: deleteError } = await supabase
      .from("real_estate_sources")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: "Fuente y propiedades eliminadas" });
  } catch (error) {
    console.error("Error en DELETE /api/scraper:", error);
    return NextResponse.json({ error: "Error al eliminar la fuente" }, { status: 500 });
  }
}

// ---- Job de scraping (async) ----
async function runScrapeJob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  sourceId: string,
  url: string,
  userId: string
) {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const { data: source } = await supabase
      .from("real_estate_sources")
      .select("connector_key")
      .eq("id", sourceId)
      .single();

    const connectorKey = source?.connector_key || detectConnector(url);
    const parser = createParser(connectorKey, url);
    const result = await parser.parse(url);

    errors.push(...result.errors);

    // Insertar propiedades en lote
    const propsToInsert = result.properties.map((prop: ScrapedProperty) => ({
      ...prop,
      source_id: sourceId,
      added_by: userId,
      scraped_at: new Date().toISOString(),
      amenities: prop.amenities || [],
      photos: prop.photos || [],
    }));

    // Insertar en chunks de 50
    let insertedCount = 0;
    for (let i = 0; i < propsToInsert.length; i += 50) {
      const chunk = propsToInsert.slice(i, i + 50);
      const { error: insertError } = await supabase
        .from("properties")
        .upsert(chunk, {
          onConflict: "source_id,external_id",
          ignoreDuplicates: false,
        });

      if (insertError) {
        errors.push(`Error insertando chunk ${i}: ${insertError.message}`);
      } else {
        insertedCount += chunk.length;
      }
    }

    // Actualizar estado de la fuente
    await supabase
      .from("real_estate_sources")
      .update({
        scrape_status: errors.length > 0 ? "error" : "success",
        scrape_error: errors.length > 0 ? errors.slice(0, 3).join("; ") : null,
        properties_found: result.totalFound || insertedCount,
        last_scraped_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    console.log(
      `Scraping completado: ${insertedCount} propiedades en ${Date.now() - startTime}ms`
    );
  } catch (err) {
    await supabase
      .from("real_estate_sources")
      .update({
        scrape_status: "error",
        scrape_error: `${err}`,
      })
      .eq("id", sourceId);

    console.error("Error en runScrapeJob:", err);
  }
}
