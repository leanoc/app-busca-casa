import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { type PropertyFilters } from "@/types";

// GET /api/properties — Listar propiedades con filtros
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const filters: PropertyFilters = {
      locality: sp.get("locality")?.split(",") as PropertyFilters["locality"],
      status: sp.get("status")?.split(",") as PropertyFilters["status"],
      price_min: sp.get("price_min") ? Number(sp.get("price_min")) : undefined,
      price_max: sp.get("price_max") ? Number(sp.get("price_max")) : undefined,
      surface_min: sp.get("surface_min") ? Number(sp.get("surface_min")) : undefined,
      rooms_min: sp.get("rooms_min") ? Number(sp.get("rooms_min")) : undefined,
      search: sp.get("search") || undefined,
      source_id: sp.get("source_id") || undefined,
    };

    const page = parseInt(sp.get("page") || "1");
    const limit = parseInt(sp.get("limit") || "24");
    const offset = (page - 1) * limit;

    // Obtenemos el cliente admin para bypass de la política recursiva de ratings
    const adminSupabase = await createAdminClient();

    let query = adminSupabase
      .from("properties")
      .select(`
        *,
        source:real_estate_sources(id, name, connector_key),
        favorites(id, user_id),
        ratings!ratings_property_id_fkey(id, user_id, submitted_at, weighted_score, overall_impression)
      `, { count: "exact" });

    // Aplicar filtros
    if (filters.locality?.length) {
      query = query.in("locality", filters.locality);
    }
    if (filters.status?.length) {
      query = query.in("status", filters.status);
    }
    if (filters.price_min != null) {
      query = query.gte("price_usd", filters.price_min);
    }
    if (filters.price_max != null) {
      query = query.lte("price_usd", filters.price_max);
    }
    if (filters.surface_min != null) {
      query = query.gte("surface_total_m2", filters.surface_min);
    }
    if (filters.rooms_min != null) {
      query = query.gte("rooms", filters.rooms_min);
    }
    if (filters.source_id) {
      query = query.eq("source_id", filters.source_id);
    }
    if (filters.search) {
      query = query.textSearch("search_vector", filters.search, { type: "websearch" });
    }

    const { data, error, count } = await query
      .order("scraped_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Supabase error en GET /api/properties:", error);
      throw error;
    }

    return NextResponse.json({
      properties: data,
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error: any) {
    console.error("Error GET /api/properties:", error?.message || error);
    return NextResponse.json({ 
      error: error?.message || "Error interno al consultar propiedades",
      details: error
    }, { status: 500 });
  }
}

// PATCH /api/properties — Actualizar estado de propiedad
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: "id y status requeridos" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("properties")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ property: data });
  } catch (error) {
    console.error("Error PATCH /api/properties:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
