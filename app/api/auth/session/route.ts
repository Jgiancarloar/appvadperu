import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;

    if (error || typeof userId !== "string") {
      return NextResponse.json(
        { error: "No hay una sesión activa." },
        { status: 401 },
      );
    }

    const { data: systemUser, error: systemUserError } =
      await supabaseAdmin
        .from("system_users")
        .select("id, full_name, email, role, is_active, must_change_password")
        .eq("id", userId)
        .maybeSingle();

    if (systemUserError) {
      console.error("Error consultando usuario:", systemUserError);

      return NextResponse.json(
        { error: "No se pudo verificar el usuario." },
        { status: 500 },
      );
    }

    if (!systemUser) {
      return NextResponse.json(
        { error: "El usuario no tiene un perfil interno registrado." },
        { status: 403 },
      );
    }

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
        mustChangePassword: systemUser.must_change_password,
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