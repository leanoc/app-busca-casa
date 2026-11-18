"use client";

import { type Property } from "@/types";
import { formatUSD, formatSurface, truncate } from "@/lib/utils/formatters";
import { Heart, MapPin, Bed, Bath, Maximize2, Building2, ExternalLink, Eye } from "lucide-react";
import { useState, useCallback } from "react";
import Link from "next/link";

interface PropertyCardProps {
  property: Property & {
    my_favorite?: boolean;
    partner_favorite?: boolean;
    favorites?: Array<{ user_id: string }>;
  };
  index?: number;
  currentUserId?: string;
}

export default function PropertyCard({ property, index = 0, currentUserId }: PropertyCardProps) {
  const [isFav, setIsFav] = useState(
    property.my_favorite || property.favorites?.some((f) => f.user_id === currentUserId) || false
  );
  const [isTogglingFav, setIsTogglingFav] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFavoriteToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isTogglingFav) return;
      setIsTogglingFav(true);
      setIsFav((prev) => !prev);

      try {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ property_id: property.id }),
        });
      } catch {
        setIsFav((prev) => !prev); // Revert on error
      } finally {
        setIsTogglingFav(false);
      }
    },
    [property.id, isTogglingFav]
  );

  const statusConfig = {
    tracking: { label: "Seguimiento", className: "status-tracking" },
    visited: { label: "Visitada", className: "status-visited" },
    discarded: { label: "Descartada", className: "status-discarded" },
  };
  const status = statusConfig[property.status];

  return (
    <Link href={`/propiedades/${property.id}`}>
      <article
        id={`property-card-${property.id}`}
        className="glass-card overflow-hidden card-hover cursor-pointer animate-enter group"
        style={{ animationDelay: `${Math.min(index * 0.04, 0.4)}s` }}
      >
        {/* Imagen */}
        <div className="photo-gallery relative">
          {property.thumbnail_url && !imageError ? (
            <img
              src={property.thumbnail_url}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
              <Building2 className="w-10 h-10 text-muted-foreground/40" />
            </div>
          )}

          <div className="photo-overlay" />

          {/* Fotos count */}
          {property.photos?.length > 1 && (
            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
              {property.photos.length} fotos
            </span>
          )}

          {/* Status badge */}
          <span className={`absolute top-2 left-2 ${status.className}`}>
            {status.label}
          </span>

          {/* Favorito */}
          <button
            id={`btn-fav-${property.id}`}
            onClick={handleFavoriteToggle}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all duration-200 ${
              isFav
                ? "bg-red-500/80 border-red-400/50 text-white"
                : "bg-black/40 border-white/20 text-white/70 hover:bg-black/60 hover:text-white"
            }`}
          >
            <Heart className={`w-4 h-4 transition-all ${isFav ? "fill-current scale-110" : ""}`} />
          </button>

          {/* Partner favorito indicator */}
          {property.partner_favorite && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-purple-500/70 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
              <Heart className="w-2.5 h-2.5 fill-current" />
              Le gustó al otro
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {property.title}
          </h3>

          {/* Ubicación */}
          {(property.address || property.locality) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {property.address ? truncate(property.address, 40) : property.locality}
              </span>
            </p>
          )}

          {/* Precio */}
          {property.price_usd && (
            <p className="text-base font-bold text-emerald-400 font-display">
              {formatUSD(property.price_usd)}
              {property.expenses_ars && (
                <span className="text-xs text-muted-foreground font-normal ml-1.5">
                  + exp.
                </span>
              )}
            </p>
          )}

          {/* Features */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/50">
            {property.surface_total_m2 && (
              <span className="flex items-center gap-1">
                <Maximize2 className="w-3 h-3" />
                {formatSurface(property.surface_total_m2)}
              </span>
            )}
            {property.bedrooms && (
              <span className="flex items-center gap-1">
                <Bed className="w-3 h-3" />
                {property.bedrooms} dorm.
              </span>
            )}
            {property.bathrooms && (
              <span className="flex items-center gap-1">
                <Bath className="w-3 h-3" />
                {property.bathrooms} baño{property.bathrooms > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
