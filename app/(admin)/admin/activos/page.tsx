
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../../lib/supabase/client";
import {
  Search,
  Plus,
  Package,
  CheckCircle2,
  Wrench,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronRight,
  MapPin,
  Building2,
  Hash,
  CalendarDays,
} from "lucide-react";

type AssetStatus = "active" | "inactive" | "maintenance";
type UserRole = "vad_admin" | "vad_technician";

type Client = {
  id: string;
  business_name: string;
  trade_name: string | null;
};

type Asset = {
  id: string;
  client_id: string;
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
  qr_token: string;
  created_at: string;
  updated_at: string;
  clients?: {
    business_name: string;
    trade_name: string | null;
  } | null;
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

export default function ActivosPage() {
  const supabase = createClient();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [role, setRole] = useState<UserRole | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = role === "vad_admin";

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [assetsResult, clientsResult, sessionResult] = await Promise.all([
        supabase
          .from("assets")
          .select(`
            id,
            client_id,
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
            qr_token,
            created_at,
            updated_at,
            clients (
              business_name,
              trade_name
            )
          `)
          .order("created_at", { ascending: false }),

        supabase
          .from("clients")
          .select("id, business_name, trade_name")
          .order("business_name", { ascending: true }),

        fetch("/api/auth/session"),
      ]);

      if (assetsResult.error) throw assetsResult.error;
      if (clientsResult.error) throw clientsResult.error;

      const sessionData = await sessionResult.json();

      if (!sessionResult.ok) {
        throw new Error(
          sessionData.error || "No se pudo verificar la sesión."
        );
      }

      // El endpoint devuelve el rol dentro de sessionData.user
      const userRole = sessionData.user?.role as UserRole | undefined;

      if (!userRole || !["vad_admin", "vad_technician"].includes(userRole)) {
        throw new Error("No se pudo identificar un rol válido para el usuario.");
      }

      setRole(userRole);
      setAssets((assetsResult.data || []) as unknown as Asset[]);
      setClients((clientsResult.data || []) as Client[]);
    } catch (err) {
      console.error("Error cargando activos:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los activos."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAssets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return assets.filter((asset) => {
      const clientName =
        asset.clients?.trade_name || asset.clients?.business_name || "";

      const matchesSearch =
        !normalizedSearch ||
        [
          asset.asset_code,
          asset.reference,
          asset.name,
          asset.manufacturer,
          asset.model,
          asset.serial_number,
          asset.location,
          clientName,
        ].some((value) => value?.toLowerCase().includes(normalizedSearch));

      const matchesStatus =
        statusFilter === "all" || asset.status === statusFilter;

      const matchesClient =
        clientFilter === "all" || asset.client_id === clientFilter;

      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [assets, search, statusFilter, clientFilter]);

  const stats = useMemo(
    () => ({
      total: assets.length,
      active: assets.filter((asset) => asset.status === "active").length,
      maintenance: assets.filter(
        (asset) => asset.status === "maintenance"
      ).length,
      inactive: assets.filter((asset) => asset.status === "inactive").length,
    }),
    [assets]
  );

  const handleDelete = async (asset: Asset) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el activo ${asset.asset_code} - ${asset.name}?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(asset.id);

      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", asset.id);

      if (error) throw error;

      setAssets((current) =>
        current.filter((item) => item.id !== asset.id)
      );
    } catch (err) {
      console.error("Error eliminando activo:", err);
      alert(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el activo."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";

    return new Date(`${date}T00:00:00`).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getClientName = (asset: Asset) =>
    asset.clients?.trade_name ||
    asset.clients?.business_name ||
    "Cliente no disponible";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <span>Administración</span>
            <ChevronRight size={14} />
            <span className="font-medium text-slate-700">Activos</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Activos
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Gestiona y consulta los activos registrados en el sistema.
          </p>
        </div>

        {isAdmin && (
          <Link
            href="/admin/activos/nuevo"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus size={18} />
            Registrar activo
          </Link>
        )}
      </div>

      {/* Stats */}
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

      {/* Main panel */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, nombre, referencia o serie..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:w-auto">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-slate-400"
              >
                <option value="all">Todos los clientes</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.trade_name || client.business_name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-slate-400"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="maintenance">En mantenimiento</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
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
              onClick={loadData}
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

        {/* Loading */}
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

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <XCircle size={22} />
            </div>

            <p className="font-medium text-slate-800">
              No se pudieron cargar los activos
            </p>

            <p className="mt-1 max-w-md text-sm text-slate-500">{error}</p>

            <button
              onClick={loadData}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredAssets.length === 0 && (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package size={26} />
            </div>

            <h3 className="font-semibold text-slate-800">
              {assets.length === 0
                ? "Todavía no hay activos registrados"
                : "No se encontraron resultados"}
            </h3>

            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {assets.length === 0
                ? "Los activos que registres aparecerán aquí."
                : "Prueba cambiando los filtros o el término de búsqueda."}
            </p>

            {assets.length === 0 && isAdmin && (
              <Link
                href="/admin/activos/nuevo"
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus size={17} />
                Registrar primer activo
              </Link>
            )}
          </div>
        )}

        {/* Desktop table */}
        {!loading && !error && filteredAssets.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Activo</th>
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">Ubicación</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Instalación</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
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
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
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
                      <p className="max-w-48 truncate text-sm text-slate-700">
                        {getClientName(asset)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-slate-500">
                        <MapPin size={14} />
                        {asset.location || "Sin ubicación"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={asset.status} />
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDate(asset.installation_date)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/activos/${asset.id}`}
                          title="Ver activo"
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                        >
                          <Eye size={17} />
                        </Link>

                        {isAdmin && (
                          <>
                            <Link
                              href={`/admin/activos/${asset.id}/editar`}
                              title="Editar activo"
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                            >
                              <Pencil size={17} />
                            </Link>

                            <button
                              onClick={() => handleDelete(asset)}
                              disabled={deletingId === asset.id}
                              title="Eliminar activo"
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            >
                              <Trash2 size={17} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile cards */}
        {!loading && !error && filteredAssets.length > 0 && (
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
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
                    <Building2 size={14} />
                    <span className="truncate">{getClientName(asset)}</span>
                  </div>

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
                    <Hash size={14} />
                    {asset.serial_number || "Sin serie"}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <Link
                    href={`/admin/activos/${asset.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600"
                  >
                    <Eye size={15} />
                    Ver detalle
                  </Link>

                  {isAdmin && (
                    <Link
                      href={`/admin/activos/${asset.id}/editar`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white"
                    >
                      <Pencil size={14} />
                      Editar
                    </Link>
                  )}
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
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
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
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
