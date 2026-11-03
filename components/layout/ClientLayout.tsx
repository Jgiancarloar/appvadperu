
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";

type ClientLayoutProps = {
  children: ReactNode;
  user: {
    fullName: string;
    email: string;
  };
};

const navigation = [
  {
    label: "Dashboard",
    href: "/cliente/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Mis activos",
    href: "/cliente/activos",
    icon: Package,
  },
  {
    label: "Documentos",
    href: "/cliente/documentos",
    icon: FileText,
  },
];

function getInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export default function ClientLayout({
  children,
  user,
}: Readonly<ClientLayoutProps>) {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    setIsOpen(false);
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
          "No se pudo cerrar la sesión. Inténtalo de nuevo.",
        );
        setIsSigningOut(false);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutError(
        "Ocurrió un error al cerrar la sesión.",
      );
      setIsSigningOut(false);
    }
  }

  const initials = getInitials(user.fullName);

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-950 font-bold text-white">
            V
          </div>
          <div>
            <p className="text-sm font-bold text-slate-950">VAD-PERU</p>
            <p className="text-[11px] text-slate-500">Portal de clientes</p>
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

      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-white">
            V
          </div>
          <div className="min-w-0">
            <p className="font-bold tracking-tight text-slate-950">VAD-PERU</p>
            <p className="text-xs text-slate-500">Portal de clientes</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
            MI ESPACIO
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
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
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight size={15} className="text-white" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-xl p-2.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user.fullName}
              </p>
              <p className="truncate text-xs text-slate-500">Cliente</p>
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
              {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </span>
          </button>
        </div>
      </aside>

      <div className="min-h-screen md:pl-[260px]">
        <main className="mx-auto w-full max-w-[1600px] p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
