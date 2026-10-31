
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

// =====================================================
// GET: LISTAR USUARIOS INTERNOS
// =====================================================

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    const userId = data?.claims?.sub;

    if (error || typeof userId !== "string") {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const { data: currentUser, error: userError } =
      await supabaseAdmin
        .from("system_users")
        .select("id, email, role, is_active")
        .eq("id", userId)
        .maybeSingle();

    if (userError) {
      console.error("Error verificando usuario interno:", userError);

      return NextResponse.json(
        { error: "No se pudo verificar tu cuenta." },
        { status: 500 }
      );
    }

    if (
      !currentUser ||
      !currentUser.is_active ||
      currentUser.role !== "vad_admin"
    ) {
      return NextResponse.json(
        { error: "No tienes permisos para consultar estos usuarios." },
        { status: 403 }
      );
    }

    const { data: users, error: queryError } =
      await supabaseAdmin
        .from("system_users")
        .select("id, full_name, email, role, is_active, created_at")
        .order("full_name", { ascending: true });

    if (queryError) {
      console.error("Error cargando usuarios internos:", queryError);

      return NextResponse.json(
        { error: "No se pudieron cargar los usuarios internos." },
        { status: 500 }
      );
    }

    const isSuperadmin =
      currentUser.email.toLowerCase() === "ventas@vad-peru.com";

    return NextResponse.json(
      {
        users: users ?? [],
        isSuperadmin,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error inesperado en GET /api/admin/system-users:", error);

    return NextResponse.json(
      { error: "Ocurrió un error inesperado en el servidor." },
      { status: 500 }
    );
  }
}

// =====================================================
// POST: INVITAR NUEVO USUARIO INTERNO
// =====================================================

export async function POST(request: Request) {
  try {
    // 1. Verificar sesión.
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    const userId = data?.claims?.sub;

    if (error || typeof userId !== "string") {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    // 2. Verificar que sea el superadministrador.
    const { data: currentUser, error: userError } =
      await supabaseAdmin
        .from("system_users")
        .select("id, email, role, is_active")
        .eq("id", userId)
        .maybeSingle();

    if (userError) {
      console.error("Error verificando superadministrador:", userError);

      return NextResponse.json(
        { error: "No se pudo verificar tu cuenta." },
        { status: 500 }
      );
    }

    const isSuperadmin =
      currentUser?.email?.toLowerCase() === "ventas@vad-peru.com";

    if (
      !currentUser ||
      !currentUser.is_active ||
      currentUser.role !== "vad_admin" ||
      !isSuperadmin
    ) {
      return NextResponse.json(
        { error: "Solo el superadministrador puede invitar usuarios." },
        { status: 403 }
      );
    }

    // 3. Leer y validar los datos recibidos.
    const body = await request.json();

    const fullName =
      typeof body.full_name === "string" ? body.full_name.trim() : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const role = body.role;

    if (!fullName || fullName.length > 150) {
      return NextResponse.json(
        { error: "Ingresa un nombre válido (máximo 150 caracteres)." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email) || email.length > 254) {
      return NextResponse.json(
        { error: "Ingresa un correo electrónico válido." },
        { status: 400 }
      );
    }

    if (!["vad_admin", "vad_technician"].includes(role)) {
      return NextResponse.json(
        { error: "El rol seleccionado no es válido." },
        { status: 400 }
      );
    }

    if (email === "ventas@vad-peru.com") {
      return NextResponse.json(
        { error: "No puedes invitar nuevamente al superadministrador." },
        { status: 409 }
      );
    }

    // 4. Comprobar que el correo no esté registrado en system_users.
    const { data: existingUser, error: existingError } =
      await supabaseAdmin
        .from("system_users")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

    if (existingError) {
      console.error("Error comprobando correo:", existingError);

      return NextResponse.json(
        { error: "No se pudo comprobar si el correo está registrado." },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario interno con ese correo." },
        { status: 409 }
      );
    }

    // 5. Enviar invitación mediante Supabase Auth.
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const redirectTo = new URL(
      "/auth/callback",
      siteUrl
    ).toString();

    const { data: invitation, error: invitationError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          full_name: fullName,
        },
      });

    if (invitationError || !invitation.user) {
      console.error("Error enviando invitación:", invitationError);

      return NextResponse.json(
        {
          error:
            invitationError?.message ||
            "No se pudo enviar la invitación.",
        },
        { status: 400 }
      );
    }

    const invitedUserId = invitation.user.id;

    // 6. Registrar al usuario en system_users.
    const { error: insertError } = await supabaseAdmin
      .from("system_users")
      .insert({
        id: invitedUserId,
        full_name: fullName,
        email,
        role,
        is_active: true,
      });

    if (insertError) {
      console.error("Error registrando usuario interno:", insertError);

      // Intentar eliminar el usuario de Auth si falla el registro.
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.deleteUser(invitedUserId);

      if (rollbackError) {
        console.error("Error eliminando usuario de Auth:", rollbackError);
      }

      return NextResponse.json(
        {
          error:
            "La invitación fue procesada, pero no se pudo registrar al usuario. Se intentó revertir la creación.",
        },
        { status: 500 }
      );
    }

    // 7. Respuesta exitosa.
    return NextResponse.json(
      {
        message: "Invitación enviada correctamente.",
        user: {
          id: invitedUserId,
          full_name: fullName,
          email,
          role,
          is_active: true,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error inesperado en POST /api/admin/system-users:", error);

    return NextResponse.json(
      { error: "Ocurrió un error inesperado en el servidor." },
      { status: 500 }
    );
  }
}
