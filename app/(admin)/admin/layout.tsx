
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminLayout from "../../../components/layout/AdminLayout";
import { createClient } from "../../../lib/supabase/server";
import { supabaseAdmin } from "../../../lib/supabase/admin";

export default async function AdminRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // 1. Obtener el cliente de Supabase de la sesión actual.
  const supabase = await createClient();

  // 2. Comprobar que exista una sesión válida.
  const { data, error } = await supabase.auth.getClaims();

  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    redirect("/login");
  }

  // 3. Consultar el usuario en la nueva tabla system_users.
  // Esta consulta se realiza desde el servidor utilizando service_role.
  const { data: systemUser, error: systemUserError } =
    await supabaseAdmin
      .from("system_users")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle();

  // 4. Solo los administradores internos activos pueden entrar.
  if (
    systemUserError ||
    !systemUser ||
    !systemUser.is_active ||
    systemUser.role !== "vad_admin"
  ) {
    redirect("/login?error=sin-acceso");
  }

  return <AdminLayout>{children}</AdminLayout>;
}
