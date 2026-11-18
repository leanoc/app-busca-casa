"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Profile } from "@/types";
import {
  Home,
  Building2,
  Search,
  Star,
  GitCompare,
  Settings,
  Globe,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface SidebarProps {
  profile: Profile | null;
  partnerProfile: Profile | null;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/propiedades", label: "Propiedades", icon: Building2 },
  { href: "/fuentes", label: "Fuentes / Scraping", icon: Globe },
  { href: "/comparar", label: "Comparar", icon: GitCompare },
];

export default function Sidebar({ profile, partnerProfile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const roleLabel = profile?.role === "user_a" ? "Usuario A" : "Usuario B";
  const roleColor = profile?.role === "user_a" ? "text-blue-400" : "text-purple-400";
  const roleBg = profile?.role === "user_a" ? "bg-blue-500/10 border-blue-500/20" : "bg-purple-500/10 border-purple-500/20";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/50 bg-card/40 backdrop-blur-md shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Home className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-bold text-base gradient-text">AppBuscaCasa</span>
          </Link>
        </div>

        {/* Perfil del usuario */}
        <div className="p-4 border-b border-border/50">
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${roleBg}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.display_name || "Cargando…"}
              </p>
              <p className={`text-xs font-medium ${roleColor}`}>{roleLabel}</p>
            </div>
          </div>

          {/* Partner online indicator */}
          {partnerProfile && (
            <div className="flex items-center gap-2 mt-2 px-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
              <span className="text-xs text-muted-foreground">
                {partnerProfile.display_name} conectado/a
              </span>
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${isActive ? "active" : ""}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border/50 space-y-1">
          <Link href="/configuracion" className="sidebar-item">
            <Settings className="w-4 h-4" />
            Configuración
          </Link>
          <button
            onClick={handleLogout}
            id="btn-logout"
            className="sidebar-item w-full text-left text-destructive/80 hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
