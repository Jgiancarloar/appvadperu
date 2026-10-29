import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

type UserRole = "vad_admin" | "vad_technician" | "client_user";

type CreateUserBody = {
    fullName?: string;
    email?: string;
    role?: UserRole;
    clientId?: string | null;
};

function jsonError(message: string, status: number) {
    return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
    try {
        // 1. Verificar la sesión del administrador.
        const supabase = await createClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return jsonError("Debes iniciar sesión.", 401);
        }

        // 2. Verificar el rol y estado del administrador.
        const { data: currentProfile, error: profileError } =
            await supabase
                .from("profiles")
                .select("role, is_active")
                .eq("id", user.id)
                .maybeSingle();

        if (profileError) {
            console.error("Error verificando administrador:", profileError);
            return jsonError("No se pudieron verificar tus permisos.", 500);
        }

        if (
            !currentProfile ||
            currentProfile.role !== "vad_admin" ||
            currentProfile.is_active !== true
        ) {
            return jsonError(
                "No tienes permisos para crear usuarios.",
                403,
            );
        }

        // 3. Validar los datos recibidos.
        const body = (await request.json()) as CreateUserBody;

        const fullName = body.fullName?.trim().replace(/\s+/g, " ");
        const email = body.email?.trim().toLowerCase();
        const role = body.role;
        const clientId = body.clientId || null;

        if (!fullName || fullName.length > 150) {
            return jsonError(
                "Ingresa un nombre válido de máximo 150 caracteres.",
                400,
            );
        }

        if (
            !email ||
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return jsonError("Ingresa un correo válido.", 400);
        }

        if (
            role !== "vad_admin" &&
            role !== "vad_technician" &&
            role !== "client_user"
        ) {
            return jsonError("El rol seleccionado no es válido.", 400);
        }

        if (role === "client_user" && !clientId) {
            return jsonError(
                "Debes seleccionar una empresa para el usuario de cliente.",
                400,
            );
        }

        if (role !== "client_user" && clientId) {
            return jsonError(
                "Los administradores y técnicos no deben tener una empresa asignada.",
                400,
            );
        }

        // 4. Comprobar que la empresa existe y está activa.
        if (clientId) {
            const { data: client, error: clientError } = await supabase
                .from("clients")
                .select("id, status")
                .eq("id", clientId)
                .maybeSingle();

            if (clientError) {
                console.error("Error verificando cliente:", clientError);
                return jsonError("No se pudo verificar la empresa.", 500);
            }

            if (!client || client.status !== "active") {
                return jsonError(
                    "La empresa seleccionada no existe o está inactiva.",
                    400,
                );
            }
        }

        // 5. Crear la cuenta e invitar al usuario por correo.
        const origin = new URL(request.url).origin;

        const { data: invitation, error: invitationError } =
            await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                data: {
                    full_name: fullName,
                },
                redirectTo: `${origin}/login`,
            });

        if (invitationError || !invitation.user) {
            console.error("Error creando invitación:", invitationError);

            if (
                invitationError?.message.toLowerCase().includes("already") ||
                invitationError?.message.toLowerCase().includes("registered")
            ) {
                return jsonError(
                    "No se pudo invitar al usuario. Comprueba si el correo ya está registrado.",
                    409,
                );
            }

            return jsonError(
                "No se pudo crear la cuenta o enviar la invitación. Verifica la configuración de correo de Supabase.",
                500,
            );
        }

        const userId = invitation.user.id;

        // 6. Crear el perfil asociado a la cuenta.
        const { error: insertError } = await supabaseAdmin
            .from("profiles")
            .insert({
                id: userId,
                full_name: fullName,
                role,
                client_id: clientId,
                is_active: true,
            });

        if (insertError) {
            console.error("Error creando perfil:", insertError);

            // Evitar dejar una cuenta huérfana si falla el perfil.
            const { error: rollbackError } =
                await supabaseAdmin.auth.admin.deleteUser(userId);

            if (rollbackError) {
                console.error(
                    "No se pudo revertir la cuenta creada:",
                    rollbackError,
                );
            }

            return jsonError(
                "La cuenta se creó, pero no se pudo registrar su perfil. Revisa los registros del servidor.",
                500,
            );
        }

        return NextResponse.json(
            {
                message: "Usuario creado e invitación enviada correctamente.",
                userId,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Error inesperado creando usuario:", error);

        return jsonError(
            "Ocurrió un error inesperado al crear el usuario.",
            500,
        );
    }
}