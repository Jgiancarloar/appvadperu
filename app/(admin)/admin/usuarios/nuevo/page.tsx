
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";

type UserRole = "vad_admin" | "vad_technician";

type FormData = {
  fullName: string;
  email: string;
  role: UserRole;
};

const initialForm: FormData = {
  fullName: "",
  email: "",
  role: "vad_technician",
};

const roleOptions: {
  value: UserRole;
  label: string;
  description: string;
}[] = [
  {
    value: "vad_admin",
    label: "Administrador",
    description: "Acceso completo a la administración del sistema.",
  },
  {
    value: "vad_technician",
    label: "Técnico",
    description: "Consulta activos y documentos, y gestiona incidentes.",
  },
];

export default function NuevoUsuarioPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const fullName = form.fullName.trim().replace(/\s+/g, " ");
    const email = form.email.trim().toLowerCase();

    if (!fullName) {
      setError("Ingresa el nombre completo del usuario.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/system-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          role: form.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "No se pudo enviar la invitación.");
        return;
      }

      setSuccess(
        result.message ?? "Invitación enviada correctamente."
      );

      setForm({ ...initialForm });

      window.setTimeout(() => {
        router.push("/admin/administracion");
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error("Error enviando invitación:", error);

      setError(
        "No se pudo conectar con el servidor. Intenta nuevamente."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedRole = roleOptions.find(
    (option) => option.value === form.role
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <Link
          href="/admin/administracion"
          aria-label="Volver a administración"
          className="mt-1 rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
        </Link>

        <div>
          <p className="mb-1 text-sm text-gray-500">
            Administración
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Nuevo usuario
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Invita a un nuevo integrante al equipo de VAD-PERU.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos personales */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <UserRound size={19} />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900">
                  Datos personales
                </h2>

                <p className="mt-0.5 text-sm text-gray-500">
                  Información básica para identificar al usuario.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div className="space-y-2 sm:col-span-2">
              <label
                htmlFor="fullName"
                className="text-sm font-medium text-gray-700"
              >
                Nombre completo <span className="text-red-500">*</span>
              </label>

              <input
                id="fullName"
                type="text"
                autoComplete="name"
                maxLength={150}
                required
                value={form.fullName}
                onChange={(event) =>
                  updateField("fullName", event.target.value)
                }
                placeholder="Ej. Juan Pérez García"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Correo electrónico <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <Mail
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={form.email}
                  onChange={(event) =>
                    updateField("email", event.target.value)
                  }
                  placeholder="usuario@empresa.com"
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                />
              </div>

              <p className="text-xs text-gray-500">
                Enviaremos una invitación a esta dirección para que el
                usuario configure su propia contraseña.
              </p>
            </div>
          </div>
        </section>

        {/* Roles y permisos */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <ShieldCheck size={19} />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900">
                  Rol y permisos
                </h2>

                <p className="mt-0.5 text-sm text-gray-500">
                  Selecciona el tipo de acceso que tendrá la cuenta.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-5 sm:p-6">
            {roleOptions.map((option) => {
              const Icon =
                option.value === "vad_admin"
                  ? ShieldCheck
                  : Wrench;

              const selected = form.role === option.value;

              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    selected
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selected}
                    onChange={() => updateField("role", option.value)}
                    className="mt-1 accent-gray-900"
                  />

                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                      selected
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Icon size={19} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">
                      {option.label}
                    </span>

                    <span className="mt-1 block text-sm leading-5 text-gray-500">
                      {option.description}
                    </span>
                  </span>

                  {selected && (
                    <CheckCircle2
                      size={18}
                      className="mt-1 shrink-0 text-gray-900"
                    />
                  )}
                </label>
              );
            })}
          </div>
        </section>

        {/* Información del rol */}
        {selectedRole && (
          <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-gray-600"
            />

            <p className="text-sm leading-6 text-gray-600">
              El usuario se registrará como{" "}
              <strong className="font-medium text-gray-900">
                {selectedRole.label}
              </strong>
              . Los permisos efectivos también dependen de las políticas
              de seguridad de Supabase.
            </p>
          </div>
        )}

        {/* Mensajes */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {success}
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/admin/administracion"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
                Enviando invitación...
              </>
            ) : (
              <>
                <Mail size={17} />
                Enviar invitación
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
