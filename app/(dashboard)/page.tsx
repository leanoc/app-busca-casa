import { createClient } from "@/lib/supabase/server";
import {
  Building2,
  Heart,
  Search,
  Star,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle2,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { formatUSD, formatRelativeDate } from "@/lib/utils/formatters";

export const metadata = {
  title: "Dashboard — AppBuscaCasa",
};

async function getDashboardStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [
    { count: totalProps },
    { count: visitedProps },
    { count: trackedProps },
    { data: recentProps },
    { data: blindStatuses },
  ] = await Promise.all([
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("status", "visited"),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("status", "tracking"),
    supabase.from("properties").select("id, title, price_usd, locality, status, scraped_at, thumbnail_url").order("scraped_at", { ascending: false }).limit(50),
    supabase.from("rating_blind_status").select("*").eq("blind_status", "completed").limit(10),
  ]);

  return {
    totalProps: totalProps || 0,
    visitedProps: visitedProps || 0,
    trackedProps: trackedProps || 0,
    recentProps: recentProps || [],
    completedRatings: blindStatuses || [],
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  const stats = await getDashboardStats(supabase);

  const greeting = new Date().getHours() < 12 ? "Buenos días" : new Date().getHours() < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="animate-enter">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          {greeting},{" "}
          <span className="gradient-text">{profile?.display_name?.split(" ")[0] || "Usuario"}</span> 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Resumen de tu búsqueda de propiedades en La Plata, Berisso y Ensenada
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-enter" style={{ animationDelay: "0.05s" }}>
        <StatCard
          icon={<Building2 className="w-5 h-5 text-blue-400" />}
          label="Total propiedades"
          value={stats.totalProps}
          bg="from-blue-500/10 to-blue-600/5"
          border="border-blue-500/20"
        />
        <StatCard
          icon={<Search className="w-5 h-5 text-amber-400" />}
          label="En seguimiento"
          value={stats.trackedProps}
          bg="from-amber-500/10 to-amber-600/5"
          border="border-amber-500/20"
        />
        <StatCard
          icon={<Eye className="w-5 h-5 text-emerald-400" />}
          label="Visitadas"
          value={stats.visitedProps}
          bg="from-emerald-500/10 to-emerald-600/5"
          border="border-emerald-500/20"
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-gold-400" />}
          label="Calificadas (ambos)"
          value={stats.completedRatings.length}
          bg="from-yellow-500/10 to-yellow-600/5"
          border="border-yellow-500/20"
        />
      </div>

      {/* Two columns */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Propiedades recientes */}
        <div className="glass-card p-5 animate-enter" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Propiedades recientes
            </h2>
            <Link href="/propiedades" className="text-xs text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {stats.recentProps.length === 0 ? (
              <EmptyState message="Aún no hay propiedades. ¡Iniciá un scraping!" />
            ) : (
              stats.recentProps.map((prop) => (
                <Link key={prop.id} href={`/propiedades/${prop.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/40 transition-colors group cursor-pointer">
                    {prop.thumbnail_url ? (
                      <img
                        src={prop.thumbnail_url}
                        alt={prop.title}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 bg-muted"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {prop.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{prop.locality}
                        </span>
                        {prop.price_usd && (
                          <span className="text-xs font-medium text-emerald-400">
                            {formatUSD(prop.price_usd)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`status-badge text-[10px] ${prop.status === "tracking" ? "status-tracking" : prop.status === "visited" ? "status-visited" : "status-discarded"}`}>
                      {prop.status === "tracking" ? "Seguimiento" : prop.status === "visited" ? "Visitada" : "Descartada"}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Calificaciones doble ciego */}
        <div className="glass-card p-5 animate-enter" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              Calificaciones completadas
            </h2>
            <Link href="/comparar" className="text-xs text-primary hover:underline">
              Ver comparativa
            </Link>
          </div>
          <div className="space-y-2">
            {stats.completedRatings.length === 0 ? (
              <EmptyState message="Aún no hay calificaciones duales completadas." />
            ) : (
              stats.completedRatings.map((rating) => (
                <Link key={rating.property_id} href={`/propiedades/${rating.property_id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/40 transition-colors group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-gold-400/10 border border-border flex items-center justify-center text-xs font-bold">
                      {rating.final_avg_score?.toFixed(1) || "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {rating.title}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          A: {rating.score_a_weighted?.toFixed(1) || "—"} · B: {rating.score_b_weighted?.toFixed(1) || "—"}
                        </span>
                      </div>
                    </div>
                    <TrendingUp className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-enter" style={{ animationDelay: "0.2s" }}>
        <QuickAction
          href="/fuentes"
          icon={<Search className="w-6 h-6" />}
          title="Nuevo scraping"
          description="Importar propiedades de una inmobiliaria"
          gradient="from-blue-600/20 to-blue-500/5 hover:from-blue-600/30"
        />
        <QuickAction
          href="/propiedades?status=visited"
          icon={<Eye className="w-6 h-6" />}
          title="Propiedades visitadas"
          description="Ver y calificar propiedades visitadas"
          gradient="from-emerald-600/20 to-emerald-500/5 hover:from-emerald-600/30"
        />
        <QuickAction
          href="/comparar"
          icon={<Star className="w-6 h-6" />}
          title="Ver comparativa"
          description="Análisis dual de todas las calificaciones"
          gradient="from-amber-600/20 to-amber-500/5 hover:from-amber-600/30"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
  border: string;
}) {
  return (
    <div className={`glass-card p-4 bg-gradient-to-br ${bg} border ${border}`}>
      <div className="flex items-center justify-between mb-3">
        {icon}
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value.toLocaleString("es-AR")}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
  gradient,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <Link href={href}>
      <div className={`glass-card p-5 bg-gradient-to-br ${gradient} transition-all duration-200 cursor-pointer group card-hover`}>
        <div className="text-muted-foreground group-hover:text-foreground transition-colors mb-3">
          {icon}
        </div>
        <h3 className="font-semibold text-sm text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-muted-foreground text-sm">
      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
      {message}
    </div>
  );
}
