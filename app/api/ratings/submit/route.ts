import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/ratings/submit — Enviar definitivamente (doble ciego lock)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { rating_id } = await request.json();
    if (!rating_id) {
      return NextResponse.json({ error: "rating_id requerido" }, { status: 400 });
    }

    // Llamar a la función RPC que valida y hace el lock
    const { data, error } = await supabase.rpc("submit_rating", {
      p_rating_id: rating_id,
    });

    if (error) throw error;

    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error("Error POST /api/ratings/submit:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
