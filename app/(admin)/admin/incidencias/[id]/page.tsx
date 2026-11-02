
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  ShieldCheck,
  Wrench,
  LoaderCircle,
  Save,
  ClipboardList,
  Building2,
  UserRound,
} from "lucide-react";
import { createClient } from "../../../../../lib/supabase/client";

type Role = "vad_admin" | "vad_technician";

type IncidentStatus = "open" | "in_progress" | "resolved" | "closed";
type IncidentPriority = "low" | "medium" | "high" | "critical";

type Incident = {
  id: string;
  asset_id: string;
  reported_by: string;
  title: string;
  description: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  assets: {
    id: string;
    asset_code: string;
    name: string;
    location: string | null;
    client_id: string;
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
  } | null;
};

const statusOptions: {
  value: IncidentStatus;
  label: string;
}[] = [
  { value: "open", label: "Abierta" },
  { value: "in_progress", label: "En proceso" },
  { value: "resolved", label: "Resuelta" },
  { value: "closed", label: "Cerrada" },
];

const priorityConfig: Record<
  IncidentPriority,
  { label: string; className: string }
> = {
  low: {
    label: "Baja",
    className: "bg-slate-100 text-slate-600",
  },
  medium: {
    label: "Media",
    className: "bg-blue-50 text-blue-700",
  },
  high: {
    label: "Alta",
    className: "bg-orange-50 text-orange-700",
  },
  critical: {
    label: "Crítica",
    className: "bg-rose-50 text-rose-700",
  },
};

const statusConfig: Record<
  IncidentStatus,
  { label: string; className: string; icon: typeof Clock3 }
> = {
  open: {
    label: "Abierta",
    className: "bg-rose-50 text-rose-700",
    icon: AlertCircle,
  },
  in_progress: {
    label: "En proceso",
    className: "bg-amber-50 text-amber-700",
    icon: Clock3,
  },
  resolved: {
    label: "Resuelta",
    className: "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  closed: {
    label: "Cerrada",
    className: "bg-slate-100 text-slate-600",
    icon: ShieldCheck,
  },
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function getClientName(asset: Incident["assets"]) {
  if (!asset?.clients) return "Sin cliente";

  const client = Array.isArray(asset.clients)
    ? asset.clients[0]
    : asset.clients;

  return client?.trade_name || client?.business_name || "Sin nombre";
}

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [supabase] = useState(() => createClient());

  const [incident, setIncident] = useState<Incident | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newStatus, setNewStatus] = useState<IncidentStatus>("open");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const isAdmin = role === "vad_admin";

  const loadIncident = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
      });

      if (!sessionResponse.ok) {
        router.replace("/login");
        return;
      }

      const sessionData = await sessionResponse.json();
      const currentRole = sessionData.user?.role as Role | undefined;
      const currentUserId = sessionData.user?.id as string | undefined;

      if (
        !currentRole ||
        !["vad_admin", "vad_technician"].includes(currentRole)
      ) {
        router.replace("/admin");
        return;
      }

      setRole(currentRole);
      setUserId(currentUserId ?? null);

      const { data, error: queryError } = await supabase
        .from("incidents")
        .select(`
          *,
          assets (
            id,
            asset_code,
            name,
            location,
            client_id,
            clients (
              id,
              business_name,
              trade_name
            )
          )
        `)
        .eq("id", id)
        .single();

      if (queryError) throw queryError;

      const incidentData = data as unknown as Incident;

      setIncident(incidentData);
      setNewStatus(incidentData.status);
      setResolutionNotes(incidentData.resolution_notes ?? "");
    } catch (err) {
      console.error("Error cargando incidencia:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la incidencia."
      );
    } finally {
      setLoading(false);
    }
  }, [id, router, supabase]);

  useEffect(() => {
    if (id) loadIncident();
  }, [id, loadIncident]);

  async function handleSave() {
    if (!incident || !isAdmin) return;

    if (
      (newStatus === "resolved" || newStatus === "closed") &&
      !resolutionNotes.trim()
    ) {
      setError(
        "Registra las notas de resolución antes de marcar la incidencia como resuelta o cerrada."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const now = new Date().toISOString();
      const isFinished =
        newStatus === "resolved" || newStatus === "closed";

      const { error: updateError } = await supabase
        .from("incidents")
        .update({
          status: newStatus,
          resolution_notes: resolutionNotes.trim() || null,
          resolved_at: isFinished ? incident.resolved_at ?? now : null,
          updated_at: now,
        })
        .eq("id", incident.id);

      if (updateError) throw updateError;

      setIncident((current) =>
        current
          ? {
              ...current,
              status: newStatus,
              resolution_notes: resolutionNotes.trim() || null,
              resolved_at: isFinished
                ? current.resolved_at ?? now
                : null,
              updated_at: now,
            }
          : current
      );

      setSuccess("La incidencia se actualizó correctamente.");
    } catch (err) {
      console.error("Error actualizando incidencia:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la incidencia."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Cargando incidencia...
        </div>
      </div>
    );
  }

  if (error && !incident) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <div className="flex items-center gap-2 font-semibold text-rose-700">
            <AlertCircle className="h-5 w-5" />
            No se pudo cargar la incidencia
          </div>
          <p className="mt-2 text-sm text-rose-600">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!incident) return null;

  const status = statusConfig[incident.status];
  const priority = priorityConfig[incident.priority];
  const StatusIcon = status.icon;
  const asset = incident.assets;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* Encabezado */}
      <div>
        <Link
          href="/admin/incidencias"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a incidencias
        </Link>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Detalle de incidencia
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {incident.title}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Reportada el {formatDate(incident.created_at)}
            </p>
          </div>

          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-semibold ${priority.className}`}
          >
            Prioridad {priority.label.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-5 lg:col-span-2">
          {/* Descripción */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Descripción del problema
                </h2>
                <p className="text-xs text-slate-500">
                  Información proporcionada al reportar la incidencia
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {incident.description}
              </p>
            </div>
          </section>

          {/* Activo relacionado */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Activo relacionado
                </h2>
                <p className="text-xs text-slate-500">
                  Equipo donde se reportó el problema
                </p>
              </div>
            </div>

            {asset ? (
              <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Código del activo
                  </p>
                  <Link
                    href={`/admin/activos/${asset.id}`}
                    className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:underline"
                  >
                    {asset.asset_code}
                    <ArrowLeft className="h-3 w-3 rotate-180" />
                  </Link>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Nombre del activo
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {asset.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Cliente
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    {getClientName(asset)}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Ubicación
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {asset.location || "No especificada"}
                  </div>
                </div>
              </div>
            ) : (
              <p className="p-6 text-sm text-slate-500">
                No se encontró información del activo relacionado.
              </p>
            )}
          </section>

          {/* Resolución */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Resolución de la incidencia
                </h2>
                <p className="text-xs text-slate-500">
                  Notas y acciones realizadas para solucionar el problema
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              {isAdmin ? (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-600">
                      Estado de la incidencia
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) =>
                        setNewStatus(e.target.value as IncidentStatus)
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-600">
                      Notas de resolución
                    </label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={5}
                      placeholder="Describe las acciones realizadas, repuestos utilizados o solución aplicada..."
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-400">
                      Los cambios se guardarán al presionar el botón.
                    </p>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {incident.resolution_notes ? (
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                      {incident.resolution_notes}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Todavía no se han registrado notas de resolución.
                    </p>
                  )}
                </div>
              )}

              {incident.resolved_at && (
                <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Finalizada el {formatDate(incident.resolved_at)}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Columna lateral */}
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Información del reporte
              </h2>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Identificador
                </p>
                <p className="mt-1 break-all font-mono text-xs text-slate-700">
                  {incident.id}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">
                  Reportado por
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <span>
                    {incident.reported_by === userId
                      ? "Tú"
                      : `Usuario (${incident.reported_by.slice(0, 8)}...)`}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">
                  Fecha de reporte
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {formatDate(incident.created_at)}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">
                  Última actualización
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDate(incident.updated_at)}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-400">
                  Prioridad
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priority.className}`}
                >
                  {priority.label}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              Permisos de acceso
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {isAdmin
                ? "Puedes actualizar el estado de esta incidencia y registrar las notas de resolución."
                : "Tu perfil tiene acceso de consulta. Solo un administrador puede modificar el estado y registrar la resolución."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
