
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import ClientLayout from "../../../components/layout/ClientLayout";
import { createClient } from "../../../lib/supabase/server";
import { supabaseAdmin } from "../../../lib/supabase/admin";

export default async function ClientRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // 1. Verificar sesión
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    redirect("/login");
  }

  // 2. Consultar usuario cliente
  const { data: clientUser, error: clientUserError } =
    await supabaseAdmin
      .from("client_users")
      .select(
        "id, full_name, email, client_id, is_active, must_change_password",
      )
      .eq("id", userId)
      .maybeSingle();

  if (
    clientUserError ||
    !clientUser ||
    !clientUser.is_active
  ) {
    redirect("/login?error=sin-acceso");
  }

  // 3. Cambio obligatorio de contraseña
  if (clientUser.must_change_password) {
    redirect("/change-password");
  }

  // 4. Renderizar portal del cliente
  return (
    <ClientLayout
      user={{
        fullName: clientUser.full_name,
        email: clientUser.email,
      }}
    >
      {children}
    </ClientLayout>
  );
}
