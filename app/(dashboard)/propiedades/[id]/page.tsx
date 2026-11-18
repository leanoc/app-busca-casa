import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatUSD, formatSurface, formatARS, formatRelativeDate } from "@/lib/utils/formatters";
import PropertyDetailClient from "@/components/properties/PropertyDetailClient";
import {
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Car,
  Building2,
  ExternalLink,
  Calendar,
  Globe,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: property, error } = await supabase
    .from("properties")
    .select(`
      *,
      source:real_estate_sources(id, name, connector_key, url),
      favorites(id, user_id)
    `)
    .eq("id", id)
    .single();

  if (error || !property) notFound();

  // Calificación propia
  const { data: myRating } = await supabase
    .from("ratings")
    .select("*")
    .eq("property_id", id)
    .eq("user_id", user.id)
    .single();

  // Estado doble ciego
  const { data: blindStatus } = await supabase
    .from("rating_blind_status")
    .select("*")
    .eq("property_id", id)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const myFavorite = property.favorites?.some((f: { user_id: string }) => f.user_id === user.id);
  const partnerFavorite = property.favorites?.some((f: { user_id: string }) => f.user_id !== user.id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/propiedades"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors animate-enter"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a propiedades
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main — Galería + Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Galería de fotos */}
          <div className="glass-card overflow-hidden animate-enter">
            {property.photos?.length > 0 ? (
              <div>
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={property.photos[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {property.photos.length > 1 && (
                  <div className="grid grid-cols-4 gap-1 p-1 bg-card/50">
                    {property.photos.slice(1, 5).map((url: string, i: number) => (
                      <div key={i} className="aspect-video relative overflow-hidden rounded">
                        <img
                          src={url}
                          alt={`Foto ${i + 2}`}
                          className="w-full h-full object-cover hover:opacity-80 transition-opacity cursor-pointer"
                        />
                        {i === 3 && property.photos.length > 5 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-bold">
                            +{property.photos.length - 5}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                <Building2 className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Descripción */}
          {property.description && (
            <div className="glass-card p-5 animate-enter" style={{ animationDelay: "0.05s" }}>
              <h2 className="font-semibold text-foreground mb-3">Descripción</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>
          )}

          {/* Amenities */}
          {property.amenities?.length > 0 && (
            <div className="glass-card p-5 animate-enter" style={{ animationDelay: "0.1s" }}>
              <h2 className="font-semibold text-foreground mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((amenity: string, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-secondary/50 border border-border text-xs text-muted-foreground"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — Datos y acciones */}
        <div className="space-y-4">
          {/* Precio y título */}
          <div className="glass-card p-5 animate-enter">
            <h1 className="text-lg font-display font-bold text-foreground leading-tight mb-2">
              {property.title}
            </h1>

            {property.price_usd && (
              <p className="text-2xl font-bold font-display text-emerald-400 mb-1">
                {formatUSD(property.price_usd)}
              </p>
            )}
            {property.expenses_ars && (
              <p className="text-xs text-muted-foreground">
                + Expensas: {formatARS(property.expenses_ars)}/mes
              </p>
            )}

            {property.address && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-3">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {property.address}
              </p>
            )}

            {/* Características */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border/50">
              {property.surface_total_m2 && (
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Superficie total</p>
                    <p className="text-sm font-medium">{formatSurface(property.surface_total_m2)}</p>
                  </div>
                </div>
              )}
              {property.surface_covered_m2 && (
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cubierta</p>
                    <p className="text-sm font-medium">{formatSurface(property.surface_covered_m2)}</p>
                  </div>
                </div>
              )}
              {property.bedrooms && (
                <div className="flex items-center gap-2">
                  <Bed className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dormitorios</p>
                    <p className="text-sm font-medium">{property.bedrooms}</p>
                  </div>
                </div>
              )}
              {property.bathrooms && (
                <div className="flex items-center gap-2">
                  <Bath className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Baños</p>
                    <p className="text-sm font-medium">{property.bathrooms}</p>
                  </div>
                </div>
              )}
              {property.garage && (
                <div className="flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Garage</p>
                    <p className="text-sm font-medium">Sí</p>
                  </div>
                </div>
              )}
              {property.rooms && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ambientes</p>
                    <p className="text-sm font-medium">{property.rooms}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Fuente y fecha */}
            <div className="mt-4 pt-3 border-t border-border/50 space-y-1.5">
              {property.source && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe className="w-3 h-3" />
                  <span>{property.source.name}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Scrapeado {formatRelativeDate(property.scraped_at)}</span>
              </div>
              {property.original_url && (
                <a
                  href={property.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver publicación original
                </a>
              )}
            </div>
          </div>

          {/* Componente cliente para acciones (favorito, estado, calificación) */}
          <PropertyDetailClient
            property={property}
            myRating={myRating}
            blindStatus={blindStatus}
            profile={profile}
            myFavorite={myFavorite}
            partnerFavorite={partnerFavorite}
          />
        </div>
      </div>
    </div>
  );
}
