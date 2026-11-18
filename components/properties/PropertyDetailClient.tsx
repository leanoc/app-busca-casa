"use client";

import { useState } from "react";
import { type Property, type Rating, type BlindStatus, type Profile, type RatingBlindStatus } from "@/types";
import { Heart, Eye, Trash2, Star, Lock, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { scoreToColor } from "@/lib/utils/scoring";

const RatingModal = dynamic(() => import("@/components/ratings/RatingModal"), {
  ssr: false,
});

interface Props {
  property: Property;
  myRating: Rating | null;
  blindStatus: RatingBlindStatus | null;
  profile: Profile | null;
  myFavorite: boolean;
  partnerFavorite: boolean;
}

const STATUS_OPTIONS = [
  { value: "tracking", label: "En seguimiento", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  { value: "visited", label: "Visitada", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { value: "discarded", label: "Descartada", color: "text-red-400 border-red-500/30 bg-red-500/10" },
];

export default function PropertyDetailClient({
  property,
  myRating,
  blindStatus,
  profile,
  myFavorite: initialMyFav,
  partnerFavorite,
}: Props) {
  const [isFav, setIsFav] = useState(initialMyFav);
  const [status, setStatus] = useState(property.status);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentRating, setCurrentRating] = useState<Rating | null>(myRating);
  const [blindState, setBlindState] = useState<RatingBlindStatus | null>(blindStatus);

  const handleFavoriteToggle = async () => {
    setIsFav((prev) => !prev);
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_id: property.id }),
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus as typeof status);
    await fetch("/api/properties", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: property.id, status: newStatus }),
    });
  };

  const blindStatusLabel = blindState?.blind_status;
  const isCompleted = blindStatusLabel === "completed";
  const isMySubmitted = !!currentRating?.submitted_at;

  return (
    <>
      {/* Panel de acciones */}
      <div className="glass-card p-5 space-y-4 animate-enter" style={{ animationDelay: "0.05s" }}>
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Acciones</h2>

        {/* Favorito */}
        <button
          id="btn-detail-favorite"
          onClick={handleFavoriteToggle}
          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
            isFav
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
          <span className="text-sm font-medium">
            {isFav ? "En mis favoritos" : "Agregar a favoritos"}
          </span>
          {partnerFavorite && (
            <span className="ml-auto text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              Al otro le gusta
            </span>
          )}
        </button>

        {/* Estado */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Estado de seguimiento</p>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                id={`btn-status-${opt.value}`}
                onClick={() => handleStatusChange(opt.value)}
                className={`flex-1 py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all ${
                  status === opt.value
                    ? opt.color
                    : "bg-secondary/30 border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calificación */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Calificación dual</p>
          <BlindStatusIndicator blindStatus={blindState} isMySubmitted={isMySubmitted} />

          {status === "visited" && (
            <button
              id="btn-open-rating"
              onClick={() => setShowRatingModal(true)}
              disabled={isMySubmitted && !isCompleted}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary/15 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isMySubmitted ? (
                <>
                  <Lock className="w-4 h-4" />
                  {isCompleted ? "Ver calificaciones" : "Esperando al otro usuario"}
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  {currentRating ? "Continuar calificación" : "Calificar propiedad"}
                </>
              )}
            </button>
          )}

          {status !== "visited" && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              Marcá como "Visitada" para habilitar la calificación
            </p>
          )}
        </div>
      </div>

      {/* Resultados cuando ambos completaron */}
      {isCompleted && blindState && (
        <div className="glass-card p-5 animate-enter border-emerald-500/20 bg-emerald-500/5" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-emerald-400">Resultado doble ciego</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <ScoreCard
              label={`Usuario A`}
              score={blindState.score_a_weighted}
              impression={blindState.impression_a}
            />
            <ScoreCard
              label={`Usuario B`}
              score={blindState.score_b_weighted}
              impression={blindState.impression_b}
            />
          </div>

          <div className="text-center p-3 rounded-xl bg-card/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Promedio final</p>
            <p className="text-3xl font-display font-bold gradient-text">
              {blindState.final_avg_score?.toFixed(2) || "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">de 5.00</p>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && profile && (
        <RatingModal
          property={property}
          existingRating={currentRating}
          blindStatus={blindState?.blind_status || "pending"}
          profile={profile}
          onClose={() => setShowRatingModal(false)}
          onSaved={(rating) => setCurrentRating(rating)}
          onSubmitted={() => {
            setShowRatingModal(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

function BlindStatusIndicator({
  blindStatus,
  isMySubmitted,
}: {
  blindStatus: RatingBlindStatus | null;
  isMySubmitted: boolean;
}) {
  if (!blindStatus) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-slate-500" />
        Sin calificar aún
      </div>
    );
  }

  const status = blindStatus.blind_status;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {status === "completed" ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : status === "partial" ? (
          <Clock className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <span className="text-xs font-medium">
          {status === "completed"
            ? "Ambos calificaron ✓"
            : status === "partial"
            ? "Esperando al otro usuario"
            : "Pendiente de calificación"}
        </span>
      </div>

      {/* Indicadores por usuario */}
      <div className="flex gap-2">
        <div className={`flex-1 flex items-center gap-1.5 p-2 rounded-lg border text-[10px] ${
          blindStatus.user_a_submitted ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-secondary/30 border-border text-muted-foreground"
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${blindStatus.user_a_submitted ? "bg-emerald-400" : "bg-muted-foreground"}`} />
          Usuario A {blindStatus.user_a_submitted ? "✓" : "pendiente"}
        </div>
        <div className={`flex-1 flex items-center gap-1.5 p-2 rounded-lg border text-[10px] ${
          blindStatus.user_b_submitted ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-secondary/30 border-border text-muted-foreground"
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${blindStatus.user_b_submitted ? "bg-emerald-400" : "bg-muted-foreground"}`} />
          Usuario B {blindStatus.user_b_submitted ? "✓" : "pendiente"}
        </div>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  impression,
}: {
  label: string;
  score: number | null;
  impression: number | null;
}) {
  return (
    <div className="p-3 rounded-xl bg-card/50 border border-border/50 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold font-display ${scoreToColor(score)}`}>
        {score?.toFixed(2) || "—"}
      </p>
      {impression && (
        <div className="flex justify-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`w-3 h-3 ${s <= impression ? "fill-gold-400 text-gold-400" : "text-muted"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
