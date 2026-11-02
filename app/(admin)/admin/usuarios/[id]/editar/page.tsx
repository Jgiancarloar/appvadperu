
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserRound,
  Mail,
  Building2,
  ShieldCheck,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Save,
  ChevronDown,
  UserCheck,
} from "lucide-react";

type Client = {
  id: string;
  business_name: string | null;
  trade_name: string | null;
};

type ClientUser = {
  id: string;
  full_name: string;
  email: string;
  client_id: string;
  is_active: boolean;
  created_at: string;
  clients:
    | {
        id: string;
        business_name: string | null;
        trade_name: string | null;
      }
    | {
        id: string;
        business_name: string | null;
        trade_name: string | null;
      }[]
    | null;
};

export default function EditarUsuarioPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [clients, setClients] = useState<Client[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [clientId, setClientId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/client-users", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudieron cargar los datos."
        );
      }

      const users: ClientUser[] = result.users ?? [];
      const foundUser = users.find((user) => user.id === id);

      if (!foundUser) {
        throw new Error("No se encontró el usuario solicitado.");
      }

      setClients(result.clients ?? []);
      setFullName(foundUser.full_name);
      setEmail(foundUser.email);
      setClientId(foundUser.client_id);
      setIsActive(foundUser.is_active);
    } catch (err) {
      console.error("Error cargando usuario:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los datos del usuario."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadData();
  }, [id, loadData]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");

    if (!fullName.trim() || !email.trim() || !clientId) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/admin/client-users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          client_id: clientId,
          is_active: isActive,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudo actualizar el usuario."
        );
      }

      setSuccess("Los datos del usuario se actualizaron correctamente.");

      // Esperar un momento para mostrar la confirmación
      setTimeout(() => {
        router.push("/admin/usuarios");
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error("Error actualizando usuario:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al actualizar el usuario."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedClient = clients.find(
    (client) => client.id === clientId
  );

  const companyName = selectedClient
    ? selectedClient.trade_name ||
      selectedClient.business_name ||
      "Empresa"
    : "Sin empresa";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Cargando información del usuario...
        </div>
      </div>
    );
  }

  if (error && !fullName) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <div className="flex items-center gap-2 font-semibold text-rose-700">
            <AlertCircle size={19} />
            No se pudo cargar el usuario
          </div>

          <p className="mt-2 text-sm text-rose-600">{error}</p>

          <Link
            href="/admin/usuarios"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
          >
            <ArrowLeft size={16} />
            Volver al listado
          </Link>
        </div>
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
          Editar usuario de cliente
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Actualiza los datos y permisos de acceso del usuario.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Información del usuario */}
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
                  maxLength={150}
                  required
                  disabled={saving}
                  placeholder="Nombre completo"
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
                  maxLength={254}
                  required
                  disabled={saving}
                  placeholder="usuario@empresa.com"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-400">
                Si modificas el correo, también se actualizará en la cuenta de autenticación.
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
                  disabled={saving}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                >
                  <option value="">Selecciona una empresa</option>

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
            </div>
          </div>
        </section>

        {/* Estado de cuenta */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={19} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Estado de la cuenta
              </h2>
              <p className="text-xs text-slate-500">
                Controla el acceso del usuario al sistema
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={saving}
                className="mt-1 size-4 rounded border-slate-300 accent-slate-900"
              />

              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Usuario activo
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {isActive
                    ? "La cuenta figura como activa. El acceso efectivo también debe validarse en el servidor."
                    : "La cuenta quedará marcada como inactiva. El usuario no debería poder acceder al sistema."}
                </span>
              </span>
            </label>
          </div>
        </section>

        {/* Resumen */}
        <section className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5">
          <p className="text-xs font-medium text-slate-400">
            Empresa asignada actualmente
          </p>

          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800">
            <Building2 size={17} className="text-slate-500" />
            {companyName}
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <UserCheck size={15} />
            La contraseña actual del usuario no será modificada.
          </div>
        </section>

        {/* Mensajes */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            {success}
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
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Save size={17} />
            )}

            {saving ? "Guardando cambios..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
