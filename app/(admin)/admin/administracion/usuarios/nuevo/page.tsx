
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  UserRound,
  Mail,
  ShieldCheck,
  HardHat,
  UserPlus,
  KeyRound,
  AlertCircle,
  LoaderCircle,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

type UserRole = "vad_admin" | "vad_technician";

type UserForm = {
  fullName: string;
  email: string;
  role: UserRole;
};

type CreatedCredentials = {
  fullName: string;
  email: string;
  temporaryPassword: string;
};

const initialForm: UserForm = {
  fullName: "",
  email: "",
  role: "vad_technician",
};

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

const labelClass = "text-[13px] font-medium text-slate-700";

export default function NuevoUsuarioPage() {
  const router = useRouter();

  const [form, setForm] = useState<UserForm>({ ...initialForm });
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserForm, string>>
  >({});

  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null);

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // ==========================================
  // VERIFICAR ACCESO DEL SUPERADMINISTRADOR
  // ==========================================

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      try {
        const response = await fetch("/api/admin/system-users", {
          cache: "no-store",
        });

        if (!response.ok) {
          router.replace("/admin/administracion");
          return;
        }

        const result = await response.json();

        if (!result.isSuperadmin) {
          router.replace("/admin/administracion");
          return;
        }
      } catch (error) {
        console.error("Error verificando permisos:", error);
        router.replace("/admin/administracion");
      } finally {
        if (isMounted) {
          setCheckingAccess(false);
        }
      }
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // ==========================================
  // ACTUALIZAR CAMPOS
  // ==========================================

  function updateField(field: keyof UserForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));

    setServerError("");
  }

  // ==========================================
  // VALIDAR FORMULARIO
  // ==========================================

  function validateForm() {
    const nextErrors: Partial<Record<keyof UserForm, string>> = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Ingresa el nombre completo del usuario.";
    } else if (form.fullName.trim().length > 150) {
      nextErrors.fullName = "El nombre no puede superar los 150 caracteres.";
    }

    if (
      !form.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      nextErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (!["vad_admin", "vad_technician"].includes(form.role)) {
      nextErrors.role = "Selecciona un rol válido.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  // ==========================================
  // COPIAR CONTRASEÑA
  // ==========================================

  async function copyPassword() {
    if (!createdCredentials?.temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(
        createdCredentials.temporaryPassword
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Error copiando contraseña:", error);
      setServerError(
        "No se pudo copiar la contraseña. Selecciónala y cópiala manualmente."
      );
    }
  }

  // ==========================================
  // REGISTRAR USUARIO
  // ==========================================

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setServerError("");
    setCreatedCredentials(null);
    setCopied(false);
    setPasswordVisible(false);

    if (!validateForm()) return;

    setSaving(true);

    try {
      const response = await fetch("/api/admin/system-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setServerError(
          result.error || "No se pudo registrar el usuario."
        );
        return;
      }

      if (!result.temporaryPassword) {
        setServerError(
          "El usuario fue creado, pero no se recibió la contraseña temporal. Contacta con soporte antes de continuar."
        );
        return;
      }

      setCreatedCredentials({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        temporaryPassword: result.temporaryPassword,
      });

      setForm({ ...initialForm });
      setErrors({});
    } catch (error) {
      console.error("Error registrando usuario:", error);

      setServerError(
        "Ocurrió un error inesperado. Comprueba tu conexión e inténtalo nuevamente."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // VERIFICANDO PERMISOS
  // ==========================================

  if (checkingAccess) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle size={18} className="animate-spin" />
          Verificando permisos...
        </div>
      </div>
    );
  }

  // ==========================================
  // FORMULARIO
  // ==========================================

  return (
    <div className="space-y-7">

      {/* ENCABEZADO */}

      <section>
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link
            href="/admin/administracion"
            className="transition hover:text-slate-900"
          >
            Administración
          </Link>

          <ChevronRight size={13} className="text-slate-300" />

          <span className="text-slate-700">Nuevo usuario</span>
        </div>

        <Link
          href="/admin/administracion"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Volver a administración
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Registrar usuario
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Registra la información del integrante y configura su acceso al sistema.
        </p>
      </section>

      {/* FORMULARIO */}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="max-w-5xl space-y-5"
      >

        {/* DATOS PERSONALES */}

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">

          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <UserRound size={20} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                Datos personales
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Información del integrante de VAD-PERU
              </p>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">

            <div className="sm:col-span-2">
              <label htmlFor="fullName" className={labelClass}>
                Nombre completo <span className="text-rose-600">*</span>
              </label>

              <input
                id="fullName"
                type="text"
                autoComplete="name"
                maxLength={150}
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="Nombre y apellidos"
                disabled={saving}
                className={inputClass}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={
                  errors.fullName ? "fullName-error" : undefined
                }
              />

              {errors.fullName && (
                <p
                  id="fullName-error"
                  className="mt-1.5 text-xs text-rose-600"
                >
                  {errors.fullName}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className={labelClass}>
                Correo electrónico <span className="text-rose-600">*</span>
              </label>

              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="usuario@vad-peru.com"
                  disabled={saving}
                  className={`${inputClass} pl-10`}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email ? "email-error" : undefined
                  }
                />
              </div>

              {errors.email && (
                <p
                  id="email-error"
                  className="mt-1.5 text-xs text-rose-600"
                >
                  {errors.email}
                </p>
              )}
            </div>

          </div>
        </section>

        {/* CONFIGURACIÓN DE ACCESO */}

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">

          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <ShieldCheck size={20} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                Configuración de acceso
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Rol y permisos dentro del sistema
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">

            <div>
              <label htmlFor="role" className={labelClass}>
                Rol del usuario <span className="text-rose-600">*</span>
              </label>

              <select
                id="role"
                value={form.role}
                onChange={(e) =>
                  updateField("role", e.target.value as UserRole)
                }
                disabled={saving}
                className={inputClass}
                aria-invalid={Boolean(errors.role)}
              >
                <option value="vad_technician">Técnico</option>
                <option value="vad_admin">Administrador</option>
              </select>

              {errors.role && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {errors.role}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

              {form.role === "vad_admin" ? (
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <ShieldCheck size={19} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Administrador
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Tendrá acceso a las funciones administrativas y
                      operativas del sistema, incluyendo clientes, activos,
                      documentos e incidencias. No tendrá permisos de
                      superadministrador.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <HardHat size={19} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Técnico
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Podrá consultar activos y documentación, además de
                      gestionar incidencias de acuerdo con los permisos
                      establecidos para su rol.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </section>

        {/* CREDENCIALES */}

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">

          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <KeyRound size={20} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                Credenciales de acceso
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Generación automática de contraseña temporal
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-emerald-600"
              />

              <div>
                <p className="text-sm font-medium text-slate-800">
                  Contraseña segura generada por el sistema
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Al registrar al usuario, el sistema generará automáticamente
                  una contraseña temporal. Una vez creada la cuenta, podrás
                  copiar sus credenciales y entregárselas de forma segura.
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Por seguridad, la contraseña temporal no se almacenará en
                  las tablas de la aplicación.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ERROR DEL SERVIDOR */}

        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{serverError}</p>
          </div>
        )}

        {/* ACCIONES */}

        <div className="flex flex-col-reverse gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs text-slate-500">
            Los campos marcados con{" "}
            <span className="text-rose-600">*</span> son obligatorios.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">

            <Link
              href="/admin/administracion"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}

              {saving ? "Registrando usuario..." : "Registrar usuario"}
            </button>

          </div>
        </div>

      </form>

      {/* CREDENCIALES GENERADAS */}

      {createdCredentials && (
        <section className="max-w-5xl overflow-hidden rounded-2xl border border-emerald-200 bg-white">

          <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50/60 px-5 py-5 sm:px-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={21} />
            </div>

            <div>
              <h2 className="text-[15px] font-semibold text-emerald-900">
                ¡Usuario registrado correctamente!
              </h2>

              <p className="mt-1 text-xs text-emerald-700">
                Las credenciales están listas para ser entregadas.
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">

            <div>
              <label className={labelClass}>
                Nombre del usuario
              </label>

              <p className="mt-1.5 text-sm font-medium text-slate-800">
                {createdCredentials.fullName}
              </p>
            </div>

            <div>
              <label className={labelClass}>
                Correo electrónico
              </label>

              <div className="mt-1.5 flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-700">
                {createdCredentials.email}
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Contraseña temporal
              </label>

              <div className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5">
                <input
                  type={passwordVisible ? "text" : "password"}
                  readOnly
                  value={createdCredentials.temporaryPassword}
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm text-slate-800 outline-none"
                  aria-label="Contraseña temporal generada"
                />

                <button
                  type="button"
                  onClick={() => setPasswordVisible((value) => !value)}
                  className="shrink-0 text-slate-400 transition hover:text-slate-700"
                  aria-label={
                    passwordVisible
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {passwordVisible ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={copyPassword}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
            >
              {copied ? (
                <>
                  <Check size={17} />
                  Contraseña copiada
                </>
              ) : (
                <>
                  <Copy size={17} />
                  Copiar contraseña
                </>
              )}
            </button>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Importante: guarda estas credenciales
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    Copia y entrega la contraseña al usuario de forma segura.
                    Esta contraseña solo se mostrará durante este registro.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
              <Link
                href="/admin/administracion"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Volver a administración
              </Link>

              <button
                type="button"
                onClick={() => {
                  setCreatedCredentials(null);
                  setPasswordVisible(false);
                  setCopied(false);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <UserPlus size={16} />
                Registrar otro usuario
              </button>
            </div>

          </div>
        </section>
      )}

    </div>
  );
}
