
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserRound,
  Mail,
  Building2,
  ShieldCheck,
  LockKeyhole,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";

type Client = {
  id: string;
  business_name: string | null;
  trade_name: string | null;
};

type CreatedUser = {
  id: string;
  full_name: string;
  email: string;
  client_id: string;
};

export default function NuevoUsuarioPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [clientId, setClientId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  useEffect(() => {
    async function loadClients() {
      try {
        setLoadingClients(true);

        const response = await fetch("/api/admin/client-users", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "No se pudieron cargar las empresas."
          );
        }

        setClients(result.clients ?? []);
      } catch (err) {
        console.error("Error cargando empresas:", err);

        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las empresas."
        );
      } finally {
        setLoadingClients(false);
      }
    }

    loadClients();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setError("");

    if (!fullName.trim() || !email.trim() || !clientId) {
      setError("Completa todos los campos antes de continuar.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/admin/client-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          client_id: clientId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudo crear el usuario."
        );
      }

      setCreatedUser(result.user);
      setTemporaryPassword(result.temporaryPassword);
      setSuccess(true);
    } catch (err) {
      console.error("Error creando usuario:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al crear el usuario."
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyCredentials() {
    if (!createdUser || !temporaryPassword) return;

    const credentials = [
      "ACCESO AL SISTEMA VAD-PERU",
      `Nombre: ${createdUser.full_name}`,
      `Correo: ${createdUser.email}`,
      `Contraseña temporal: ${temporaryPassword}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(credentials);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setError(
        "No se pudo copiar automáticamente. Puedes seleccionar y copiar las credenciales manualmente."
      );
    }
  }

  const selectedClient = clients.find(
    (client) => client.id === clientId
  );

  const companyName = selectedClient
    ? selectedClient.trade_name ||
      selectedClient.business_name ||
      "Empresa"
    : "";

  if (success && createdUser) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-10">
        <div>
          <Link
            href="/admin/usuarios"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Volver a usuarios
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Usuario creado correctamente
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            La cuenta ya está registrada y puede utilizarse para acceder al sistema.
          </p>
        </div>

        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white">
          <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50/60 px-5 py-5 sm:px-6">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={22} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-emerald-900">
                Cuenta creada exitosamente
              </h2>
              <p className="mt-0.5 text-xs text-emerald-700">
                Entrega las credenciales al usuario de la empresa.
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <p className="text-xs font-medium text-slate-400">
                Nombre completo
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {createdUser.full_name}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                Correo electrónico
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {createdUser.email}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                Empresa asignada
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {companyName}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LockKeyhole size={16} className="text-slate-500" />
                  <p className="text-sm font-semibold text-slate-800">
                    Contraseña temporal
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900">
                  {showPassword
                    ? temporaryPassword
                    : "••••••••••••••••••"}
                </code>
              </div>

              <button
                type="button"
                onClick={copyCredentials}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Credenciales copiadas
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copiar todas las credenciales
                  </>
                )}
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                Importante
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                Guarda y entrega esta contraseña al usuario. No podrás volver a consultar esta contraseña desde el sistema. El usuario podrá cambiarla posteriormente mediante el proceso de cambio de contraseña que tenga habilitado su cuenta.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link
                href="/admin/usuarios"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Volver al listado
              </Link>

              <button
                type="button"
                onClick={() => router.push("/admin/usuarios/nuevo")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <UserRound size={16} />
                Registrar otro usuario
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      {/* Encabezado */}
      <div>
        <Link
          href="/admin/usuarios"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Volver a usuarios
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Nuevo usuario de cliente
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Registra una cuenta de acceso y asígnala a una empresa cliente.
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <UserRound size={19} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Información del usuario
              </h2>
              <p className="text-xs text-slate-500">
                Datos personales y de acceso
              </p>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            {/* Nombre */}
            <div className="sm:col-span-2">
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Nombre completo <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <UserRound
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Juan Pérez García"
                  maxLength={150}
                  required
                  disabled={saving}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Correo */}
            <div className="sm:col-span-2">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Correo electrónico <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <Mail
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  maxLength={254}
                  required
                  disabled={saving}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-400">
                Este correo será utilizado para iniciar sesión.
              </p>
            </div>

            {/* Empresa */}
            <div className="sm:col-span-2">
              <label
                htmlFor="clientId"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Empresa cliente <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <Building2
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  disabled={loadingClients || saving}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                >
                  <option value="">
                    {loadingClients
                      ? "Cargando empresas..."
                      : "Selecciona una empresa"}
                  </option>

                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.trade_name ||
                        client.business_name ||
                        "Empresa sin nombre"}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              {clients.length === 0 && !loadingClients && (
                <p className="mt-2 text-xs text-rose-600">
                  No hay empresas disponibles. Registra primero un cliente.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Información de acceso */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck size={19} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Acceso al sistema
              </h2>
              <p className="text-xs text-slate-500">
                Configuración de las credenciales
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <LockKeyhole
                size={19}
                className="mt-0.5 shrink-0 text-blue-600"
              />

              <div>
                <p className="text-sm font-medium text-blue-900">
                  Contraseña temporal automática
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-800">
                  El sistema generará una contraseña segura automáticamente al crear la cuenta. Podrás copiarla y entregársela al usuario.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/admin/usuarios"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={
              saving ||
              loadingClients ||
              clients.length === 0
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <UserRound size={17} />
            )}

            {saving ? "Creando usuario..." : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}
