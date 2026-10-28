
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminLayout from "../../../components/layout/AdminLayout";
import { createClient } from "../../../lib/supabase/server";

export default async function AdminRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const supabase = await createClient();

  // 1. Comprobar que exista una sesión válida.
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    redirect("/login");
  }

  // 2. Consultar el perfil y el rol del usuario.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  // 3. Solo los administradores activos pueden entrar.
  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    profile.role !== "vad_admin"
  ) {
    redirect("/login?error=sin-acceso");
  }

  return <AdminLayout>{children}</AdminLayout>;
}
