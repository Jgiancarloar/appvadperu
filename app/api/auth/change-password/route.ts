
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verificar sesión autenticada.
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;

    if (error || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Tu sesión ha expirado. Inicia sesión nuevamente." },
        { status: 401 },
      );
    }

    // Verificar que sea un usuario interno activo.
    const { data: systemUser, error: userError } = await supabaseAdmin
      .from("system_users")
      .select("id, role, is_active, must_change_password")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("Error consultando usuario:", userError);

      return NextResponse.json(
        { error: "No se pudo verificar tu cuenta." },
        { status: 500 },
      );
    }

    if (
      !systemUser ||
      !systemUser.is_active ||
      !["vad_admin", "vad_technician"].includes(systemUser.role)
    ) {
      return NextResponse.json(
        { error: "No tienes autorización para realizar esta operación." },
        { status: 403 },
      );
    }

    // Validar contraseña recibida.
    const body = await request.json();
    const password = body?.password;

    if (
      typeof password !== "string" ||
      password.length < 10 ||
      password.length > 128
    ) {
      return NextResponse.json(
        { error: "La contraseña debe tener entre 10 y 128 caracteres." },
        { status: 400 },
      );
    }

    // Actualizar contraseña en Supabase Auth.
    const { error: passwordError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
      });

    if (passwordError) {
      console.error("Error actualizando contraseña:", passwordError);

      return NextResponse.json(
        { error: "No se pudo actualizar la contraseña." },
        { status: 500 },
      );
    }

    // Marcar que el usuario ya cambió su contraseña temporal.
    const { error: updateError } = await supabaseAdmin
      .from("system_users")
      .update({ must_change_password: false })
      .eq("id", userId);

    if (updateError) {
      console.error("Error actualizando estado:", updateError);

      return NextResponse.json(
        {
          error:
            "La contraseña se actualizó, pero no se pudo actualizar el estado de la cuenta. Contacta al administrador.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tu contraseña se actualizó correctamente.",
    });
  } catch (error) {
    console.error("Error en cambio de contraseña:", error);

    return NextResponse.json(
      { error: "Ocurrió un error al procesar tu solicitud." },
      { status: 500 },
    );
  }
}
