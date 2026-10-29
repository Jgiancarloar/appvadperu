
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Users,
  ShieldCheck,
  Wrench,
  Building2,
  MoreHorizontal,
  UserRound,
  ChevronDown,
  Filter,
} from "lucide-react";

type UserRole = "vad_admin" | "vad_technician" | "client_user";
type UserStatus = "Activo" | "Inactivo";

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company: string;
  status: UserStatus;
};

const initialUsers: User[] = [
  {
    id: "1",
    name: "Administrador VAD-PERU",
    email: "ventas@vad-peru.com",
    role: "vad_admin",
    company: "VAD-PERU",
    status: "Activo",
  },
  {
    id: "2",
    name: "Administrador VAD-PERU",
    email: "ventas1@vad-peru.com",
    role: "vad_admin",
    company: "VAD-PERU",
    status: "Activo",
  },
];

const roleLabels: Record<UserRole, string> = {
  vad_admin: "Administrador",
  vad_technician: "Técnico",
  client_user: "Usuario de cliente",
};

const roleIcons = {
  vad_admin: ShieldCheck,
  vad_technician: Wrench,
  client_user: Building2,
};

export default function UsuariosPage() {
  const [users] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        user.company.toLowerCase().includes(normalizedSearch);

      const matchesRole =
        roleFilter === "todos" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "todos" ||
        user.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const activeCount = users.filter(
    (user) => user.status === "Activo",
  ).length;

  const technicianCount = users.filter(
    (user) => user.role === "vad_technician",
  ).length;

  const clientCount = users.filter(
    (user) => user.role === "client_user",
  ).length;

  return (
    <div className="space-y-6 pb-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-sm text-gray-500">
            Administración
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Usuarios
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Gestiona los accesos al sistema de VAD-PERU.
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

      {/* Tarjetas de resumen */}
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
          title="Técnicos"
          value={technicianCount}
          icon={<Wrench size={19} />}
        />

        <SummaryCard
          title="Usuarios de clientes"
          value={clientCount}
          icon={<Building2 size={19} />}
        />
      </div>

      {/* Tabla de usuarios */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* Buscador y filtros */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center">
          {/* Buscador */}
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

          {/* Filtros */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
            {/* Filtro por rol */}
            <div className="relative min-w-0">
              <Filter
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                aria-label="Filtrar por rol"
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-700 outline-none transition hover:border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 sm:min-w-[190px]"
              >
                <option value="todos">Todos los roles</option>
                <option value="vad_admin">Administradores</option>
                <option value="vad_technician">Técnicos</option>
                <option value="client_user">Usuarios de clientes</option>
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            {/* Filtro por estado */}
            <div className="relative min-w-0">
              <ShieldCheck
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
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

        {/* Contenido de la tabla */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-gray-50/80">
              <tr className="text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3.5">Usuario</th>
                <th className="px-5 py-3.5">Rol</th>
                <th className="px-5 py-3.5">Empresa</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => {
                const RoleIcon = roleIcons[user.role];

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
                        <RoleIcon
                          size={16}
                          className="text-gray-500"
                        />
                        {roleLabels[user.role]}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {user.company}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${user.status === "Activo"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${user.status === "Activo"
                              ? "bg-emerald-500"
                              : "bg-gray-400"
                            }`}
                        />

                        {user.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`Acciones de ${user.email}`}
                        onClick={() =>
                          alert(
                            "Las acciones de usuario se implementarán al conectar Supabase.",
                          )
                        }
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                      >
                        <MoreHorizontal size={19} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center"
                  >
                    <Users
                      size={28}
                      className="mx-auto mb-3 text-gray-300"
                    />

                    <p className="text-sm font-medium text-gray-700">
                      No se encontraron usuarios
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Prueba con otro nombre, correo o filtro.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de tabla */}
        <div className="border-t border-gray-100 px-5 py-3">
          <p className="text-xs text-gray-500">
            Mostrando {filteredUsers.length} de {users.length} usuarios de ejemplo
          </p>
        </div>
      </section>
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
