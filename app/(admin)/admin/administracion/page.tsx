
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  LoaderCircle,
  Search,
  ShieldCheck,
  Users,
  UserRound,
  UserRoundPlus,
  Wrench,
} from "lucide-react";

type InternalRole = "vad_admin" | "vad_technician";

type InternalUser = {
  id: string;
  full_name: string;
  email: string;
  role: InternalRole;
  is_active: boolean;
  created_at: string;
};

const roleLabels: Record<InternalRole, string> = {
  vad_admin: "Administrador",
  vad_technician: "Técnico",
};

export default function AdministracionPage() {
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | InternalRole>("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/system-users", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "No se pudieron cargar los usuarios.");
        return;
      }

      setUsers(result.users ?? []);
      setIsSuperadmin(result.isSuperadmin === true);
    } catch (err) {
      console.error("Error cargando usuarios internos:", err);
      setError("Ocurrió un error al cargar los usuarios internos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        user.full_name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);

      const matchesRole =
        roleFilter === "todos" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const activeCount = users.filter((user) => user.is_active).length;
  const adminCount = users.filter((user) => user.role === "vad_admin").length;
  const technicianCount = users.filter(
    (user) => user.role === "vad_technician"
  ).length;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="mb-1 text-sm text-gray-500">Sistema</p>

        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Administración
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Gestiona las cuentas y los accesos internos de VAD-PERU.
        </p>
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Usuarios internos"
          value={users.length}
          icon={<Users size={19} />}
        />

        <SummaryCard
          title="Usuarios activos"
          value={activeCount}
          icon={<ShieldCheck size={19} />}
        />

        <SummaryCard
          title="Administradores"
          value={adminCount}
          icon={<ShieldCheck size={19} />}
        />

        <SummaryCard
          title="Técnicos"
          value={technicianCount}
          icon={<Wrench size={19} />}
        />
      </div>

      {/* LISTADO */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">
              Usuarios internos
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Administradores y técnicos de VAD-PERU.
            </p>
          </div>

          {isSuperadmin && (
            <Link
              href="/admin/administracion/usuarios/nuevo"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
            >
              <UserRoundPlus size={17} />
              Nuevo usuario interno
            </Link>
          )}
        </div>

        {/* BÚSQUEDA Y FILTROS */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o correo..."
              aria-label="Buscar usuario interno"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as "todos" | InternalRole)
            }
            aria-label="Filtrar por rol"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          >
            <option value="todos">Todos los roles</option>
            <option value="vad_admin">Administradores</option>
            <option value="vad_technician">Técnicos</option>
          </select>
        </div>

        {/* ERRORES */}
        {error && (
          <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadUsers()}
              className="mt-2 text-sm font-medium text-red-800 underline underline-offset-2"
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {/* TABLA */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-gray-50/80">
              <tr className="text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3.5">Usuario</th>
                <th className="px-5 py-3.5">Rol</th>
                <th className="px-5 py-3.5">Estado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-5 py-14 text-center">
                    <LoaderCircle
                      size={25}
                      className="mx-auto animate-spin text-gray-400"
                    />
                    <p className="mt-3 text-sm text-gray-500">
                      Cargando usuarios internos...
                    </p>
                  </td>
                </tr>
              ) : !error && filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-14 text-center">
                    <Users
                      size={28}
                      className="mx-auto text-gray-300"
                    />

                    <p className="mt-3 text-sm font-medium text-gray-700">
                      {users.length === 0
                        ? "No hay usuarios internos registrados"
                        : "No se encontraron usuarios"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {users.length === 0
                        ? "Los administradores y técnicos aparecerán aquí."
                        : "Prueba con otro nombre o filtro."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isAdmin = user.role === "vad_admin";
                  const Icon = isAdmin ? ShieldCheck : Wrench;
                  const isProtectedSuperadmin =
                    user.email.toLowerCase() === "ventas@vad-peru.com";

                  return (
                    <tr
                      key={user.id}
                      className="transition hover:bg-gray-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                            <UserRound size={19} />
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">
                                {user.full_name || "Sin nombre"}
                              </p>

                              {isProtectedSuperadmin && (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                  SUPERADMIN
                                </span>
                              )}
                            </div>

                            <p className="mt-0.5 text-xs text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <Icon size={16} className="text-gray-500" />
                          {roleLabels[user.role]}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${
                            user.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              user.is_active
                                ? "bg-emerald-500"
                                : "bg-gray-400"
                            }`}
                          />
                          {user.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          <p className="text-xs text-gray-500">
            {loading
              ? "Consultando usuarios..."
              : `Mostrando ${filteredUsers.length} de ${users.length} usuarios internos`}
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-950"
        >
          Ir a usuarios de clientes
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
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
