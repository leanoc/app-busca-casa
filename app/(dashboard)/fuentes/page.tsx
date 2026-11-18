import { createClient } from "@/lib/supabase/server";
import FuentesClient from "@/components/scraper/FuentesClient";

export const metadata = {
  title: "Fuentes y Scraping — AppBuscaCasa",
};

export default async function FuentesPage() {
  const supabase = await createClient();

  const { data: sources } = await supabase
    .from("real_estate_sources")
    .select("*")
    .order("created_at", { ascending: false });

  return <FuentesClient initialSources={sources || []} />;
}
