
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  ChevronRight,
  Package,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";

const navigation = [
  {
    title: "GENERAL",
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "GESTIÓN",
    items: [
      { label: "Clientes", href: "/admin/clientes", icon: Building2 },
      { label: "Activos", href: "/admin/activos", icon: Package },
      { label: "Documentos", href: "/admin/documentos", icon: FileText },
      { label: "Incidencias", href: "/admin/incidencias", icon: Activity },
      { label: "Usuarios", href: "/admin/usuarios", icon: Users },
    ],
  },
  {
    title: "SISTEMA",
    items: [
      {
        label: "Administración",
        href: "/admin/administracion",
        icon: ShieldCheck,
      },
      {
        label: "Configuración",
        href: "/admin/configuracion",
        icon: Settings,
      },
    ],
  },
];

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  // Reiniciar el estado al cambiar de módulo.
  useEffect(() => {
    setIsSigningOut(false);
    setSignOutError("");
  }, [pathname]);

  async function handleSignOut() {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setSignOutError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setSignOutError(
          "No se pudo cerrar la sesión. Inténtalo de nuevo."
        );
        setIsSigningOut(false);
        return;
      }

      onNavigate?.();

      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutError(
        "Ocurrió un error al cerrar la sesión."
      );
      setIsSigningOut(false);
    }
  }

  return (
    <>
      {/* LOGO */}
      <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-slate-100 px-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-white">
          V
        </div>

        <div className="min-w-0">
          <p className="font-bold tracking-tight text-slate-950">
            VAD-PERU
          </p>
          <p className="text-xs text-slate-500">
            Gestión de activos
          </p>
        </div>

        <div className="ml-auto hidden rounded-md bg-slate-100 p-1.5 text-slate-500 lg:block">
          <ShieldCheck size={17} />
        </div>
      </div>

      {/* NAVEGACIÓN */}
      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        {navigation.map((group) => (
          <div key={group.title}>
            <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin/dashboard" &&
                    pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${
                      isActive
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.8}
                      className={
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-slate-700"
                      }
                    />

                    <span className="flex-1">
                      {item.label}
                    </span>

                    {isActive && (
                      <ChevronRight
                        size={15}
                        className="text-white"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* PERFIL Y CIERRE DE SESIÓN */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl p-2.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
            AD
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              Administrador
            </p>
            <p className="truncate text-xs text-slate-500">
              VAD-PERU
            </p>
          </div>

          <span
            className="size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50"
            aria-label="Sesión activa"
          />
        </div>

        {signOutError && (
          <p
            role="alert"
            className="px-2.5 pb-2 text-xs leading-5 text-red-600"
          >
            {signOutError}
          </p>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-1 flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut size={18} strokeWidth={1.8} />

          <span>
            {isSigningOut
              ? "Cerrando sesión..."
              : "Cerrar sesión"}
          </span>
        </button>
      </div>
    </>
  );
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* HEADER MÓVIL */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-950 font-bold text-white">
            V
          </div>

          <div>
            <p className="text-sm font-bold text-slate-950">
              VAD-PERU
            </p>
            <p className="text-[11px] text-slate-500">
              Gestión de activos
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isOpen}
          className="flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50"
        >
          {isOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      {/* OVERLAY MÓVIL */}
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out md:translate-x-0 ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <SidebarContent
          onNavigate={() => setIsOpen(false)}
        />
      </aside>
    </>
  );
}
