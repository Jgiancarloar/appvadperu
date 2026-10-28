
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  DoorClosed,
  FileCheck2,
  FileText,
  ShieldAlert,
  Users,
} from "lucide-react";

const stats = [
  {
    label: "Clientes registrados",
    value: "12",
    detail: "Empresas en el sistema",
    icon: Building2,
    iconColor: "text-blue-700",
    iconBg: "bg-blue-50",
    trend: null,
  },
  {
    label: "Activos registrados",
    value: "248",
    detail: "Puertas y equipamiento",
    icon: DoorClosed,
    iconColor: "text-violet-700",
    iconBg: "bg-violet-50",
    trend: null,
  },
  {
    label: "Incidencias abiertas",
    value: "4",
    detail: "Pendientes de atención",
    icon: ShieldAlert,
    iconColor: "text-amber-700",
    iconBg: "bg-amber-50",
    trend: null,
  },
  {
    label: "Documentos por vencer",
    value: "3",
    detail: "Requieren revisión",
    icon: FileCheck2,
    iconColor: "text-rose-700",
    iconBg: "bg-rose-50",
    trend: null,
  },
];

const activities = [
  {
    id: 1,
    title: "Activo registrado",
    description: "Puerta cortafuego",
    client: "Constructora El Roble",
    date: "Hoy, 10:42",
    icon: DoorClosed,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-700",
    status: "Completado",
    statusStyle: "bg-emerald-50 text-emerald-700",
  },
  {
    id: 2,
    title: "Documento asociado",
    description: "Certificado de operatividad",
    client: "Constructora El Roble",
    date: "Hoy, 09:18",
    icon: FileText,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-700",
    status: "Registrado",
    statusStyle: "bg-slate-100 text-slate-600",
  },
  {
    id: 3,
    title: "Nueva incidencia",
    description: "Dificultad de cierre",
    client: "Cliente de ejemplo",
    date: "Ayer, 16:30",
    icon: Activity,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
    status: "Pendiente",
    statusStyle: "bg-amber-50 text-amber-700",
  },
];

const shortcuts = [
  {
    title: "Registrar cliente",
    description: "Añade una empresa",
    href: "/admin/clientes",
    icon: Building2,
  },
  {
    title: "Registrar activo",
    description: "Añade una puerta o equipo",
    href: "/admin/activos",
    icon: DoorClosed,
  },
  {
    title: "Gestionar usuarios",
    description: "Administra los accesos",
    href: "/admin/usuarios",
    icon: Users,
  },
  {
    title: "Ver incidencias",
    description: "Consulta los reportes",
    href: "/admin/incidencias",
    icon: Activity,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-7 sm:space-y-8">
      {/* Encabezado */}
      <section>
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Administración</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700">Dashboard</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Dashboard
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Supervisa tus clientes, activos y operaciones desde un solo lugar.
        </p>
      </section>

      {/* Indicadores */}
      <section
        aria-label="Indicadores generales"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 transition-shadow hover:shadow-sm sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium leading-5 text-slate-500">
                  {stat.label}
                </p>

                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor}`}
                >
                  <Icon size={20} strokeWidth={1.8} />
                </div>
              </div>

              <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
                {stat.value}
              </p>

              <p className="mt-2 text-xs text-slate-500">{stat.detail}</p>
            </article>
          );
        })}
      </section>

      {/* Actividad y accesos rápidos */}
      <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.55fr_1fr]">
        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                Actividad reciente
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Últimos movimientos del sistema
              </p>
            </div>

            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-slate-600">
                Ejemplo
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {activities.map((activity) => {
              const Icon = activity.icon;

              return (
                <div
                  key={activity.id}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:px-6"
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${activity.iconBg} ${activity.iconColor}`}
                  >
                    <Icon size={19} strokeWidth={1.8} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {activity.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {activity.description}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {activity.client}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${activity.statusStyle}`}
                    >
                      {activity.status}
                    </span>

                    <span className="text-[11px] text-slate-400">
                      {activity.date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 px-5 py-3.5 sm:px-6">
            <Link
              href="/admin/incidencias"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 transition hover:text-slate-950"
            >
              Consultar incidencias
              <ArrowRight size={14} />
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              Accesos rápidos
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Accede a las operaciones más frecuentes
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;

              return (
                <Link
                  key={shortcut.href}
                  href={shortcut.href}
                  className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-200 group-hover:text-slate-950">
                    <Icon size={19} strokeWidth={1.8} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {shortcut.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {shortcut.description}
                    </p>
                  </div>

                  <ArrowRight
                    size={16}
                    className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700"
                  />
                </Link>
              );
            })}
          </div>
        </article>
      </section>

    </div>
  );
}