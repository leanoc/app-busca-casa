"use client";

import { type Profile } from "@/types";
import { Bell, Search, Menu } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Globe, GitCompare, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/propiedades", label: "Propiedades", icon: Building2 },
  { href: "/fuentes", label: "Fuentes", icon: Globe },
  { href: "/comparar", label: "Comparar", icon: GitCompare },
];

interface NavbarProps {
  profile: Profile | null;
}

export default function Navbar({ profile }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const roleColor = profile?.role === "user_a"
    ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
    : "bg-purple-500/20 text-purple-300 border-purple-500/30";

  return (
    <>
      <header className="h-14 border-b border-border/50 bg-card/30 backdrop-blur-md flex items-center px-4 md:px-6 gap-4 shrink-0 z-30">
        {/* Mobile logo + menu toggle */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            id="btn-mobile-menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-bold gradient-text">AppBuscaCasa</span>
        </div>

        {/* Búsqueda rápida */}
        <div className="flex-1 max-w-md hidden md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar propiedades…"
              className="w-full bg-input/60 border border-border/50 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Notificaciones */}
          <button
            id="btn-notifications"
            className="relative p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </button>

          {/* Avatar + rol */}
          <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${roleColor}`}>
            <div className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
              {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            {profile?.display_name}
          </div>
        </div>
      </header>

      {/* Mobile overlay menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute top-0 left-0 bottom-0 w-72 glass-card rounded-none rounded-r-2xl flex flex-col p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/50">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Home className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display font-bold gradient-text">AppBuscaCasa</span>
            </div>

            <nav className="space-y-1 flex-1">
              {NAV_ITEMS.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`sidebar-item ${isActive ? "active" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={handleLogout}
              className="sidebar-item text-destructive/80 hover:text-destructive hover:bg-destructive/10 mt-4"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
}
