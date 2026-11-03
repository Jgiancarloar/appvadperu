
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Verificar sesión de Supabase Auth
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;

    if (error || typeof userId !== "string") {
      return NextResponse.json(
        { error: "No hay una sesión activa." },
        { status: 401 },
      );
    }

    // 2. Buscar primero un usuario interno
    const {
      data: systemUser,
      error: systemUserError,
    } = await supabaseAdmin
      .from("system_users")
      .select(
        "id, full_name, email, role, is_active, must_change_password",
      )
      .eq("id", userId)
      .maybeSingle();

    if (systemUserError) {
      console.error(
        "Error consultando usuario interno:",
        systemUserError,
      );

      return NextResponse.json(
        { error: "No se pudo verificar el usuario." },
        { status: 500 },
      );
    }

    // 3. Si es usuario interno
    if (systemUser) {
      if (!systemUser.is_active) {
        return NextResponse.json(
          { error: "Tu cuenta se encuentra desactivada." },
          { status: 403 },
        );
      }

      return NextResponse.json({
        user: {
          id: systemUser.id,
          fullName: systemUser.full_name,
          email: systemUser.email,
          role: systemUser.role,
          mustChangePassword:
            systemUser.must_change_password,
          clientId: null,
        },
      });
    }

    // 4. Si no es interno, buscar usuario cliente
    const {
      data: clientUser,
      error: clientUserError,
    } = await supabaseAdmin
      .from("client_users")
      .select(
        "id, full_name, email, client_id, is_active, must_change_password",
      )
      .eq("id", userId)
      .maybeSingle();

    if (clientUserError) {
      console.error(
        "Error consultando usuario cliente:",
        clientUserError,
      );

      return NextResponse.json(
        { error: "No se pudo verificar el usuario." },
        { status: 500 },
      );
    }

    // 5. Si no existe en ninguna tabla
    if (!clientUser) {
      return NextResponse.json(
        { error: "El usuario no tiene un perfil registrado." },
        { status: 403 },
      );
    }

    // 6. Verificar que el usuario cliente esté activo
    if (!clientUser.is_active) {
      return NextResponse.json(
        { error: "Tu cuenta se encuentra desactivada." },
        { status: 403 },
      );
    }

    // 7. Devolver sesión del usuario cliente
    return NextResponse.json({
      user: {
        id: clientUser.id,
        fullName: clientUser.full_name,
        email: clientUser.email,
        role: "client_user",
        mustChangePassword:
          clientUser.must_change_password,
        clientId: clientUser.client_id,
      },
    });
  } catch (error) {
    console.error("Error verificando sesión:", error);

    return NextResponse.json(
      { error: "Ocurrió un error al verificar tu sesión." },
      { status: 500 },
    );
  }
}
