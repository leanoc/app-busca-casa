import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AppBuscaCasa — Búsqueda de propiedades en La Plata, Berisso y Ensenada",
  description:
    "Plataforma colaborativa para buscar, evaluar y comparar propiedades inmobiliarias en La Plata, Berisso y Ensenada con sistema de calificación dual.",
  keywords: ["inmobiliaria", "La Plata", "Berisso", "Ensenada", "comprar casa", "propiedades"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
