
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "../../../../../lib/supabase/client";

type UserRole = "vad_admin" | "vad_technician" | "client_user";

type ClientOption = {
  id: string;
  business_name: string;
};

type FormData = {
  fullName: string;
  email: string;
  role: UserRole;
  clientId: string;
};

const initialForm: FormData = {
  fullName: "",
  email: "",
  role: "client_user",
  clientId: "",
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
  {
    value: "client_user",
    label: "Usuario de cliente",
    description: "Accede a los activos e incidentes de su empresa.",
  },
];

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<FormData>(initialForm);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      setLoadingClients(true);

      const { data, error } = await supabase
        .from("clients")
        .select("id, business_name")
        .eq("status", "active")
        .order("business_name", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Error cargando clientes:", error);
        setError("No se pudieron cargar las empresas. Intenta nuevamente.");
      } else {
        setClients(data ?? []);
      }

      setLoadingClients(false);
    }

    void loadClients();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
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

    if (form.role === "client_user" && !form.clientId) {
      setError("Selecciona la empresa a la que pertenece el usuario.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          role: form.role,
          clientId: form.role === "client_user" ? form.clientId : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "No se pudo crear el usuario.");
        return;
      }

      setSuccess(result.message ?? "Usuario creado correctamente.");
      setForm({ ...initialForm });

      router.refresh();

      window.setTimeout(() => {
        router.push("/admin/usuarios");
      }, 1200);
    } catch (error) {
      console.error("Error enviando formulario:", error);
      setError("No se pudo conectar con el servidor. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  const selectedRole = roleOptions.find(
    (option) => option.value === form.role,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <div className="flex items-start gap-3">
        <Link
          href="/admin/usuarios"
          aria-label="Volver a usuarios"
          className="mt-1 rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
        </Link>

        <div>
          <p className="mb-1 text-sm text-gray-500">Administración</p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Nuevo usuario
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Crea una cuenta y define los permisos de acceso al sistema.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                Enviaremos una invitación a esta dirección.
              </p>
            </div>
          </div>
        </section>

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
                  : option.value === "vad_technician"
                    ? Wrench
                    : Building2;

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
                    onChange={() => {
                      updateField("role", option.value);
                      if (option.value !== "client_user") {
                        updateField("clientId", "");
                      }
                    }}
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

          {form.role === "client_user" && (
            <div className="border-t border-gray-100 bg-gray-50/60 p-5 sm:px-6 sm:py-5">
              <label
                htmlFor="clientId"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Empresa asignada <span className="text-red-500">*</span>
              </label>

              <select
                id="clientId"
                required
                value={form.clientId}
                onChange={(event) =>
                  updateField("clientId", event.target.value)
                }
                disabled={loadingClients || clients.length === 0}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-800 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">
                  {loadingClients
                    ? "Cargando empresas..."
                    : clients.length === 0
                      ? "No hay empresas activas"
                      : "Selecciona una empresa"}
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.business_name}
                  </option>
                ))}
              </select>

              {!loadingClients && clients.length === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Registra o activa una empresa en el módulo Clientes antes de
                  crear este usuario.
                </p>
              )}
            </div>
          )}
        </section>

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
              . Los permisos efectivos también dependen de las políticas de
              seguridad de Supabase.
            </p>
          </div>
        )}

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

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/admin/usuarios"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={
              saving ||
              (form.role === "client_user" &&
                (loadingClients || clients.length === 0))
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
                Creando usuario...
              </>
            ) : (
              <>
                <Mail size={17} />
                Crear e invitar usuario
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
