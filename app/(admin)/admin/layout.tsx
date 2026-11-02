
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
  // 1. Obtener la sesión actual.
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    redirect("/login");
  }

  // 2. Consultar los datos del usuario interno.
  const { data: systemUser, error: systemUserError } =
    await supabaseAdmin
      .from("system_users")
      .select(
        "full_name, email, role, is_active, must_change_password",
      )
      .eq("id", userId)
      .maybeSingle();

  // 3. Comprobar que el usuario exista y esté activo.
  if (
    systemUserError ||
    !systemUser ||
    !systemUser.is_active ||
    !["vad_admin", "vad_technician"].includes(systemUser.role)
  ) {
    redirect("/login?error=sin-acceso");
  }

  // 4. Obligar al cambio de contraseña si está pendiente.
  if (systemUser.must_change_password) {
    redirect("/change-password");
  }

  // 5. Renderizar el panel con los datos y permisos del usuario.
  return (
    <AdminLayout
      user={{
        fullName: systemUser.full_name,
        email: systemUser.email,
        role: systemUser.role,
      }}
    >
      {children}
    </AdminLayout>
  );
}
