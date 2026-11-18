"use client";

import { useState, useEffect } from "react";
import { type Rating, type Property, type BlindStatus, type Profile } from "@/types";
import {
  SECTION_A_ITEMS,
  SECTION_B_ITEMS,
  SECTION_C_ITEMS,
  calculateWeightedScore,
  isRatingComplete,
  ratingCompletionPercent,
  scoreToLabel,
} from "@/lib/utils/scoring";
import {
  X,
  Star,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Send,
  Save,
  Zap,
  Flame,
  Droplets,
  CloudRain,
  Square,
  Sun,
  DollarSign,
  Building2,
  MapPin,
  TrendingUp,
  FileText,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";

interface RatingModalProps {
  property: Property;
  existingRating?: Rating | null;
  blindStatus?: BlindStatus;
  profile: Profile;
  onClose: () => void;
  onSaved?: (rating: Rating) => void;
  onSubmitted?: () => void;
}

type Section = "A" | "B" | "C";

const ICON_MAP: Record<string, React.ElementType> = {
  Zap, Flame, Droplets, CloudRain, Square, Sun,
  DollarSign, Building2, MapPin, TrendingUp,
  FileText, Layers, AlertCircle,
};

export default function RatingModal({
  property,
  existingRating,
  blindStatus = "pending",
  profile,
  onClose,
  onSaved,
  onSubmitted,
}: RatingModalProps) {
  const [activeSection, setActiveSection] = useState<Section>("A");
  const [ratingData, setRatingData] = useState<Partial<Rating>>(existingRating || {});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubmitted = !!existingRating?.submitted_at;
  const completionPct = ratingCompletionPercent(ratingData);
  const weightedScore = calculateWeightedScore(ratingData);
  const canSubmit = isRatingComplete(ratingData) && !isSubmitted;

  const setScore = (key: string, value: number) => {
    if (isSubmitted) return;
    setRatingData((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const setNote = (key: string, value: string) => {
    if (isSubmitted) return;
    setRatingData((prev) => ({ ...prev, [key]: value || undefined }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (isSubmitted) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: property.id, ...ratingData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaved(true);
      onSaved?.(data.rating);
      // Update the rating ID for future saves
      setRatingData((prev) => ({ ...prev, id: data.rating.id }));
    } catch (err) {
      setError(`${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !ratingData.id) {
      // Guardar primero
      await handleSave();
    }
    if (!ratingData.id) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ratings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating_id: ratingData.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al enviar");
      setConfirmSubmit(false);
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(`${err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const sections: { id: Section; label: string; items: readonly (typeof SECTION_A_ITEMS[number] | typeof SECTION_B_ITEMS[number] | typeof SECTION_C_ITEMS[number])[] }[] = [
    { id: "A", label: "Técnica", items: SECTION_A_ITEMS },
    { id: "B", label: "Entorno", items: SECTION_B_ITEMS },
    { id: "C", label: "Legal", items: SECTION_C_ITEMS },
  ];

  const currentSection = sections.find((s) => s.id === activeSection)!;

  return (
    <div className="modal-backdrop z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="w-full sm:max-w-2xl bg-card border border-border/50 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 md:p-5 border-b border-border/50 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-base md:text-lg text-foreground truncate">
              Calificar propiedad
            </h2>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{property.title}</p>
          </div>

          {/* Estado doble ciego */}
          <BlindStatusBadge status={blindStatus} isSubmitted={isSubmitted} />

          <button
            onClick={onClose}
            id="btn-close-rating-modal"
            className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="shrink-0 px-5 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Completitud</span>
            <span className="text-xs font-medium text-foreground">{completionPct}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>

          {/* Score ponderado */}
          {weightedScore > 0 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">Score ponderado</span>
              <span className="text-sm font-bold font-display gradient-text">
                {weightedScore.toFixed(2)} / 5.00
              </span>
            </div>
          )}
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 p-3 shrink-0">
          {sections.map((section) => {
            const sectionItems = section.items;
            const filled = sectionItems.filter(
              (item) => ratingData[item.key as keyof Rating] != null
            ).length;
            const isComplete = filled === sectionItems.length;

            return (
              <button
                key={section.id}
                id={`btn-section-${section.id}`}
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-2 rounded-lg border text-xs transition-all ${
                  activeSection === section.id
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="font-bold">Sec. {section.id}</span>
                  {isComplete && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>
                <span className="text-[10px] opacity-70">{section.label}</span>
                <span className="text-[10px]">
                  {filled}/{sectionItems.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Items de calificación */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {isSubmitted && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <Lock className="w-4 h-4 shrink-0" />
              Tu calificación fue enviada y está bloqueada. Esperando al otro usuario.
            </div>
          )}

          {currentSection.items.map((item) => {
            const score = ratingData[item.key as keyof Rating] as number | undefined;
            const note = ratingData[item.noteKey as keyof Rating] as string | undefined;
            const Icon = ICON_MAP[item.icon] || Star;

            return (
              <div key={item.key} className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      {score && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {scoreToLabel(score)}
                        </span>
                      )}
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          id={`star-${item.key}-${star}`}
                          onClick={() => setScore(item.key, star)}
                          disabled={isSubmitted}
                          className={`star-interactive disabled:cursor-default ${
                            score && score >= star ? "star-filled" : "star-empty text-muted"
                          }`}
                        >
                          <Star
                            className={`w-6 h-6 ${score && score >= star ? "fill-gold-400 text-gold-400" : "fill-transparent text-muted"}`}
                          />
                        </button>
                      ))}
                      {!score && (
                        <span className="text-xs text-muted-foreground ml-1">Sin calificar</span>
                      )}
                    </div>

                    {/* Nota */}
                    {!isSubmitted ? (
                      <textarea
                        placeholder={`Nota sobre ${item.label.toLowerCase()}…`}
                        value={note || ""}
                        onChange={(e) => setNote(item.noteKey, e.target.value)}
                        rows={1}
                        className="w-full mt-2 bg-input/60 border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                      />
                    ) : note ? (
                      <p className="mt-1.5 text-xs text-muted-foreground italic bg-secondary/30 rounded-lg px-3 py-2">
                        {note}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="border-b border-border/30" />
              </div>
            );
          })}

          {/* Nota general (en Sección C) */}
          {activeSection === "C" && (
            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium text-foreground">Impresión general</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setScore("overall_impression", star)}
                    disabled={isSubmitted}
                    className="star-interactive disabled:cursor-default"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        ratingData.overall_impression && ratingData.overall_impression >= star
                          ? "fill-gold-400 text-gold-400"
                          : "fill-transparent text-muted"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {!isSubmitted && (
                <textarea
                  placeholder="Notas generales de la propiedad…"
                  value={ratingData.general_notes || ""}
                  onChange={(e) => setNote("general_notes", e.target.value)}
                  rows={3}
                  className="w-full bg-input/60 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        {/* Confirm submit modal */}
        {confirmSubmit && (
          <div className="mx-4 mb-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground mb-1">
                  ¿Confirmar envío definitivo?
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Una vez enviada, tu calificación quedará bloqueada y no podrás modificarla.
                  La calificación del otro usuario se revelará cuando ambos hayan enviado.
                </p>
                <div className="flex gap-2">
                  <button
                    id="btn-confirm-submit"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? "Enviando…" : "Confirmar envío"}
                  </button>
                  <button
                    onClick={() => setConfirmSubmit(false)}
                    className="flex-1 py-2 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        {!isSubmitted && (
          <div className="p-4 border-t border-border/50 flex items-center gap-2 shrink-0">
            {/* Navegación de secciones */}
            <button
              onClick={() => setActiveSection(activeSection === "B" ? "A" : activeSection === "C" ? "B" : "A")}
              disabled={activeSection === "A"}
              className="p-2 rounded-lg bg-secondary/50 border border-border disabled:opacity-30 hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveSection(activeSection === "A" ? "B" : activeSection === "B" ? "C" : "C")}
              disabled={activeSection === "C"}
              className="p-2 rounded-lg bg-secondary/50 border border-border disabled:opacity-30 hover:bg-secondary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              id="btn-save-rating"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <span className="text-xs">Guardando…</span>
              ) : saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-xs">Guardado</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Guardar borrador</span>
                </>
              )}
            </button>

            <button
              id="btn-submit-rating"
              onClick={() => {
                if (!canSubmit) return;
                setConfirmSubmit(true);
              }}
              disabled={!canSubmit || submitting}
              className="ml-auto flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-glow"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar calificación</span>
              <span className="sm:hidden">Enviar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BlindStatusBadge({ status, isSubmitted }: { status: BlindStatus; isSubmitted: boolean }) {
  if (isSubmitted) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
        <Lock className="w-2.5 h-2.5" />
        Enviada
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Completada
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium">
        <Clock className="w-2.5 h-2.5" />
        Pendiente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[10px] font-medium">
      <Eye className="w-2.5 h-2.5" />
      Sin calificar
    </span>
  );
}
