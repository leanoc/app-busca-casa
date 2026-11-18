import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/favorites — Toggle favorito
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { property_id } = await request.json();
    if (!property_id) {
      return NextResponse.json({ error: "property_id requerido" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("toggle_favorite", {
      p_property_id: property_id,
    });

    if (error) throw error;

    return NextResponse.json({ result: data });
  } catch (error) {
    console.error("Error POST /api/favorites:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
