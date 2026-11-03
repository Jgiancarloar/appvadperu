
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../../lib/supabase/client";
import {
  Search,
  Package,
  CheckCircle2,
  Wrench,
  XCircle,
  Eye,
  RefreshCw,
  ChevronRight,
  MapPin,
  Hash,
  CalendarDays,
} from "lucide-react";

type AssetStatus = "active" | "inactive" | "maintenance";

type Asset = {
  id: string;
  asset_code: string;
  reference: string | null;
  name: string;
  description: string | null;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  installation_date: string | null;
  status: AssetStatus;
  created_at: string;
};

const statusConfig: Record<
  AssetStatus,
  { label: string; className: string; dot: string }
> = {
  active: {
    label: "Activo",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  inactive: {
    label: "Inactivo",
    className: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-400",
  },
  maintenance: {
    label: "En mantenimiento",
    className: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
};

export default function ClientAssetsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // No enviamos client_id.
      // Supabase RLS limita los resultados a los activos
      // correspondientes al cliente autenticado.
      const { data, error: assetsError } = await supabase
        .from("assets")
        .select(`
          id,
          asset_code,
          reference,
          name,
          description,
          location,
          manufacturer,
          model,
          serial_number,
          installation_date,
          status,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (assetsError) throw assetsError;

      setAssets((data || []) as Asset[]);
    } catch (err) {
      console.error("Error cargando activos del cliente:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar tus activos.",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const filteredAssets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          asset.asset_code,
          asset.reference,
          asset.name,
          asset.description,
          asset.location,
          asset.manufacturer,
          asset.model,
          asset.serial_number,
        ].some((value) =>
          value?.toLowerCase().includes(normalizedSearch),
        );

      const matchesStatus =
        statusFilter === "all" || asset.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [assets, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: assets.length,
      active: assets.filter((asset) => asset.status === "active").length,
      maintenance: assets.filter(
        (asset) => asset.status === "maintenance",
      ).length,
      inactive: assets.filter((asset) => asset.status === "inactive").length,
    }),
    [assets],
  );

  function formatDate(date: string | null) {
    if (!date) return "—";

    return new Date(`${date}T00:00:00`).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
          <span>Mi espacio</span>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">
            Mis activos
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Mis activos
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Consulta los activos registrados para tu empresa.
        </p>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Total de activos"
          value={stats.total}
          icon={<Package size={19} />}
          iconClass="bg-slate-100 text-slate-600"
        />

        <StatCard
          title="Activos"
          value={stats.active}
          icon={<CheckCircle2 size={19} />}
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="En mantenimiento"
          value={stats.maintenance}
          icon={<Wrench size={19} />}
          iconClass="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Inactivos"
          value={stats.inactive}
          icon={<XCircle size={19} />}
          iconClass="bg-slate-100 text-slate-500"
        />
      </div>

      {/* PANEL PRINCIPAL */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* BÚSQUEDA Y FILTROS */}
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por código, nombre, ubicación o serie..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-slate-400 sm:w-52"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="maintenance">En mantenimiento</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">
                {filteredAssets.length}
              </span>{" "}
              {filteredAssets.length === 1
                ? "activo encontrado"
                : "activos encontrados"}
            </p>

            <button
              type="button"
              onClick={loadAssets}
              disabled={loading}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              Actualizar
            </button>
          </div>
        </div>

        {/* CARGANDO */}
        {loading && (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <XCircle size={22} />
            </div>

            <p className="font-medium text-slate-800">
              No se pudieron cargar tus activos
            </p>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={loadAssets}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* SIN RESULTADOS */}
        {!loading && !error && filteredAssets.length === 0 && (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package size={26} />
            </div>

            <h3 className="font-semibold text-slate-800">
              {assets.length === 0
                ? "Todavía no tienes activos registrados"
                : "No se encontraron resultados"}
            </h3>

            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {assets.length === 0
                ? "Cuando se registren activos para tu empresa, aparecerán aquí."
                : "Prueba cambiando el término de búsqueda o el filtro de estado."}
            </p>
          </div>
        )}

        {/* TABLA DE ESCRITORIO */}
        {!loading && !error && filteredAssets.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Activo</th>
                  <th className="px-5 py-3.5">Ubicación</th>
                  <th className="px-5 py-3.5">Marca / Modelo</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Instalación</th>
                  <th className="px-5 py-3.5 text-right">Detalle</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <Package size={19} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">
                            {asset.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {asset.asset_code}
                            {asset.reference && ` · Ref. ${asset.reference}`}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-slate-500">
                        <MapPin size={14} />
                        {asset.location || "Sin ubicación"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-700">
                        {asset.manufacturer || "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {asset.model || "Sin modelo"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={asset.status} />
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDate(asset.installation_date)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/cliente/activos/${asset.id}`}
                        title="Ver activo"
                        className="inline-flex items-center gap-1.5 rounded-lg p-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Eye size={17} />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TARJETAS MÓVILES */}
        {!loading && !error && filteredAssets.length > 0 && (
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Package size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">
                        {asset.name}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {asset.asset_code}
                      </p>

                      {asset.reference && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          Referencia: {asset.reference}
                        </p>
                      )}
                    </div>
                  </div>

                  <StatusBadge status={asset.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    <span className="truncate">
                      {asset.location || "Sin ubicación"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={14} />
                    {formatDate(asset.installation_date)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Package size={14} />
                    <span className="truncate">
                      {asset.manufacturer || "Sin marca"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Hash size={14} />
                    <span className="truncate">
                      {asset.serial_number || "Sin serie"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-3">
                  <Link
                    href={`/cliente/activos/${asset.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <Eye size={15} />
                    Ver detalle
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          {title}
        </p>

        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: AssetStatus }) {
  const config = statusConfig[status];

  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
