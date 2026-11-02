
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

const SUPERADMIN_EMAIL = "ventas@vad-peru.com";

async function verifySuperadmin() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  const userId = data?.claims?.sub;

  if (error || !userId) {
    return {
      authorized: false,
      status: 401,
      error: "No autorizado.",
    } as const;
  }

  const { data: systemUser, error: userError } = await supabaseAdmin
    .from("system_users")
    .select("id, email, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    console.error("Error verificando superadministrador:", userError);

    return {
      authorized: false,
      status: 500,
      error: "No se pudo verificar el usuario.",
    } as const;
  }

  if (
    !systemUser ||
    !systemUser.is_active ||
    systemUser.role !== "vad_admin" ||
    systemUser.email.toLowerCase() !== SUPERADMIN_EMAIL
  ) {
    return {
      authorized: false,
      status: 403,
      error: "Solo el superadministrador puede acceder a esta configuración.",
    } as const;
  }

  return {
    authorized: true,
    userId,
  } as const;
}

// GET: Consultar configuración
export async function GET() {
  try {
    const auth = await verifySuperadmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { data: settings, error } = await supabaseAdmin
      .from("system_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error consultando configuración:", error);

      return NextResponse.json(
        { error: "No se pudo cargar la configuración." },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error inesperado en GET settings:", error);

    return NextResponse.json(
      { error: "Ocurrió un error interno del servidor." },
      { status: 500 }
    );
  }
}

// PUT: Guardar configuración
export async function PUT(request: Request) {
  try {
    const auth = await verifySuperadmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const textFields = [
      "company_name",
      "trade_name",
      "tax_id",
      "address",
      "phone",
      "email",
      "website",
      "logo_url",
      "document_logo_url",
      "footer_text",
      "system_name",
      "timezone",
      "date_format",
      "currency",
    ] as const;

    const settings: Record<string, string> = {};

    for (const field of textFields) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "string") {
          return NextResponse.json(
            { error: `El campo ${field} no es válido.` },
            { status: 400 }
          );
        }

        settings[field] = body[field].trim();
      }
    }

    if (body.primary_color !== undefined) {
      if (
        typeof body.primary_color !== "string" ||
        !/^#[0-9A-Fa-f]{6}$/.test(body.primary_color)
      ) {
        return NextResponse.json(
          { error: "El color corporativo no es válido." },
          { status: 400 }
        );
      }

      settings.primary_color = body.primary_color;
    }

    if (settings.tax_id && !/^\d{11}$/.test(settings.tax_id)) {
      return NextResponse.json(
        { error: "El RUC debe contener exactamente 11 dígitos." },
        { status: 400 }
      );
    }

    if (
      settings.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)
    ) {
      return NextResponse.json(
        { error: "Ingresa un correo corporativo válido." },
        { status: 400 }
      );
    }

    if (
      settings.website &&
      !/^https?:\/\/.+/i.test(settings.website)
    ) {
      return NextResponse.json(
        { error: "El sitio web debe comenzar con https:// o http://." },
        { status: 400 }
      );
    }

    if (Object.keys(settings).length === 0) {
      return NextResponse.json(
        { error: "No se recibieron datos para guardar." },
        { status: 400 }
      );
    }

    settings.updated_by = auth.userId;
    settings.updated_at = new Date().toISOString();

    // Comprobar si ya existe una configuración.
    const { data: existingSettings, error: selectError } =
      await supabaseAdmin
        .from("system_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

    if (selectError) {
      console.error("Error consultando configuración:", selectError);

      return NextResponse.json(
        { error: "No se pudo consultar la configuración actual." },
        { status: 500 }
      );
    }

    let savedSettings;
    let saveError;

    if (existingSettings) {
      const result = await supabaseAdmin
        .from("system_settings")
        .update(settings)
        .eq("id", existingSettings.id)
        .select("*")
        .single();

      savedSettings = result.data;
      saveError = result.error;
    } else {
      const result = await supabaseAdmin
        .from("system_settings")
        .insert(settings)
        .select("*")
        .single();

      savedSettings = result.data;
      saveError = result.error;
    }

    if (saveError) {
      console.error("Error guardando configuración:", saveError);

      return NextResponse.json(
        { error: "No se pudo guardar la configuración." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Configuración guardada correctamente.",
      settings: savedSettings,
    });
  } catch (error) {
    console.error("Error inesperado en PUT settings:", error);

    return NextResponse.json(
      { error: "Ocurrió un error interno al guardar la configuración." },
      { status: 500 }
    );
  }
}
