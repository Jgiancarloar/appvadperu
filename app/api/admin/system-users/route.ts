
import { randomBytes } from "node:crypto";
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
            currentUser.email?.toLowerCase() === "ventas@vad-peru.com";

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
        console.error(
            "Error inesperado en GET /api/admin/system-users:",
            error
        );

        return NextResponse.json(
            { error: "Ocurrió un error inesperado en el servidor." },
            { status: 500 }
        );
    }
}

// =====================================================
// POST: CREAR USUARIO INTERNO CON CONTRASEÑA TEMPORAL
// =====================================================

export async function POST(request: Request) {
    let createdAuthUserId: string | null = null;

    try {
        // 1. VERIFICAR SESIÓN

        const supabase = await createClient();
        const { data, error } = await supabase.auth.getClaims();

        const userId = data?.claims?.sub;

        if (error || typeof userId !== "string") {
            return NextResponse.json(
                { error: "No autorizado." },
                { status: 401 }
            );
        }

        // 2. VERIFICAR SUPERADMINISTRADOR

        const { data: currentUser, error: userError } =
            await supabaseAdmin
                .from("system_users")
                .select("id, email, role, is_active")
                .eq("id", userId)
                .maybeSingle();

        if (userError) {
            console.error(
                "Error verificando superadministrador:",
                userError
            );

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
                {
                    error: "Solo el superadministrador puede crear usuarios internos.",
                },
                { status: 403 }
            );
        }

        // 3. LEER Y VALIDAR DATOS

        let body: Record<string, unknown>;

        try {
            const parsedBody: unknown = await request.json();

            if (
                !parsedBody ||
                typeof parsedBody !== "object" ||
                Array.isArray(parsedBody)
            ) {
                return NextResponse.json(
                    { error: "Los datos enviados no son válidos." },
                    { status: 400 }
                );
            }

            body = parsedBody as Record<string, unknown>;
        } catch {
            return NextResponse.json(
                { error: "No se pudo procesar la información enviada." },
                { status: 400 }
            );
        }

        const fullName =
            typeof body.full_name === "string"
                ? body.full_name.trim()
                : "";

        const email =
            typeof body.email === "string"
                ? body.email.trim().toLowerCase()
                : "";

        const role = body.role;

        if (!fullName || fullName.length > 150) {
            return NextResponse.json(
                {
                    error: "Ingresa un nombre válido (máximo 150 caracteres).",
                },
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

        if (
            role !== "vad_admin" &&
            role !== "vad_technician"
        ) {
            return NextResponse.json(
                { error: "El rol seleccionado no es válido." },
                { status: 400 }
            );
        }

        if (email === "ventas@vad-peru.com") {
            return NextResponse.json(
                {
                    error: "No puedes crear nuevamente al superadministrador.",
                },
                { status: 409 }
            );
        }

        // 4. COMPROBAR CORREO EN SYSTEM_USERS

        const { data: existingUser, error: existingError } =
            await supabaseAdmin
                .from("system_users")
                .select("id")
                .eq("email", email)
                .maybeSingle();

        if (existingError) {
            console.error(
                "Error comprobando correo:",
                existingError
            );

            return NextResponse.json(
                {
                    error: "No se pudo comprobar si el correo está registrado.",
                },
                { status: 500 }
            );
        }

        if (existingUser) {
            return NextResponse.json(
                {
                    error: "Ya existe un usuario interno con ese correo.",
                },
                { status: 409 }
            );
        }

        // 5. GENERAR CONTRASEÑA TEMPORAL SEGURA

        const temporaryPassword = randomBytes(32).toString("base64url");

        // 6. CREAR CUENTA DIRECTAMENTE EN SUPABASE AUTH

        const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
                email,
                password: temporaryPassword,
                email_confirm: true,
                user_metadata: {
                    full_name: fullName,
                },
            });

        if (authError || !authData.user) {
            console.error("Error creando usuario en Supabase Auth:", authError);

            return NextResponse.json(
                {
                    error:
                        authError?.message ||
                        "No se pudo crear la cuenta del usuario.",
                },
                { status: 400 }
            );
        }

        createdAuthUserId = authData.user.id;

        // 7. REGISTRAR USUARIO EN SYSTEM_USERS

        const { error: insertError } = await supabaseAdmin
            .from("system_users")
            .insert({
                id: createdAuthUserId,
                full_name: fullName,
                email,
                role,
                is_active: true,
                must_change_password: true,
            });

        if (insertError) {
            console.error(
                "Error registrando usuario interno:",
                insertError
            );

            // Intentar revertir la creación en Supabase Auth.

            const { error: rollbackError } =
                await supabaseAdmin.auth.admin.deleteUser(
                    createdAuthUserId
                );

            if (rollbackError) {
                console.error(
                    "Error eliminando usuario de Auth durante rollback:",
                    rollbackError
                );

                return NextResponse.json(
                    {
                        error:
                            "No se pudo registrar el usuario en la base de datos. La cuenta de autenticación podría requerir una revisión administrativa.",
                    },
                    { status: 500 }
                );
            }

            createdAuthUserId = null;

            return NextResponse.json(
                {
                    error:
                        "No se pudo registrar el usuario. Se revirtió la creación de su cuenta.",
                },
                { status: 500 }
            );
        }

        // 8. RESPUESTA EXITOSA

        return NextResponse.json(
            {
                message: "Usuario registrado correctamente.",
                temporaryPassword,
                user: {
                    id: createdAuthUserId,
                    full_name: fullName,
                    email,
                    role,
                    is_active: true,
                },
            },
            {
                status: 201,
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    } catch (error) {
        console.error(
            "Error inesperado en POST /api/admin/system-users:",
            error
        );

        return NextResponse.json(
            { error: "Ocurrió un error inesperado en el servidor." },
            { status: 500 }
        );
    }
}
