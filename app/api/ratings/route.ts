import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/ratings?property_id=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const propertyId = request.nextUrl.searchParams.get("property_id");
    if (!propertyId) {
      return NextResponse.json({ error: "property_id requerido" }, { status: 400 });
    }

    // La RLS garantiza que solo vemos lo permitido (doble ciego)
    const { data, error } = await supabase
      .from("ratings")
      .select("*")
      .eq("property_id", propertyId);

    if (error) throw error;

    // Obtener estado del doble ciego
    const { data: blindStatus } = await supabase
      .from("rating_blind_status")
      .select("*")
      .eq("property_id", propertyId)
      .single();

    return NextResponse.json({ ratings: data, blind_status: blindStatus });
  } catch (error) {
    console.error("Error GET /api/ratings:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/ratings — Crear o actualizar calificación (upsert)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { property_id, ...ratingData } = body;

    if (!property_id) {
      return NextResponse.json({ error: "property_id requerido" }, { status: 400 });
    }

    // No permitir modificar campos del sistema
    delete ratingData.id;
    delete ratingData.user_id;
    delete ratingData.submitted_at;
    delete ratingData.weighted_score;
    delete ratingData.created_at;
    delete ratingData.updated_at;

    const { data, error } = await supabase
      .from("ratings")
      .upsert(
        { ...ratingData, property_id, user_id: user.id },
        { onConflict: "property_id,user_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ rating: data });
  } catch (error) {
    console.error("Error POST /api/ratings:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/ratings/submit — Enviar calificación (lock doble ciego)
// Se maneja en route separado, ver app/api/ratings/submit/route.ts
