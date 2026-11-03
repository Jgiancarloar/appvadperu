
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../../lib/supabase/client";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  LayoutDashboard,
  Package,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";

type Asset = {
  id: string;
  status: "active" | "inactive" | "maintenance";
};

type Incident = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  assets:
    | {
        name: string;
        asset_code: string;
      }
    | null;
};

const priorityConfig = {
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
    className: "bg-amber-50 text-amber-700",
  },
  critical: {
    label: "Crítica",
    className: "bg-rose-50 text-rose-700",
  },
};

const incidentStatusConfig = {
  open: {
    label: "Abierta",
    className: "bg-rose-50 text-rose-700",
  },
  in_progress: {
    label: "En proceso",
    className: "bg-amber-50 text-amber-700",
  },
  resolved: {
    label: "Resuelta",
    className: "bg-emerald-50 text-emerald-700",
  },
  closed: {
    label: "Cerrada",
    className: "bg-slate-100 text-slate-600",
  },
};

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClientDashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [totalAssets, setTotalAssets] = useState(0);
  const [activeAssets, setActiveAssets] = useState(0);
  const [maintenanceAssets, setMaintenanceAssets] = useState(0);
  const [inactiveAssets, setInactiveAssets] = useState(0);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [pendingIncidents, setPendingIncidents] = useState(0);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        assetsResult,
        documentsResult,
        pendingIncidentsResult,
        recentIncidentsResult,
      ] = await Promise.all([
        supabase
          .from("assets")
          .select("id, status"),

        supabase
          .from("asset_documents")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]),

        supabase
          .from("incidents")
          .select(`
            id,
            title,
            priority,
            status,
            created_at,
            assets (
              name,
              asset_code
            )
          `)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (assetsResult.error) throw assetsResult.error;
      if (documentsResult.error) throw documentsResult.error;
      if (pendingIncidentsResult.error) throw pendingIncidentsResult.error;
      if (recentIncidentsResult.error) throw recentIncidentsResult.error;

      const assets = (assetsResult.data || []) as Asset[];

      setTotalAssets(assets.length);
      setActiveAssets(
        assets.filter((asset) => asset.status === "active").length,
      );
      setMaintenanceAssets(
        assets.filter((asset) => asset.status === "maintenance").length,
      );
      setInactiveAssets(
        assets.filter((asset) => asset.status === "inactive").length,
      );

      setTotalDocuments(documentsResult.count || 0);
      setPendingIncidents(pendingIncidentsResult.count || 0);

      setRecentIncidents(
        (recentIncidentsResult.data || []) as unknown as Incident[],
      );
    } catch (err) {
      console.error("Error cargando dashboard del cliente:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la información del dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const StatCard = ({
    title,
    value,
    description,
    icon: Icon,
    color,
    href,
  }: {
    title: string;
    value: number | string;
    description: string;
    icon: React.ElementType;
    color: string;
    href?: string;
  }) => {
    const content = (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
        <div className="flex items-center justify-between">
          <div
            className={`flex size-11 items-center justify-center rounded-xl ${color}`}
          >
            <Icon size={21} />
          </div>

          {href && (
            <ArrowRight
              size={17}
              className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600"
            />
          )}
        </div>

        <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>

        <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          {value}
        </p>

        <p className="mt-2 text-xs text-slate-400">{description}</p>
      </div>
    );

    if (href) {
      return (
        <Link href={href} className="group block">
          {content}
        </Link>
      );
    }

    return content;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div className="h-8 w-64 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-80 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>

        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white px-6 py-14 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <AlertCircle size={23} />
        </div>

        <h2 className="font-semibold text-slate-900">
          No se pudo cargar el dashboard
        </h2>

        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          {error}
        </p>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <RefreshCw size={15} />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-slate-500">
            PORTAL DE CLIENTES
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Bienvenido a tu espacio
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Aquí puedes consultar tus activos, documentación e incidencias.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw size={15} />
          Actualizar
        </button>
      </div>

      {/* Resumen */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Resumen de tus activos
          </h2>

          <Link
            href="/cliente/activos"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-900"
          >
            Ver todos
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total de activos"
            value={totalAssets}
            description="Activos registrados para tu empresa."
            icon={Package}
            color="bg-blue-50 text-blue-700"
            href="/cliente/activos"
          />

          <StatCard
            title="Activos operativos"
            value={activeAssets}
            description="Activos que se encuentran activos."
            icon={CheckCircle2}
            color="bg-emerald-50 text-emerald-700"
            href="/cliente/activos"
          />

          <StatCard
            title="En mantenimiento"
            value={maintenanceAssets}
            description="Activos con estado de mantenimiento."
            icon={Wrench}
            color="bg-amber-50 text-amber-700"
            href="/cliente/activos"
          />

          <StatCard
            title="Activos inactivos"
            value={inactiveAssets}
            description="Activos que actualmente están inactivos."
            icon={AlertCircle}
            color="bg-slate-100 text-slate-600"
            href="/cliente/activos"
          />

          <StatCard
            title="Documentos disponibles"
            value={totalDocuments}
            description="Archivos asociados a tus activos."
            icon={FileText}
            color="bg-violet-50 text-violet-700"
            href="/cliente/activos"
          />

          <StatCard
            title="Incidencias pendientes"
            value={pendingIncidents}
            description="Incidencias abiertas o en proceso."
            icon={AlertCircle}
            color="bg-rose-50 text-rose-700"
          />
        </div>
      </section>

      {/* Incidencias recientes */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Incidencias recientes
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Últimos reportes registrados sobre tus activos.
            </p>
          </div>

          <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <AlertCircle size={19} />
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {recentIncidents.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <CheckCircle2 size={23} />
              </div>

              <p className="text-sm font-medium text-slate-800">
                No hay incidencias registradas
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Tus activos no tienen reportes registrados hasta el momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentIncidents.map((incident) => {
                const priority = priorityConfig[incident.priority];
                const status = incidentStatusConfig[incident.status];

                return (
                  <div
                    key={incident.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800">
                        {incident.title}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {incident.assets?.name || "Activo no disponible"}
                        {incident.assets?.asset_code
                          ? ` · ${incident.assets.asset_code}`
                          : ""}
                      </p>

                      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                        <CalendarDays size={13} />
                        {formatDateTime(incident.created_at)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${priority.className}`}
                      >
                        {priority.label}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Accesos rápidos */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Accesos rápidos
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/cliente/activos"
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Package size={21} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-900">
                Consultar mis activos
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Visualiza los activos registrados para tu empresa.
              </p>
            </div>

            <ArrowRight
              size={17}
              className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700"
            />
          </Link>

          <Link
            href="/cliente/activos"
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <FileText size={21} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-900">
                Consultar documentación
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Accede a los documentos técnicos de cada activo.
              </p>
            </div>

            <ArrowRight
              size={17}
              className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700"
            />
          </Link>
        </div>
      </section>

      {/* Seguridad */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={21} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-950">
              Tu información, en un solo lugar
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Consulta los activos asociados a tu empresa, revisa su
              documentación técnica y mantente informado sobre las incidencias
              registradas. Tu acceso está limitado a la información de tu
              empresa.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
