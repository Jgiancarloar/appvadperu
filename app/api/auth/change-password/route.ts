
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Verificar sesión autenticada
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;

    if (error || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Tu sesión ha expirado. Inicia sesión nuevamente." },
        { status: 401 },
      );
    }

    // 2. Buscar usuario interno
    const { data: systemUser, error: systemUserError } =
      await supabaseAdmin
        .from("system_users")
        .select("id, role, is_active")
        .eq("id", userId)
        .maybeSingle();

    if (systemUserError) {
      console.error("Error consultando usuario interno:", systemUserError);

      return NextResponse.json(
        { error: "No se pudo verificar tu cuenta." },
        { status: 500 },
      );
    }

    let role: "vad_admin" | "vad_technician" | "client_user";
    let userTable: "system_users" | "client_users";

    if (systemUser) {
      // 3. Validar usuario interno
      if (
        !systemUser.is_active ||
        !["vad_admin", "vad_technician"].includes(systemUser.role)
      ) {
        return NextResponse.json(
          { error: "No tienes autorización para realizar esta operación." },
          { status: 403 },
        );
      }

      role = systemUser.role as "vad_admin" | "vad_technician";
      userTable = "system_users";
    } else {
      // 4. Si no es interno, buscar usuario cliente
      const { data: clientUser, error: clientUserError } =
        await supabaseAdmin
          .from("client_users")
          .select("id, is_active")
          .eq("id", userId)
          .maybeSingle();

      if (clientUserError) {
        console.error("Error consultando usuario cliente:", clientUserError);

        return NextResponse.json(
          { error: "No se pudo verificar tu cuenta." },
          { status: 500 },
        );
      }

      if (!clientUser || !clientUser.is_active) {
        return NextResponse.json(
          { error: "No tienes autorización para realizar esta operación." },
          { status: 403 },
        );
      }

      role = "client_user";
      userTable = "client_users";
    }

    // 5. Validar contraseña recibida
    let body: { password?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "La solicitud no contiene datos válidos." },
        { status: 400 },
      );
    }

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

    // 6. Actualizar contraseña en Supabase Auth
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

    // 7. Marcar que el usuario ya cambió su contraseña temporal
    const { error: updateError } = await supabaseAdmin
      .from(userTable)
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

    // 8. Devolver el rol para realizar la redirección correcta
    return NextResponse.json({
      success: true,
      message: "Tu contraseña se actualizó correctamente.",
      role,
    });
  } catch (error) {
    console.error("Error en cambio de contraseña:", error);

    return NextResponse.json(
      { error: "Ocurrió un error al procesar tu solicitud." },
      { status: 500 },
    );
  }
}
