
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

// Generar contraseña temporal segura
function generateTemporaryPassword() {
    return `Vad-${crypto.randomUUID()}!`;
}

// Verificar que el usuario autenticado sea administrador activo
async function verifyAdmin() {
    const supabase = await createClient();

    const {
        data,
        error: authError,
    } = await supabase.auth.getClaims();

    const userId = data?.claims?.sub;

    if (authError || !userId) {
        return {
            authorized: false,
            status: 401,
            error: "No autorizado.",
        } as const;
    }

    const { data: systemUser, error: userError } = await supabaseAdmin
        .from("system_users")
        .select("id, role, is_active")
        .eq("id", userId)
        .maybeSingle();

    if (userError) {
        console.error("Error verificando administrador:", userError);

        return {
            authorized: false,
            status: 500,
            error: "No se pudo verificar el usuario.",
        } as const;
    }

    if (
        !systemUser ||
        !systemUser.is_active ||
        systemUser.role !== "vad_admin"
    ) {
        return {
            authorized: false,
            status: 403,
            error: "No tienes permisos para realizar esta operación.",
        } as const;
    }

    return {
        authorized: true,
        userId,
    } as const;
}

// GET: Listar usuarios de clientes
export async function GET() {
    try {
        const auth = await verifyAdmin();

        if (!auth.authorized) {
            return NextResponse.json(
                { error: auth.error },
                { status: auth.status }
            );
        }

        // Consultar usuarios de clientes
        const { data: users, error: usersError } = await supabaseAdmin
            .from("client_users")
            .select(`
        id,
        full_name,
        email,
        client_id,
        is_active,
        created_at,
        clients (
          id,
          business_name,
          trade_name
        )
      `)
            .order("created_at", { ascending: false });

        if (usersError) {
            console.error("Error consultando usuarios:", usersError);

            return NextResponse.json(
                { error: "No se pudieron cargar los usuarios." },
                { status: 500 }
            );
        }

        // Consultar empresas registradas
        const { data: clients, error: clientsError } = await supabaseAdmin
            .from("clients")
            .select("id, business_name, trade_name")
            .order("business_name", { ascending: true });

        if (clientsError) {
            console.error("Error consultando empresas:", clientsError);

            return NextResponse.json(
                { error: "No se pudieron cargar las empresas." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            users: users ?? [],
            clients: clients ?? [],
        });
    } catch (error) {
        console.error("Error inesperado en GET client-users:", error);

        return NextResponse.json(
            { error: "Ocurrió un error interno del servidor." },
            { status: 500 }
        );
    }
}

// POST: Crear usuario de cliente
export async function POST(request: Request) {
    let createdAuthUserId: string | null = null;

    try {
        // 1. Verificar permisos
        const auth = await verifyAdmin();

        if (!auth.authorized) {
            return NextResponse.json(
                { error: auth.error },
                { status: auth.status }
            );
        }

        // 2. Leer y validar datos
        const body = await request.json();

        const fullName =
            typeof body.full_name === "string"
                ? body.full_name.trim()
                : "";

        const email =
            typeof body.email === "string"
                ? body.email.trim().toLowerCase()
                : "";

        const clientId =
            typeof body.client_id === "string"
                ? body.client_id.trim()
                : "";

        if (!fullName || !email || !clientId) {
            return NextResponse.json(
                { error: "Completa el nombre, correo y empresa." },
                { status: 400 }
            );
        }

        if (fullName.length > 150) {
            return NextResponse.json(
                { error: "El nombre no puede superar los 150 caracteres." },
                { status: 400 }
            );
        }

        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                { error: "Ingresa un correo electrónico válido." },
                { status: 400 }
            );
        }

        // 3. Verificar que la empresa exista
        const { data: client, error: clientError } = await supabaseAdmin
            .from("clients")
            .select("id")
            .eq("id", clientId)
            .maybeSingle();

        if (clientError) {
            console.error("Error verificando empresa:", clientError);

            return NextResponse.json(
                { error: "No se pudo verificar la empresa seleccionada." },
                { status: 500 }
            );
        }

        if (!client) {
            return NextResponse.json(
                { error: "La empresa seleccionada no existe." },
                { status: 404 }
            );
        }

        // 4. Generar contraseña temporal
        const temporaryPassword = generateTemporaryPassword();

        // 5. Crear usuario en Supabase Auth
        const {
            data: authData,
            error: authCreateError,
        } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: temporaryPassword,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
            },
        });

        if (authCreateError || !authData.user) {
            console.error(
                "Error creando usuario en Auth:",
                authCreateError
            );

            return NextResponse.json(
                {
                    error:
                        authCreateError?.message ||
                        "No se pudo crear la cuenta del usuario.",
                },
                { status: 400 }
            );
        }

        createdAuthUserId = authData.user.id;

        // 6. Registrar usuario en client_users
        const { data: newUser, error: insertError } = await supabaseAdmin
            .from("client_users")
            .insert({
                id: createdAuthUserId,
                full_name: fullName,
                email,
                client_id: clientId,
                is_active: true,
            })
            .select(`
        id,
        full_name,
        email,
        client_id,
        is_active,
        created_at,
        clients (
          id,
          business_name,
          trade_name
        )
      `)
            .single();

        if (insertError) {
            console.error(
                "Error registrando usuario en client_users:",
                insertError
            );

            // 7. Revertir creación en Auth si falla el registro
            const { error: rollbackError } =
                await supabaseAdmin.auth.admin.deleteUser(
                    createdAuthUserId
                );

            if (rollbackError) {
                console.error(
                    "Error eliminando usuario de Auth durante rollback:",
                    rollbackError
                );
            }

            createdAuthUserId = null;

            return NextResponse.json(
                {
                    error:
                        "La cuenta de autenticación se creó, pero no se pudo registrar el usuario en la base de datos. Se intentó revertir la creación. Revisa los registros del servidor.",
                },
                { status: 500 }
            );
        }

        // 8. Devolver usuario y contraseña temporal
        return NextResponse.json(
            {
                message: "Usuario de cliente creado correctamente.",
                user: newUser,
                temporaryPassword,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error inesperado en POST client-users:", error);

        // Intentar revertir Auth ante un error inesperado posterior a su creación
        if (createdAuthUserId) {
            const { error: rollbackError } =
                await supabaseAdmin.auth.admin.deleteUser(
                    createdAuthUserId
                );

            if (rollbackError) {
                console.error(
                    "Error durante rollback de usuario:",
                    rollbackError
                );
            }
        }

        return NextResponse.json(
            { error: "Ocurrió un error interno al crear el usuario." },
            { status: 500 }
        );
    }
}

// PUT: Actualizar usuario de cliente
export async function PUT(request: Request) {
    try {
        // 1. Verificar permisos
        const auth = await verifyAdmin();

        if (!auth.authorized) {
            return NextResponse.json(
                { error: auth.error },
                { status: auth.status }
            );
        }

        // 2. Obtener datos
        const body = await request.json();

        const id =
            typeof body.id === "string" ? body.id.trim() : "";

        const fullName =
            typeof body.full_name === "string"
                ? body.full_name.trim()
                : "";

        const email =
            typeof body.email === "string"
                ? body.email.trim().toLowerCase()
                : "";

        const clientId =
            typeof body.client_id === "string"
                ? body.client_id.trim()
                : "";

        const isActive = body.is_active;

        if (!id || !fullName || !email || !clientId) {
            return NextResponse.json(
                { error: "Completa todos los campos obligatorios." },
                { status: 400 }
            );
        }

        if (typeof isActive !== "boolean") {
            return NextResponse.json(
                { error: "El estado del usuario no es válido." },
                { status: 400 }
            );
        }

        if (fullName.length > 150) {
            return NextResponse.json(
                { error: "El nombre no puede superar los 150 caracteres." },
                { status: 400 }
            );
        }

        if (
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return NextResponse.json(
                { error: "Ingresa un correo electrónico válido." },
                { status: 400 }
            );
        }

        // 3. Consultar usuario actual
        const { data: existingUser, error: existingError } =
            await supabaseAdmin
                .from("client_users")
                .select("id, email, full_name")
                .eq("id", id)
                .maybeSingle();

        if (existingError) {
            console.error("Error consultando usuario:", existingError);

            return NextResponse.json(
                { error: "No se pudo consultar el usuario." },
                { status: 500 }
            );
        }

        if (!existingUser) {
            return NextResponse.json(
                { error: "El usuario no existe." },
                { status: 404 }
            );
        }

        // 4. Verificar que la empresa exista
        const { data: client, error: clientError } = await supabaseAdmin
            .from("clients")
            .select("id")
            .eq("id", clientId)
            .maybeSingle();

        if (clientError) {
            console.error("Error verificando empresa:", clientError);

            return NextResponse.json(
                { error: "No se pudo verificar la empresa." },
                { status: 500 }
            );
        }

        if (!client) {
            return NextResponse.json(
                { error: "La empresa seleccionada no existe." },
                { status: 404 }
            );
        }

        // 5. Comprobar que el correo no pertenezca a otro usuario cliente
        const { data: duplicateUser, error: duplicateError } =
            await supabaseAdmin
                .from("client_users")
                .select("id")
                .eq("email", email)
                .neq("id", id)
                .maybeSingle();

        if (duplicateError) {
            console.error("Error verificando correo:", duplicateError);

            return NextResponse.json(
                { error: "No se pudo verificar el correo electrónico." },
                { status: 500 }
            );
        }

        if (duplicateUser) {
            return NextResponse.json(
                { error: "Este correo ya está registrado en otro usuario cliente." },
                { status: 409 }
            );
        }

        // 6. Actualizar correo y nombre en Supabase Auth
        const emailChanged =
            existingUser.email.toLowerCase() !== email;

        const { error: authUpdateError } =
            await supabaseAdmin.auth.admin.updateUserById(id, {
                ...(emailChanged ? { email, email_confirm: true } : {}),
                user_metadata: {
                    full_name: fullName,
                },
            });

        if (authUpdateError) {
            console.error("Error actualizando usuario Auth:", authUpdateError);

            return NextResponse.json(
                { error: authUpdateError.message },
                { status: 400 }
            );
        }

        // 7. Actualizar registro de client_users
        const { data: updatedUser, error: updateError } =
            await supabaseAdmin
                .from("client_users")
                .update({
                    full_name: fullName,
                    email,
                    client_id: clientId,
                    is_active: isActive,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .select(`
          id,
          full_name,
          email,
          client_id,
          is_active,
          created_at,
          clients (
            id,
            business_name,
            trade_name
          )
        `)
                .single();

        if (updateError) {
            console.error("Error actualizando client_users:", updateError);

            // Revertir el correo y nombre en Auth si falla la actualización
            const { error: rollbackError } =
                await supabaseAdmin.auth.admin.updateUserById(id, {
                    ...(emailChanged
                        ? {
                            email: existingUser.email,
                            email_confirm: true,
                        }
                        : {}),
                    user_metadata: {
                        full_name: existingUser.full_name,
                    },
                });

            if (rollbackError) {
                console.error(
                    "Error revirtiendo cambios de Auth:",
                    rollbackError
                );
            }

            return NextResponse.json(
                {
                    error:
                        "No se pudo actualizar el registro del usuario. Se intentó revertir los cambios de autenticación.",
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: "Usuario actualizado correctamente.",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Error inesperado en PUT client-users:", error);

        return NextResponse.json(
            { error: "Ocurrió un error interno al actualizar el usuario." },
            { status: 500 }
        );
    }
}

// DELETE: Eliminar usuario de cliente
export async function DELETE(request: Request) {
    try {
        // 1. Verificar permisos
        const auth = await verifyAdmin();

        if (!auth.authorized) {
            return NextResponse.json(
                { error: auth.error },
                { status: auth.status }
            );
        }

        // 2. Obtener ID
        const body = await request.json();

        const id =
            typeof body.id === "string" ? body.id.trim() : "";

        if (!id) {
            return NextResponse.json(
                { error: "No se proporcionó el usuario que se desea eliminar." },
                { status: 400 }
            );
        }

        // 3. Verificar que el usuario exista
        const { data: existingUser, error: userError } =
            await supabaseAdmin
                .from("client_users")
                .select("id, full_name, email")
                .eq("id", id)
                .maybeSingle();

        if (userError) {
            console.error("Error consultando usuario:", userError);

            return NextResponse.json(
                { error: "No se pudo consultar el usuario." },
                { status: 500 }
            );
        }

        if (!existingUser) {
            return NextResponse.json(
                { error: "El usuario no existe." },
                { status: 404 }
            );
        }

        // 4. Comprobar si el usuario reportó incidencias
        const { count, error: incidentsError } = await supabaseAdmin
            .from("incidents")
            .select("id", { count: "exact", head: true })
            .eq("reported_by", id);

        if (incidentsError) {
            console.error(
                "Error verificando incidencias del usuario:",
                incidentsError
            );

            return NextResponse.json(
                { error: "No se pudo verificar el historial de incidencias." },
                { status: 500 }
            );
        }

        if ((count ?? 0) > 0) {
            return NextResponse.json(
                {
                    error:
                        "No se puede eliminar este usuario porque tiene incidencias registradas. Puedes desactivar su cuenta para conservar el historial.",
                },
                { status: 409 }
            );
        }

        // 5. Eliminar cuenta de Supabase Auth
        const { error: deleteError } =
            await supabaseAdmin.auth.admin.deleteUser(id);

        if (deleteError) {
            console.error("Error eliminando usuario Auth:", deleteError);

            return NextResponse.json(
                {
                    error:
                        "No se pudo eliminar la cuenta. Verifica que no tenga registros relacionados.",
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: "Usuario eliminado correctamente.",
            deletedUser: {
                id: existingUser.id,
                full_name: existingUser.full_name,
                email: existingUser.email,
            },
        });
    } catch (error) {
        console.error("Error inesperado en DELETE client-users:", error);

        return NextResponse.json(
            { error: "Ocurrió un error interno al eliminar el usuario." },
            { status: 500 }
        );
    }
}
