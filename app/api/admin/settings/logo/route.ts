
import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";

const BUCKET = "company-assets";
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

type LogoType = "logo_url" | "document_logo_url";

async function verifySuperadmin() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "No tienes una sesión válida." },
        { status: 401 },
      ),
    };
  }

  const userId = data.claims.sub;

  const { data: systemUser, error: userError } = await supabaseAdmin
    .from("system_users")
    .select("id, email, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (
    userError ||
    !systemUser ||
    !systemUser.is_active ||
    systemUser.role !== "vad_admin" ||
    systemUser.email?.toLowerCase() !== "ventas@vad-peru.com"
  ) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "No tienes permisos para realizar esta acción." },
        { status: 403 },
      ),
    };
  }

  return {
    authorized: true as const,
    userId,
  };
}

export async function POST(request: Request) {
  try {
    const auth = await verifySuperadmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const formData = await request.formData();

    const file = formData.get("file");
    const type = formData.get("type");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes seleccionar una imagen." },
        { status: 400 },
      );
    }

    if (type !== "logo_url" && type !== "document_logo_url") {
      return NextResponse.json(
        { error: "Tipo de logo no válido." },
        { status: 400 },
      );
    }

    const logoType = type as LogoType;

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: "Formato no permitido. Utiliza PNG, JPG o WEBP." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "La imagen debe pesar como máximo 2 MB." },
        { status: 400 },
      );
    }

    const extension = ALLOWED_TYPES[file.type];
    const filePath = `company/${logoType === "logo_url" ? "logo" : "document-logo"}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error al subir logo:", uploadError);

      return NextResponse.json(
        { error: "No se pudo subir la imagen a Storage." },
        { status: 500 },
      );
    }

    const { data: currentSettings, error: readError } = await supabaseAdmin
      .from("system_settings")
      .select("id, logo_url, document_logo_url")
      .limit(1)
      .maybeSingle();

    if (readError) {
      await supabaseAdmin.storage.from(BUCKET).remove([filePath]);

      return NextResponse.json(
        { error: "No se pudo consultar la configuración de la empresa." },
        { status: 500 },
      );
    }

    const previousPath = currentSettings?.[logoType];

    const settingsData = {
      [logoType]: filePath,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = currentSettings
      ? await supabaseAdmin
          .from("system_settings")
          .update(settingsData)
          .eq("id", currentSettings.id)
      : await supabaseAdmin
          .from("system_settings")
          .insert(settingsData);

    if (saveError) {
      await supabaseAdmin.storage.from(BUCKET).remove([filePath]);

      console.error("Error al guardar ruta del logo:", saveError);

      return NextResponse.json(
        { error: "La imagen se subió, pero no se pudo guardar su información." },
        { status: 500 },
      );
    }

    // Eliminar el logo anterior después de guardar correctamente el nuevo.
    if (previousPath && previousPath !== filePath) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([previousPath]);

      if (removeError) {
        console.error("No se pudo eliminar el logo anterior:", removeError);
      }
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 60 * 60);

    if (signedError) {
      console.error("Error al generar URL del logo:", signedError);
    }

    return NextResponse.json({
      success: true,
      message: "Logo actualizado correctamente.",
      type: logoType,
      path: filePath,
      signedUrl: signedData?.signedUrl ?? null,
    });
  } catch (error) {
    console.error("Error en API de logos:", error);

    return NextResponse.json(
      { error: "Ocurrió un error inesperado al procesar la imagen." },
      { status: 500 },
    );
  }
}
