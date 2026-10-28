
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "../../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(
          "No se pudo iniciar sesión. Verifica tu correo y contraseña.",
        );
        return;
      }

      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setMessage(
        "No se pudo conectar con el servicio. Inténtalo nuevamente.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F8FA] px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-blue-100/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 size-96 rounded-full bg-slate-200/50 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-xl font-bold text-white shadow-lg shadow-slate-900/10">
            V
          </div>

          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
            VAD-PERU
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Gestión de activos
          </p>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
          <div className="border-b border-slate-100 px-6 py-7 sm:px-8">
            <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck size={22} strokeWidth={1.8} />
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Bienvenido
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Inicia sesión para acceder a tu espacio de trabajo.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 px-6 py-7 sm:px-8"
          >
            <div>
              <label
                htmlFor="email"
                className="text-[13px] font-medium text-slate-700"
              >
                Correo electrónico
              </label>

              <div className="relative mt-1.5">
                <Mail
                  size={17}
                  strokeWidth={1.8}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setMessage("");
                  }}
                  placeholder="nombre@vad-peru.com"
                  required
                  disabled={isLoading}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-[13px] font-medium text-slate-700"
              >
                Contraseña
              </label>

              <div className="relative mt-1.5">
                <LockKeyhole
                  size={17}
                  strokeWidth={1.8}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setMessage("");
                  }}
                  placeholder="Ingresa tu contraseña"
                  required
                  disabled={isLoading}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={
                    showPassword
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  aria-pressed={showPassword}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
            </div>

            {message && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700"
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}

              {!isLoading && (
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              )}
            </button>

            <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-400">
              <ShieldCheck size={15} />
              Acceso exclusivo para usuarios autorizados
            </div>
          </form>
        </section>

        <footer className="mt-7 text-center">
          <p className="text-xs text-slate-400">VAD-PERU E.I.R.L.</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Plataforma de gestión de activos
          </p>
        </footer>
      </div>
    </main>
  );
}