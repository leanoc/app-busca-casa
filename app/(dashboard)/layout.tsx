import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Obtener perfil del partner
  const { data: partnerProfile } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", user.id)
    .single();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Desktop */}
      <Sidebar profile={profile} partnerProfile={partnerProfile} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar profile={profile} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
