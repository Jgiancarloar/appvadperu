
"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "../../../../lib/supabase/client";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  LoaderCircle,
  Plus,
  Search,
  ShieldAlert,
  Wrench,
  X,
} from "lucide-react";

type UserRole = "vad_admin" | "vad_technician";

type IncidentStatus = "open" | "in_progress" | "resolved" | "closed";

type IncidentPriority = "low" | "medium" | "high" | "critical";

type Client = {
  business_name: string;
  trade_name: string | null;
};

type Asset = {
  id: string;
  asset_code: string;
  name: string;
  client_id: string;
  clients: Client | null;
};

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
  assets: Asset | null;
};

const statuses: {
  value: IncidentStatus;
  label: string;
}[] = [
  { value: "open", label: "Abierta" },
  { value: "in_progress", label: "En proceso" },
  { value: "resolved", label: "Resuelta" },
  { value: "closed", label: "Cerrada" },
];

const priorities: {
  value: IncidentPriority;
  label: string;
}[] = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

const statusConfig: Record<
  IncidentStatus,
  { label: string; className: string; dot: string }
> = {
  open: {
    label: "Abierta",
    className: "bg-blue-50 text-blue-700 ring-blue-600/20",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "En proceso",
    className: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
  resolved: {
    label: "Resuelta",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  closed: {
    label: "Cerrada",
    className: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-400",
  },
};

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

export default function IncidentsPage() {
  const [supabase] = useState(() => createClient());

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assetId, setAssetId] = useState("");
  const [priority, setPriority] =
    useState<IncidentPriority>("medium");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = role === "vad_admin";

  // ==========================================
  // ERRORES
  // ==========================================

  function getErrorMessage(err: unknown) {
    if (typeof err === "object" && err !== null) {
      const supabaseError = err as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };

      console.error("Detalle del error:", supabaseError);

      const parts = [
        supabaseError.message,
        supabaseError.details,
        supabaseError.hint
          ? `Sugerencia: ${supabaseError.hint}`
          : null,
        supabaseError.code
          ? `Código: ${supabaseError.code}`
          : null,
      ].filter(Boolean);

      if (parts.length > 0) return parts.join(" ");
    }

    if (err instanceof Error) return err.message;

    return "Ocurrió un error inesperado.";
  }

  // ==========================================
  // CARGAR INFORMACIÓN
  // ==========================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [sessionResult, incidentsResult, assetsResult] =
        await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),

          supabase
            .from("incidents")
            .select(`
              id,
              asset_id,
              reported_by,
              title,
              description,
              priority,
              status,
              resolution_notes,
              resolved_at,
              created_at,
              updated_at,
              assets (
                id,
                asset_code,
                name,
                client_id,
                clients (
                  business_name,
                  trade_name
                )
              )
            `)
            .order("created_at", { ascending: false }),

          supabase
            .from("assets")
            .select(`
              id,
              asset_code,
              name,
              client_id,
              clients (
                business_name,
                trade_name
              )
            `)
            .order("asset_code", { ascending: true }),
        ]);

      const sessionData = await sessionResult.json();

      if (!sessionResult.ok) {
        throw new Error(
          sessionData.error || "No se pudo verificar tu sesión."
        );
      }

      const userRole = sessionData.user?.role;

      if (
        userRole !== "vad_admin" &&
        userRole !== "vad_technician"
      ) {
        throw new Error(
          "No tienes permisos para acceder a este módulo."
        );
      }

      if (incidentsResult.error) throw incidentsResult.error;
      if (assetsResult.error) throw assetsResult.error;

      setRole(userRole);
      setIncidents(
        (incidentsResult.data || []) as unknown as Incident[]
      );
      setAssets((assetsResult.data || []) as unknown as Asset[]);
    } catch (err) {
      console.error("Error cargando incidencias:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ==========================================
  // FILTRADO
  // ==========================================

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const asset = incident.assets;

      const clientName =
        asset?.clients?.trade_name ||
        asset?.clients?.business_name ||
        "";

      const matchesSearch =
        !query ||
        [
          incident.title,
          incident.description,
          asset?.asset_code,
          asset?.name,
          clientName,
        ].some((value) => value?.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" ||
        incident.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        incident.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [incidents, search, statusFilter, priorityFilter]);

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  const stats = useMemo(
    () => ({
      total: incidents.length,
      open: incidents.filter((item) => item.status === "open").length,
      inProgress: incidents.filter(
        (item) => item.status === "in_progress"
      ).length,
      critical: incidents.filter(
        (item) =>
          item.priority === "critical" &&
          item.status !== "resolved" &&
          item.status !== "closed"
      ).length,
    }),
    [incidents]
  );

  // ==========================================
  // FORMULARIO
  // ==========================================

  function resetForm() {
    setTitle("");
    setDescription("");
    setAssetId("");
    setPriority("medium");
    setError("");
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    resetForm();
  }

  function openModal() {
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  // ==========================================
  // REGISTRAR INCIDENCIA
  // ==========================================

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!assetId) {
      setError("Selecciona el activo relacionado con la incidencia.");
      return;
    }

    if (!title.trim()) {
      setError("Ingresa el título de la incidencia.");
      return;
    }

    if (!description.trim()) {
      setError("Describe el problema o situación reportada.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Tu sesión ha expirado. Inicia sesión nuevamente."
        );
      }

      const { error: insertError } = await supabase
        .from("incidents")
        .insert({
          asset_id: assetId,
          reported_by: user.id,
          title: title.trim(),
          description: description.trim(),
          priority,
          status: "open",
        });

      if (insertError) throw insertError;

      setModalOpen(false);
      resetForm();
      setSuccess("Incidencia registrada correctamente.");

      await loadData();
    } catch (err) {
      console.error("Error registrando incidencia:", err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  function formatDate(date: string) {
    return new Date(date).toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getClientName(asset: Asset | null) {
    return (
      asset?.clients?.trade_name ||
      asset?.clients?.business_name ||
      "Cliente no disponible"
    );
  }

  // ==========================================
  // CARGANDO
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle size={18} className="animate-spin" />
          Cargando incidencias...
        </div>
      </div>
    );
  }

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="space-y-7 pb-8">

      {/* ENCABEZADO */}
      <section>
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Administración</span>
          <ChevronRight size={13} className="text-slate-300" />
          <span className="text-slate-700">Incidencias</span>
        </div>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Incidencias
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Registra y realiza seguimiento de los problemas reportados en los activos.
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus size={17} />
            Reportar incidencia
          </button>
        </div>
      </section>

      {/* MENSAJES */}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          <p>{success}</p>
          <button
            type="button"
            onClick={() => setSuccess("")}
            className="ml-auto"
            aria-label="Cerrar mensaje"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <p className="break-words">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto"
            aria-label="Cerrar mensaje"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* TARJETAS DE RESUMEN */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total de incidencias"
          value={stats.total}
          icon={<FileText size={20} />}
          color="bg-slate-100 text-slate-700"
        />

        <SummaryCard
          title="Incidencias abiertas"
          value={stats.open}
          icon={<AlertCircle size={20} />}
          color="bg-blue-50 text-blue-700"
        />

        <SummaryCard
          title="En proceso"
          value={stats.inProgress}
          icon={<Wrench size={20} />}
          color="bg-amber-50 text-amber-700"
        />

        <SummaryCard
          title="Críticas pendientes"
          value={stats.critical}
          icon={<ShieldAlert size={20} />}
          color="bg-rose-50 text-rose-700"
        />
      </section>

      {/* LISTADO */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">

        {/* FILTROS */}
        <div className="space-y-4 border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">
              Buscar y filtrar incidencias
            </h2>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título, activo, código o cliente..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="all">Todos los estados</option>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="all">Todas las prioridades</option>
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  Prioridad {priority.label.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CONTADOR */}
        <div className="border-b border-slate-100 px-5 py-3 sm:px-6">
          <p className="text-xs text-slate-500">
            Mostrando{" "}
            <span className="font-semibold text-slate-800">
              {filteredIncidents.length}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-800">
              {incidents.length}
            </span>{" "}
            incidencias
          </p>
        </div>

        {/* SIN RESULTADOS */}
        {filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <AlertTriangle size={24} />
            </div>

            <p className="text-sm font-medium text-slate-800">
              {incidents.length === 0
                ? "Todavía no hay incidencias registradas"
                : "No se encontraron incidencias"}
            </p>

            <p className="mt-1 max-w-md text-xs text-slate-500">
              {incidents.length === 0
                ? "Las incidencias reportadas en los activos aparecerán aquí."
                : "Prueba modificando los filtros o el término de búsqueda."}
            </p>
          </div>
        ) : (
          <>
            {/* TABLA DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50/80">
                  <tr className="text-xs font-semibold text-slate-500">
                    <th className="px-6 py-3">Incidencia</th>
                    <th className="px-4 py-3">Activo</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Prioridad</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-6 py-3 text-right">Detalle</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredIncidents.map((incident) => {
                    const status = statusConfig[incident.status];
                    const priorityStyle = priorityConfig[incident.priority];

                    return (
                      <tr
                        key={incident.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="max-w-[250px] px-6 py-4">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {incident.title}
                          </p>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                            {incident.description}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-700">
                              {incident.assets?.asset_code || "—"}
                            </p>
                            <p className="mt-0.5 max-w-[150px] truncate text-xs text-slate-500">
                              {incident.assets?.name || "Activo no disponible"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex max-w-[160px] items-center gap-2 text-xs text-slate-600">
                            <Building2 size={14} className="shrink-0 text-slate-400" />
                            <span className="truncate">
                              {getClientName(incident.assets)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyle.className}`}>
                            {priorityStyle.label}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.className}`}>
                            <span className={`size-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                          {formatDate(incident.created_at)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/admin/incidencias/${incident.id}`}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Ver detalle
                            <ArrowUpRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TARJETAS MOBILE */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredIncidents.map((incident) => {
                const status = statusConfig[incident.status];
                const priorityStyle = priorityConfig[incident.priority];

                return (
                  <div key={incident.id} className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {incident.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {incident.description}
                        </p>
                      </div>

                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${priorityStyle.className}`}>
                        {priorityStyle.label}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500">
                      <p>
                        <span className="font-medium text-slate-700">Activo:</span>{" "}
                        {incident.assets?.asset_code || "—"} ·{" "}
                        {incident.assets?.name || "No disponible"}
                      </p>

                      <p>
                        <span className="font-medium text-slate-700">Cliente:</span>{" "}
                        {getClientName(incident.assets)}
                      </p>

                      <p>{formatDate(incident.created_at)}</p>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.className}`}>
                        <span className={`size-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>

                      <Link
                        href={`/admin/incidencias/${incident.id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700"
                      >
                        Ver detalle
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* MODAL REGISTRAR INCIDENCIA */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="incident-modal-title"
            className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle size={19} />
                </div>

                <div>
                  <h2
                    id="incident-modal-title"
                    className="text-base font-semibold text-slate-900"
                  >
                    Reportar incidencia
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Registra un problema relacionado con un activo.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Cerrar modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5 sm:p-6">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <p className="break-words">{error}</p>
                  </div>
                )}

                {/* ACTIVO */}
                <div>
                  <label
                    htmlFor="incident-asset"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Activo relacionado{" "}
                    <span className="text-rose-600">*</span>
                  </label>

                  <select
                    id="incident-asset"
                    value={assetId}
                    onChange={(event) => setAssetId(event.target.value)}
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                  >
                    <option value="">Seleccionar activo</option>

                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.asset_code} — {asset.name}
                      </option>
                    ))}
                  </select>

                  {assets.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      No hay activos disponibles para registrar incidencias.
                    </p>
                  )}
                </div>

                {/* TÍTULO */}
                <div>
                  <label
                    htmlFor="incident-title"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Título de la incidencia{" "}
                    <span className="text-rose-600">*</span>
                  </label>

                  <input
                    id="incident-title"
                    type="text"
                    maxLength={150}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ej. Puerta no cierra correctamente"
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                  />
                </div>

                {/* DESCRIPCIÓN */}
                <div>
                  <label
                    htmlFor="incident-description"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Descripción del problema{" "}
                    <span className="text-rose-600">*</span>
                  </label>

                  <textarea
                    id="incident-description"
                    rows={4}
                    maxLength={3000}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe qué sucede, cuándo se presenta y cualquier detalle relevante..."
                    disabled={saving}
                    className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                  />
                </div>

                {/* PRIORIDAD */}
                <div>
                  <label
                    htmlFor="incident-priority"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Prioridad
                  </label>

                  <select
                    id="incident-priority"
                    value={priority}
                    onChange={(event) =>
                      setPriority(event.target.value as IncidentPriority)
                    }
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                  >
                    {priorities.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <p className="mt-1.5 text-xs text-slate-400">
                    La incidencia se registrará inicialmente como abierta.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving || assets.length === 0}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Registrar incidencia
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// TARJETA DE RESUMEN
// ==========================================

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className={`flex size-10 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>

        <span className="text-xs text-slate-400">Registradas</span>
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">{title}</p>
    </article>
  );
}
