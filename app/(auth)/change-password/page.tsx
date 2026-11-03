
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ArrowRight,
} from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    setMessage("");

    if (password.length < 10) {
      setMessage("La contraseña debe tener al menos 10 caracteres.");
      return;
    }

    if (password.length > 128) {
      setMessage("La contraseña no puede superar los 128 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error || "No se pudo actualizar la contraseña."
        );
        return;
      }

      const destination =
        result.role === "client_user"
          ? "/cliente/dashboard"
          : result.role === "vad_technician"
            ? "/admin/activos"
            : "/admin/dashboard";

      router.replace(destination);
      router.refresh();
    } catch (error) {
      console.error("Error cambiando contraseña:", error);

      setMessage(
        "No se pudo conectar con el servicio. Inténtalo nuevamente."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F8FA] px-4 py-10 sm:px-6">

      {/* FONDOS DECORATIVOS */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-blue-100/40 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 size-96 rounded-full bg-slate-200/50 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-[440px]">

        {/* LOGOTIPO */}

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

        {/* FORMULARIO */}

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">

          <div className="border-b border-slate-100 px-6 py-7 sm:px-8">

            <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck size={22} strokeWidth={1.8} />
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Actualiza tu contraseña
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Por seguridad, debes establecer una nueva contraseña personal
              antes de continuar utilizando el sistema.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 px-6 py-7 sm:px-8"
          >

            {/* NUEVA CONTRASEÑA */}

            <div>
              <label
                htmlFor="password"
                className="text-[13px] font-medium text-slate-700"
              >
                Nueva contraseña
              </label>

              <div className="relative mt-1.5">

                <LockKeyhole
                  size={17}
                  strokeWidth={1.8}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setMessage("");
                  }}
                  placeholder="Mínimo 10 caracteres"
                  minLength={10}
                  maxLength={128}
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

              <p className="mt-1.5 text-xs text-slate-400">
                Utiliza al menos 10 caracteres.
              </p>
            </div>

            {/* CONFIRMAR CONTRASEÑA */}

            <div>
              <label
                htmlFor="confirmPassword"
                className="text-[13px] font-medium text-slate-700"
              >
                Confirmar nueva contraseña
              </label>

              <div className="relative mt-1.5">

                <LockKeyhole
                  size={17}
                  strokeWidth={1.8}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setMessage("");
                  }}
                  placeholder="Repite tu nueva contraseña"
                  maxLength={128}
                  required
                  disabled={isLoading}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>

              </div>
            </div>

            {/* MENSAJE */}

            {message && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{message}</p>
              </div>
            )}

            {/* BOTÓN */}

            <button
              type="submit"
              disabled={isLoading}
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Actualizando contraseña...
                </>
              ) : (
                <>
                  Actualizar contraseña
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-400">
              <CheckCircle2 size={15} />
              Tu contraseña se almacenará de forma segura.
            </div>

          </form>
        </section>

        {/* PIE */}

        <footer className="mt-7 text-center">
          <p className="text-xs text-slate-400">
            VAD-PERU E.I.R.L.
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Plataforma de gestión de activos
          </p>
        </footer>

      </div>
    </main>
  );
}
