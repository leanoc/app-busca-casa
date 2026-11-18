import { createClient } from "@/lib/supabase/server";
import {
  Star,
  TrendingUp,
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { type RatingBlindStatus } from "@/types";

export const metadata = {
  title: "Comparativa — AppBuscaCasa",
};

export default async function CompararPage() {
  const supabase = await createClient();

  const { data: statuses } = await supabase
    .from("rating_blind_status")
    .select("*")
    .order("final_avg_score", { ascending: false });

  const completed = statuses?.filter((s) => s.blind_status === "completed") || [];
  const partial = statuses?.filter((s) => s.blind_status === "partial" || s.blind_status === "draft") || [];
  const pending = statuses?.filter((s) => s.blind_status === "pending") || [];

  // Top 3 propiedades por score promedio
  const top3 = completed.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="animate-enter">
        <h1 className="text-2xl font-display font-bold">Vista Comparativa</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Resultados del sistema de calificación doble ciego
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 animate-enter" style={{ animationDelay: "0.05s" }}>
        <div className="glass-card p-4 text-center border-emerald-500/20 bg-emerald-500/5">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-bold font-display text-emerald-400">{completed.length}</p>
          <p className="text-xs text-muted-foreground">Completadas</p>
        </div>
        <div className="glass-card p-4 text-center border-amber-500/20 bg-amber-500/5">
          <Clock className="w-6 h-6 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold font-display text-amber-400">{partial.length}</p>
          <p className="text-xs text-muted-foreground">En progreso</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Building2 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-2xl font-bold font-display">{pending.length}</p>
          <p className="text-xs text-muted-foreground">Sin calificar</p>
        </div>
      </div>

      {/* Podium Top 3 */}
      {top3.length > 0 && (
        <div className="glass-card p-5 animate-enter" style={{ animationDelay: "0.1s" }}>
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <Award className="w-5 h-5 text-gold-400" />
            Top propiedades
          </h2>
          <div className="flex items-end gap-4 justify-center">
            {/* 2do lugar */}
            {top3[1] && (
              <PodiumCard
                rank={2}
                status={top3[1]}
                height="h-32"
                color="text-slate-300 border-slate-400/30 bg-slate-500/5"
                numberColor="text-slate-300"
              />
            )}
            {/* 1er lugar */}
            <PodiumCard
              rank={1}
              status={top3[0]}
              height="h-44"
              color="text-gold-400 border-gold-400/30 bg-gold-400/5"
              numberColor="gradient-text"
            />
            {/* 3er lugar */}
            {top3[2] && (
              <PodiumCard
                rank={3}
                status={top3[2]}
                height="h-24"
                color="text-amber-600/80 border-amber-600/30 bg-amber-600/5"
                numberColor="text-amber-600/80"
              />
            )}
          </div>
        </div>
      )}

      {/* Tabla comparativa completa */}
      {completed.length > 0 && (
        <div className="glass-card overflow-hidden animate-enter" style={{ animationDelay: "0.15s" }}>
          <div className="p-4 border-b border-border/50 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">Ranking completo</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/20">
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">#</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Propiedad</th>
                  <th className="text-center px-3 py-3 text-xs text-muted-foreground font-medium">Score A</th>
                  <th className="text-center px-3 py-3 text-xs text-muted-foreground font-medium">Score B</th>
                  <th className="text-center px-3 py-3 text-xs text-muted-foreground font-medium">Promedio</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {completed.map((item, i) => (
                  <tr key={item.property_id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`font-bold ${i === 0 ? "text-gold-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/propiedades/${item.property_id}`} className="hover:text-primary transition-colors">
                        <span className="font-medium text-foreground line-clamp-1">{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.locality}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <ScoreChip score={item.score_a_weighted} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <ScoreChip score={item.score_b_weighted} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-bold font-display gradient-text text-base">
                        {item.final_avg_score?.toFixed(2) || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-emerald-400">
                      {item.price_usd
                        ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(item.price_usd)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* En progreso */}
      {partial.length > 0 && (
        <div className="glass-card overflow-hidden animate-enter" style={{ animationDelay: "0.2s" }}>
          <div className="p-4 border-b border-border/50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold">Calificaciones en progreso</h2>
            <span className="ml-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Pendiente de calificación dual
            </span>
          </div>
          <div className="divide-y divide-border/30">
            {partial.map((item) => (
              <Link
                key={item.property_id}
                href={`/propiedades/${item.property_id}`}
                className="flex items-center gap-4 p-4 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.locality}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.user_a_submitted ? "bg-emerald-400" : "bg-muted"}`} />
                  <span className="text-xs text-muted-foreground">A</span>
                  <div className={`w-2 h-2 rounded-full ${item.user_b_submitted ? "bg-emerald-400" : "bg-muted"}`} />
                  <span className="text-xs text-muted-foreground">B</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {completed.length === 0 && partial.length === 0 && (
        <div className="glass-card p-16 text-center animate-enter">
          <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aún no hay calificaciones</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Marcá propiedades como visitadas y calificalas para ver el análisis comparativo aquí.
          </p>
          <Link
            href="/propiedades?status=visited"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ver propiedades visitadas
          </Link>
        </div>
      )}
    </div>
  );
}

function PodiumCard({
  rank,
  status,
  height,
  color,
  numberColor,
}: {
  rank: number;
  status: RatingBlindStatus;
  height: string;
  color: string;
  numberColor: string;
}) {
  return (
    <Link href={`/propiedades/${status.property_id}`} className="flex-1 max-w-48">
      <div className={`glass-card p-3 border ${color} ${height} flex flex-col justify-end transition-all hover:scale-105`}>
        <div className="text-center">
          <p className={`text-3xl font-bold font-display mb-1 ${numberColor}`}>
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{status.title}</p>
          <p className={`text-lg font-bold font-display ${numberColor}`}>
            {status.final_avg_score?.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">promedio</p>
        </div>
      </div>
    </Link>
  );
}

function ScoreChip({ score }: { score: number | null }) {
  if (!score) return <span className="text-muted-foreground text-xs">—</span>;
  const color =
    score >= 4 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
    score >= 3 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" :
    "text-red-400 bg-red-500/10 border-red-500/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-bold ${color}`}>
      {score.toFixed(2)}
    </span>
  );
}
