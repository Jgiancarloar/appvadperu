
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  Hash,
  LoaderCircle,
  MapPin,
  Package,
  Save,
  Tag,
  Wrench,
  AlertCircle,
} from "lucide-react";
import { createClient } from "../../../../../lib/supabase/client";

type AssetStatus = "active" | "inactive" | "maintenance";

type Client = {
  id: string;
  business_name: string;
  trade_name: string | null;
};

type AssetForm = {
  client_id: string;
  name: string;
  description: string;
  reference: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  location: string;
  installation_date: string;
  status: AssetStatus;
};

type FormErrors = Partial<Record<keyof AssetForm, string>>;

const initialForm: AssetForm = {
  client_id: "",
  name: "",
  description: "",
  reference: "",
  manufacturer: "",
  model: "",
  serial_number: "",
  location: "",
  installation_date: "",
  status: "active",
};

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const labelClass = "text-[13px] font-medium text-slate-700";

export default function NuevoActivoPage() {
  const router = useRouter();

  const [form, setForm] = useState<AssetForm>(initialForm);
  const [clients, setClients] = useState<Client[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [clientsError, setClientsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initializeForm() {
      try {
        setCheckingAccess(true);
        setServerError("");

        const sessionResponse = await fetch("/api/auth/session");
        const sessionData = await sessionResponse.json();

        if (!sessionResponse.ok) {
          throw new Error(
            sessionData.error || "No se pudo verificar tu sesión."
          );
        }

        const userRole = sessionData.user?.role;

        if (userRole !== "vad_admin") {
          router.replace("/admin/activos");
          return;
        }

        const supabase = createClient();

        const { data, error } = await supabase
          .from("clients")
          .select("id, business_name, trade_name")
          .eq("status", "active")
          .order("business_name", { ascending: true });

        if (error) throw error;

        if (!cancelled) {
          setClients((data || []) as Client[]);
        }
      } catch (error) {
        console.error("Error inicializando formulario de activo:", error);

        if (!cancelled) {
          setServerError(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el formulario."
          );
        }
      } finally {
        if (!cancelled) {
          setCheckingAccess(false);
        }
      }
    }

    initializeForm();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function updateField(field: keyof AssetForm, value: string) {
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

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.client_id) {
      nextErrors.client_id = "Selecciona el cliente al que pertenece el activo.";
    }

    if (!form.name.trim()) {
      nextErrors.name = "Ingresa el nombre del activo.";
    }

    if (form.installation_date) {
      const selectedDate = new Date(
        `${form.installation_date}T00:00:00`
      );

      if (Number.isNaN(selectedDate.getTime())) {
        nextErrors.installation_date = "Ingresa una fecha válida.";
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");

    if (!validateForm()) return;

    setSaving(true);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setServerError(
          "Tu sesión ha expirado. Inicia sesión nuevamente para registrar activos."
        );
        return;
      }

      // Verificamos nuevamente el rol antes de registrar.
      const sessionResponse = await fetch("/api/auth/session");
      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok || sessionData.user?.role !== "vad_admin") {
        setServerError(
          "No tienes permisos para registrar activos."
        );
        return;
      }

      const { data, error } = await supabase
        .from("assets")
        .insert({
          client_id: form.client_id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          reference: form.reference.trim() || null,
          manufacturer: form.manufacturer.trim() || null,
          model: form.model.trim() || null,
          serial_number: form.serial_number.trim() || null,
          location: form.location.trim() || null,
          installation_date: form.installation_date || null,
          status: form.status,
          qr_token: crypto.randomUUID(),
        })
        .select("id, asset_code")
        .single();

      if (error) {
        if (error.code === "23505") {
          setServerError(
            "No se pudo generar un código único para el activo. Inténtalo nuevamente."
          );
          return;
        }

        if (error.code === "42501") {
          setServerError(
            "No tienes permisos para registrar activos. Verifica que tu perfil esté activo y tenga el rol de administrador."
          );
          return;
        }

        console.error("Error registrando activo:", error);

        setServerError(
          "No se pudo registrar el activo. Comprueba la información e inténtalo nuevamente."
        );
        return;
      }

      // El código del activo lo genera automáticamente la base de datos.
      console.info("Activo registrado:", data.asset_code);

      router.replace("/admin/activos");
      router.refresh();
    } catch (error) {
      console.error("Error inesperado registrando activo:", error);

      setServerError(
        "Ocurrió un error inesperado. Comprueba tu conexión e inténtalo nuevamente."
      );
    } finally {
      setSaving(false);
    }
  }

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

  return (
    <div className="space-y-7">
      {/* ENCABEZADO */}
      <section>
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link
            href="/admin/activos"
            className="transition hover:text-slate-900"
          >
            Activos
          </Link>

          <ChevronRight size={13} className="text-slate-300" />

          <span className="text-slate-700">Nuevo activo</span>
        </div>

        <Link
          href="/admin/activos"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Volver a activos
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Registrar activo
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Registra la información del activo y los datos necesarios para su
          identificación y seguimiento.
        </p>
      </section>

      {/* FORMULARIO */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="max-w-5xl space-y-5"
      >
        {/* DATOS GENERALES */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <SectionHeader
            icon={<Package size={20} strokeWidth={1.8} />}
            iconClass="bg-blue-50 text-blue-700"
            title="Datos generales"
            description="Información principal para identificar el activo"
          />

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <label htmlFor="client_id" className={labelClass}>
                Cliente <span className="text-rose-600">*</span>
              </label>

              <select
                id="client_id"
                value={form.client_id}
                onChange={(e) => updateField("client_id", e.target.value)}
                disabled={saving || clients.length === 0}
                className={inputClass}
                aria-invalid={Boolean(errors.client_id)}
              >
                <option value="">Selecciona un cliente</option>

                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.trade_name || client.business_name}
                  </option>
                ))}
              </select>

              {errors.client_id && (
                <FieldError>{errors.client_id}</FieldError>
              )}

              {!clientsError && clients.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">
                  No hay clientes activos registrados. Primero debes registrar
                  un cliente.
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="name" className={labelClass}>
                Nombre del activo <span className="text-rose-600">*</span>
              </label>

              <input
                id="name"
                type="text"
                maxLength={150}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Ej. Puerta cortafuego"
                disabled={saving}
                className={inputClass}
                aria-invalid={Boolean(errors.name)}
              />

              {errors.name && <FieldError>{errors.name}</FieldError>}
            </div>

            <div>
              <label htmlFor="reference" className={labelClass}>
                Referencia
              </label>

              <div className="relative">
                <Tag
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="reference"
                  type="text"
                  maxLength={100}
                  value={form.reference}
                  onChange={(e) => updateField("reference", e.target.value)}
                  placeholder="Ej. PF-001"
                  disabled={saving}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="location" className={labelClass}>
                Ubicación
              </label>

              <div className="relative">
                <MapPin
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="location"
                  type="text"
                  maxLength={200}
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="Ej. Torre A - Piso 2"
                  disabled={saving}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="description" className={labelClass}>
                Descripción
              </label>

              <textarea
                id="description"
                rows={3}
                maxLength={1000}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe brevemente las características del activo..."
                disabled={saving}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>
          </div>
        </section>

        {/* DATOS TÉCNICOS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <SectionHeader
            icon={<Wrench size={20} strokeWidth={1.8} />}
            iconClass="bg-violet-50 text-violet-700"
            title="Datos técnicos"
            description="Información del fabricante e identificación técnica"
          />

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <label htmlFor="manufacturer" className={labelClass}>
                Fabricante
              </label>

              <input
                id="manufacturer"
                type="text"
                maxLength={150}
                value={form.manufacturer}
                onChange={(e) => updateField("manufacturer", e.target.value)}
                placeholder="Ej. Dormakaba"
                disabled={saving}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="model" className={labelClass}>
                Modelo
              </label>

              <input
                id="model"
                type="text"
                maxLength={150}
                value={form.model}
                onChange={(e) => updateField("model", e.target.value)}
                placeholder="Modelo del activo"
                disabled={saving}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="serial_number" className={labelClass}>
                Número de serie
              </label>

              <div className="relative">
                <Hash
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="serial_number"
                  type="text"
                  maxLength={150}
                  value={form.serial_number}
                  onChange={(e) =>
                    updateField("serial_number", e.target.value)
                  }
                  placeholder="Ingresa el número de serie"
                  disabled={saving}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* INSTALACIÓN Y ESTADO */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <SectionHeader
            icon={<CalendarDays size={20} strokeWidth={1.8} />}
            iconClass="bg-emerald-50 text-emerald-700"
            title="Instalación y estado"
            description="Datos de instalación y situación actual del activo"
          />

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <label htmlFor="installation_date" className={labelClass}>
                Fecha de instalación
              </label>

              <input
                id="installation_date"
                type="date"
                value={form.installation_date}
                onChange={(e) =>
                  updateField("installation_date", e.target.value)
                }
                disabled={saving}
                className={inputClass}
                aria-invalid={Boolean(errors.installation_date)}
              />

              {errors.installation_date && (
                <FieldError>{errors.installation_date}</FieldError>
              )}
            </div>

            <div>
              <label htmlFor="status" className={labelClass}>
                Estado del activo <span className="text-rose-600">*</span>
              </label>

              <select
                id="status"
                value={form.status}
                onChange={(e) =>
                  updateField("status", e.target.value as AssetStatus)
                }
                disabled={saving}
                className={inputClass}
              >
                <option value="active">Activo</option>
                <option value="maintenance">En mantenimiento</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>
        </section>

        {/* INFORMACIÓN DEL CÓDIGO */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="mt-0.5 shrink-0 text-blue-700">
            <FileText size={19} />
          </div>

          <div>
            <p className="text-sm font-medium text-blue-900">
              Código de identificación automático
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800/80">
              Al guardar el activo, el sistema generará automáticamente un
              código único, por ejemplo ACT-00001. También se generará un
              identificador QR para su futura vinculación con una etiqueta
              QR o NFC.
            </p>
          </div>
        </div>

        {/* ERROR */}
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
              href="/admin/activos"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={saving || clients.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}

              {saving ? "Guardando..." : "Registrar activo"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SectionHeader({
  icon,
  iconClass,
  title,
  description,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 text-xs text-rose-600">
      {children}
    </p>
  );
}
