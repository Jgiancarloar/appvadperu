
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  Mail,
  MapPin,
  Plus,
  Search,
  Users,
  X,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  LoaderCircle,
} from "lucide-react";
import { createClient } from "../../../../lib/supabase/client";

type Client = {
  id: string;
  business_name: string;
  trade_name: string | null;
  ruc: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  province: string | null;
  district: string | null;
  address: string | null;
  status: "active" | "inactive";
  assets: { count: number }[];
};

type ClientView = {
  id: string;
  name: string;
  tradeName: string;
  ruc: string;
  contact: string;
  email: string;
  phone: string;
  location: string;
  assets: number;
  status: "active" | "inactive";
};

export default function ClientesPage() {
  const [clients, setClients] = useState<ClientView[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingClientId, setDeletingClientId] = useState<string | null>(
    null,
  );

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { data, error: queryError } = await supabase
        .from("clients")
        .select(`
          id,
          business_name,
          trade_name,
          ruc,
          contact_name,
          email,
          phone,
          department,
          province,
          district,
          address,
          status,
          assets(count)
        `)
        .order("business_name", { ascending: true });

      if (queryError) throw queryError;

      const mappedClients: ClientView[] = ((data ?? []) as Client[]).map(
        (client) => {
          const location = [
            client.district,
            client.province,
            client.department,
          ]
            .filter(Boolean)
            .join(", ");

          return {
            id: client.id,
            name: client.business_name
              .trim()
              .toLocaleUpperCase("es-PE"),
            tradeName: client.trade_name
              ? client.trade_name.trim().toLocaleUpperCase("es-PE")
              : "",
            ruc: client.ruc ?? "Sin RUC",
            contact: client.contact_name ?? "Sin contacto registrado",
            email: client.email?.trim().toLowerCase() ?? "Sin correo",
            phone: client.phone ?? "",
            location:
              location ||
              client.address ||
              "Sin ubicación registrada",
            assets: Number(client.assets?.[0]?.count ?? 0),
            status: client.status,
          };
        },
      );

      setClients(mappedClients);
    } catch (err) {
      console.error("Error al cargar clientes:", err);
      setError(
        "No se pudieron cargar los clientes. Verifica tu conexión e inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-PE");

    if (!query) return clients;

    return clients.filter((client) =>
      [
        client.name,
        client.tradeName,
        client.ruc,
        client.contact,
        client.email,
        client.phone,
        client.location,
      ].some((value) =>
        value.toLocaleLowerCase("es-PE").includes(query),
      ),
    );
  }, [clients, search]);

  const totalAssets = clients.reduce(
    (total, client) => total + client.assets,
    0,
  );

  const activeClients = clients.filter(
    (client) => client.status === "active",
  ).length;

  async function handleDeleteClient(client: ClientView) {
    if (deletingClientId) return;

    setDeleteError("");

    if (client.assets > 0) {
      setDeleteError(
        `No puedes eliminar a ${client.name} porque tiene ${client.assets} activo(s) asociado(s).`,
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar a "${client.name}"?\n\nEsta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    setDeletingClientId(client.id);

    try {
      const supabase = createClient();

      // Volvemos a comprobar los activos antes de eliminar.
      const { count, error: countError } = await supabase
        .from("assets")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client.id);

      if (countError) {
        console.error("Error al comprobar activos:", countError);
        setDeleteError(
          "No se pudo comprobar si el cliente tiene activos. Inténtalo nuevamente.",
        );
        return;
      }

      if ((count ?? 0) > 0) {
        setDeleteError(
          `No se puede eliminar a ${client.name}: tiene ${count} activo(s) asociado(s).`,
        );
        await loadClients();
        return;
      }

      const { data: deletedClient, error: deleteQueryError } = await supabase
        .from("clients")
        .delete()
        .eq("id", client.id)
        .select("id")
        .maybeSingle();

      if (deleteQueryError) {
        console.error("Error al eliminar cliente:", deleteQueryError);

        if (deleteQueryError.code === "23503") {
          setDeleteError(
            "No se puede eliminar este cliente porque tiene registros asociados, como usuarios u otros datos.",
          );
          return;
        }

        if (deleteQueryError.code === "42501") {
          setDeleteError(
            "No tienes permisos para eliminar clientes. Verifica tu perfil de administrador.",
          );
          return;
        }

        setDeleteError(
          "No se pudo eliminar el cliente. Inténtalo nuevamente.",
        );
        return;
      }

      if (!deletedClient) {
        setDeleteError(
          "El cliente no se eliminó. Comprueba que exista y que tengas permisos de administrador.",
        );
        return;
      }

      setClients((previous) =>
        previous.filter((item) => item.id !== client.id),
      );
    } catch (err) {
      console.error("Error inesperado al eliminar cliente:", err);
      setDeleteError(
        "Ocurrió un error inesperado al eliminar el cliente.",
      );
    } finally {
      setDeletingClientId(null);
    }
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Administración</span>
            <ChevronRight size={13} className="text-slate-300" />
            <span className="text-slate-700">Clientes</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Clientes
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Administra las empresas y consulta sus activos asociados.
          </p>
        </div>

        <Link
          href="/admin/clientes/nuevo"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        >
          <Plus size={17} />
          Registrar cliente
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<Building2 size={21} strokeWidth={1.8} />}
          title="Total de clientes"
          value={clients.length}
          color="blue"
        />

        <SummaryCard
          icon={<Users size={21} strokeWidth={1.8} />}
          title="Clientes activos"
          value={activeClients}
          color="violet"
        />

        <SummaryCard
          icon={<Building2 size={21} strokeWidth={1.8} />}
          title="Activos asociados"
          value={totalAssets}
          color="slate"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              Empresas registradas
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {loading
                ? "Cargando empresas..."
                : `${filteredClients.length} ${
                    filteredClients.length === 1
                      ? "empresa encontrada"
                      : "empresas encontradas"
                  }`}
            </p>
          </div>

          <div className="relative max-w-2xl">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por empresa, RUC, contacto..."
              aria-label="Buscar clientes"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {deleteError && (
          <div
            role="alert"
            className="mx-5 mt-4 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 sm:mx-6"
          >
            <p>{deleteError}</p>

            <button
              type="button"
              onClick={() => setDeleteError("")}
              aria-label="Cerrar mensaje"
              className="shrink-0 rounded p-1 hover:bg-rose-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <p className="text-sm font-medium text-red-700">{error}</p>

            <button
              type="button"
              onClick={() => void loadClients()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4 p-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Empresa
                    </th>

                    <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Contacto
                    </th>

                    <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Activos
                    </th>

                    <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600">
                            <Building2 size={19} strokeWidth={1.7} />
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-64 truncate text-sm font-medium text-slate-800">
                              {client.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              RUC: {client.ruc}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-700">
                          {client.contact}
                        </p>

                        <p className="mt-1 max-w-48 truncate text-xs text-slate-500">
                          {client.email}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Building2 size={15} className="text-slate-400" />
                          {client.assets}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/admin/clientes/${client.id}`}
                            title="Ver ficha"
                            aria-label={`Ver ficha de ${client.name}`}
                            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                          >
                            <Eye size={17} />
                          </Link>

                          <Link
                            href={`/admin/clientes/${client.id}/editar`}
                            title="Editar cliente"
                            aria-label={`Editar ${client.name}`}
                            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Pencil size={16} />
                          </Link>

                          <button
                            type="button"
                            title={
                              client.assets > 0
                                ? "No se puede eliminar: tiene activos asociados"
                                : "Eliminar cliente"
                            }
                            aria-label={`Eliminar ${client.name}`}
                            disabled={
                              deletingClientId !== null || client.assets > 0
                            }
                            onClick={() => void handleDeleteClient(client)}
                            className="cursor-pointer inline-flex size-9 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            {deletingClientId === client.id ? (
                              <LoaderCircle
                                size={17}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {filteredClients.map((client) => (
                <article key={client.id} className="space-y-4 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600">
                      <Building2 size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium leading-5 text-slate-800">
                        {client.name}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        RUC: {client.ruc}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pl-1">
                    <p className="flex items-center gap-2 text-xs text-slate-600">
                      <Users size={15} className="shrink-0 text-slate-400" />
                      {client.contact}
                    </p>

                    <p className="flex items-center gap-2 text-xs text-slate-600">
                      <Mail size={15} className="shrink-0 text-slate-400" />
                      <span className="break-all">{client.email}</span>
                    </p>

                    <p className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin size={15} className="shrink-0 text-slate-400" />
                      {client.location}
                    </p>

                    <p className="flex items-center gap-2 text-xs text-slate-600">
                      <Building2 size={15} className="shrink-0 text-slate-400" />
                      {client.assets} activos asociados
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/clientes/${client.id}`}
                      title="Ver ficha"
                      aria-label={`Ver ficha de ${client.name}`}
                      className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                    >
                      <Eye size={17} />
                    </Link>

                    <Link
                      href={`/admin/clientes/${client.id}/editar`}
                      title="Editar cliente"
                      aria-label={`Editar ${client.name}`}
                      className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Pencil size={16} />
                    </Link>

                    <button
                      type="button"
                      title={
                        client.assets > 0
                          ? "No se puede eliminar: tiene activos asociados"
                          : "Eliminar cliente"
                      }
                      aria-label={`Eliminar ${client.name}`}
                      disabled={
                        deletingClientId !== null || client.assets > 0
                      }
                      onClick={() => void handleDeleteClient(client)}
                     className="inline-flex size-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {deletingClientId === client.id ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={17} />
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {filteredClients.length === 0 && (
              <div className="flex flex-col items-center px-5 py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Search size={21} />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-800">
                  {search
                    ? "No se encontraron clientes"
                    : "Todavía no hay clientes registrados"}
                </h3>

                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                  {search
                    ? "Prueba con otro término de búsqueda."
                    : "Registra la primera empresa para comenzar a gestionar sus activos."}
                </p>

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-4 text-xs font-medium text-slate-700 underline underline-offset-4 transition hover:text-slate-950"
                  >
                    Limpiar búsqueda
                  </button>
                )}

                {!search && (
                  <Link
                    href="/admin/clientes/nuevo"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <Plus size={16} />
                    Registrar cliente
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "violet" | "slate";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <article className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5">
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${colorClasses[color]}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          {value}
        </p>
      </div>
    </article>
  );
}