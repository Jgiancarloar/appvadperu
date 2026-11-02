
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Users,
  ShieldCheck,
  Building2,
  UserRound,
  ChevronDown,
  Filter,
  LoaderCircle,
  AlertCircle,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react";

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

type User = {
  id: string;
  name: string;
  email: string;
  clientId: string;
  company: string;
  status: "Activo" | "Inactivo";
  createdAt: string;
};

function getCompanyName(user: ClientUser) {
  if (!user.clients) return "Sin empresa";

  const client = Array.isArray(user.clients)
    ? user.clients[0]
    : user.clients;

  return (
    client?.trade_name ||
    client?.business_name ||
    "Sin empresa"
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        <span className="flex size-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight text-gray-900">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "Activo" | "Inactivo";
}) {
  const active = status === "Activo";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-gray-400"
        }`}
      />
      {status}
    </span>
  );
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/client-users", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudieron cargar los usuarios."
        );
      }

      const mappedUsers: User[] = (result.users ?? []).map(
        (user: ClientUser) => ({
          id: user.id,
          name: user.full_name,
          email: user.email,
          clientId: user.client_id,
          company: getCompanyName(user),
          status: user.is_active ? "Activo" : "Inactivo",
          createdAt: user.created_at,
        })
      );

      setUsers(mappedUsers);
    } catch (err) {
      console.error("Error cargando usuarios:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al cargar los usuarios."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar al usuario ${user.name} (${user.email})?\n\nEsta acción eliminará su cuenta de acceso y no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(user.id);
      setError("");

      const response = await fetch("/api/admin/client-users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: user.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudo eliminar el usuario."
        );
      }

      setUsers((currentUsers) =>
        currentUsers.filter((item) => item.id !== user.id)
      );
    } catch (err) {
      console.error("Error eliminando usuario:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al eliminar el usuario."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const companies = useMemo(() => {
    return Array.from(
      new Set(users.map((user) => user.company))
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        user.company.toLowerCase().includes(normalizedSearch);

      const matchesCompany =
        companyFilter === "todos" ||
        user.company === companyFilter;

      const matchesStatus =
        statusFilter === "todos" ||
        user.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [users, search, companyFilter, statusFilter]);

  const activeCount = users.filter(
    (user) => user.status === "Activo"
  ).length;

  const inactiveCount = users.filter(
    (user) => user.status === "Inactivo"
  ).length;

  const companyCount = new Set(
    users.map((user) => user.clientId)
  ).size;

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));

  return (
    <div className="space-y-6 pb-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-sm text-gray-500">
            Administración
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Usuarios de clientes
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Gestiona las cuentas de acceso de las empresas clientes de VAD-PERU.
          </p>
        </div>

        <Link
          href="/admin/usuarios/nuevo"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          <Plus size={17} />
          Nuevo usuario
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total de usuarios"
          value={users.length}
          icon={<Users size={19} />}
        />

        <SummaryCard
          title="Usuarios activos"
          value={activeCount}
          icon={<ShieldCheck size={19} />}
        />

        <SummaryCard
          title="Usuarios inactivos"
          value={inactiveCount}
          icon={<UserRound size={19} />}
        />

        <SummaryCard
          title="Empresas con acceso"
          value={companyCount}
          icon={<Building2 size={19} />}
        />
      </div>

      {/* Mensajes */}
      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>

          <button
            onClick={loadUsers}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
          >
            <RefreshCw size={15} />
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla de usuarios */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* Buscador y filtros */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, correo o empresa..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
            <div className="relative min-w-0">
              <Building2
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <select
                value={companyFilter}
                onChange={(event) =>
                  setCompanyFilter(event.target.value)
                }
                aria-label="Filtrar por empresa"
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-700 outline-none transition hover:border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 sm:min-w-[190px]"
              >
                <option value="todos">Todas las empresas</option>

                {companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <div className="relative min-w-0">
              <Filter
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filtrar por estado"
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-700 outline-none transition hover:border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 sm:min-w-[170px]"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3">
            <LoaderCircle className="h-7 w-7 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">
              Cargando usuarios...
            </p>
          </div>
        ) : (
          <>
            {/* Tabla escritorio */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-gray-50/80">
                  <tr className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3.5">Usuario</th>
                    <th className="px-5 py-3.5">Empresa</th>
                    <th className="px-5 py-3.5">Fecha de registro</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="transition hover:bg-gray-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                            <UserRound size={19} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {user.name}
                            </p>

                            <p className="mt-0.5 truncate text-sm text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <Building2
                            size={16}
                            className="text-gray-400"
                          />
                          {user.company}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={user.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/usuarios/${user.id}/editar`}
                            title="Editar usuario"
                            aria-label={`Editar usuario ${user.name}`}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900"
                          >
                            <Pencil size={16} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            title="Eliminar usuario"
                            aria-label={`Eliminar usuario ${user.name}`}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === user.id ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas móvil */}
            <div className="divide-y divide-gray-100 md:hidden">
              {filteredUsers.map((user) => (
                <div key={user.id} className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                      <UserRound size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {user.name}
                      </p>

                      <p className="mt-0.5 break-all text-sm text-gray-500">
                        {user.email}
                      </p>
                    </div>

                    <StatusBadge status={user.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pl-[52px]">
                    <div>
                      <p className="text-xs text-gray-400">Empresa</p>
                      <p className="mt-1 text-sm text-gray-700">
                        {user.company}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Fecha de registro
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pl-[52px]">
                    <Link
                      href={`/admin/usuarios/${user.id}/editar`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <Pencil size={15} />
                      Editar
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      disabled={deletingId === user.id}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === user.id ? (
                        <LoaderCircle
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={15} />
                      )}
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Sin resultados */}
            {filteredUsers.length === 0 && (
              <div className="px-5 py-12 text-center">
                <Users
                  size={30}
                  className="mx-auto mb-3 text-gray-300"
                />

                <p className="text-sm font-medium text-gray-700">
                  {users.length === 0
                    ? "Todavía no hay usuarios registrados"
                    : "No se encontraron usuarios"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {users.length === 0
                    ? "Cuando registres usuarios de clientes, aparecerán aquí."
                    : "Prueba con otro nombre, correo o filtro."}
                </p>

                {users.length === 0 && (
                  <Link
                    href="/admin/usuarios/nuevo"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
                  >
                    <Plus size={16} />
                    Registrar primer usuario
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* Pie de tabla */}
        {!loading && (
          <div className="border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-500">
              Mostrando {filteredUsers.length} de {users.length} usuarios
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
