
"use client";

import { useCallback, useEffect, useState, type ElementType } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../../lib/supabase/client";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Factory,
  FileText,
  Hash,
  Info,
  LoaderCircle,
  MapPin,
  Package,
  Save,
  Tag,
  Wrench,
} from "lucide-react";

type AssetStatus = "active" | "inactive" | "maintenance";

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

type Client = {
  id: string;
  business_name: string;
  trade_name: string | null;
};

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
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50";

const labelClass =
  "mb-2 block text-[13px] font-medium text-slate-700";

function SectionHeader({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: ElementType;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}
      >
        <Icon size={20} strokeWidth={1.8} />
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-1.5 text-xs text-rose-600">
      {message}
    </p>
  );
}

export default function EditAssetPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const assetId = params.id as string;

  const [form, setForm] = useState<AssetForm>(initialForm);
  const [clients, setClients] = useState<Client[]>([]);
  const [assetCode, setAssetCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AssetForm, string>>>({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const updateField = (field: keyof AssetForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));

    setServerError("");
    setSuccessMessage("");
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setServerError("");

      const [sessionResult, assetResult, clientsResult] = await Promise.all([
        fetch("/api/auth/session"),

        supabase
          .from("assets")
          .select(`
            id,
            client_id,
            asset_code,
            name,
            description,
            reference,
            manufacturer,
            model,
            serial_number,
            location,
            installation_date,
            status
          `)
          .eq("id", assetId)
          .single(),

        supabase
          .from("clients")
          .select("id, business_name, trade_name")
          .eq("status", "active")
          .order("business_name", { ascending: true }),
      ]);

      const sessionData = await sessionResult.json();

      if (!sessionResult.ok) {
        throw new Error(
          sessionData.error || "No se pudo verificar tu sesión."
        );
      }

      if (sessionData.user?.role !== "vad_admin") {
        router.replace("/admin/activos");
        return;
      }

      setAuthorized(true);

      if (assetResult.error) {
        if (assetResult.error.code === "PGRST116") {
          throw new Error("No se encontró el activo solicitado.");
        }

        throw assetResult.error;
      }

      if (clientsResult.error) {
        throw clientsResult.error;
      }

      const asset = assetResult.data;

      setAssetCode(asset.asset_code || "");

      setForm({
        client_id: asset.client_id || "",
        name: asset.name || "",
        description: asset.description || "",
        reference: asset.reference || "",
        manufacturer: asset.manufacturer || "",
        model: asset.model || "",
        serial_number: asset.serial_number || "",
        location: asset.location || "",
        installation_date: asset.installation_date || "",
        status: asset.status as AssetStatus,
      });

      setClients((clientsResult.data || []) as Client[]);
    } catch (err) {
      console.error("Error cargando activo para edición:", err);

      setServerError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la información del activo."
      );
    } finally {
      setLoading(false);
      setCheckingAccess(false);
    }
  }, [assetId, router, supabase]);

  useEffect(() => {
    if (assetId) {
      void loadData();
    }
  }, [assetId, loadData]);

  function validateForm() {
    const nextErrors: Partial<Record<keyof AssetForm, string>> = {};

    if (!form.client_id) {
      nextErrors.client_id = "Selecciona un cliente.";
    }

    if (!form.name.trim()) {
      nextErrors.name = "El nombre del activo es obligatorio.";
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setServerError("");
    setSuccessMessage("");

    if (!validateForm()) return;

    if (!authorized) {
      setServerError("No tienes permisos para modificar este activo.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("assets")
        .update({
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
        })
        .eq("id", assetId);

      if (error) throw error;

      setSuccessMessage("Los cambios se guardaron correctamente.");

      window.setTimeout(() => {
        router.push(`/admin/activos/${assetId}`);
        router.refresh();
      }, 900);
    } catch (err) {
      console.error("Error actualizando activo:", err);

      setServerError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar los cambios."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || checkingAccess) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle size={18} className="animate-spin" />
          Cargando información del activo...
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  if (serverError && !assetCode) {
    return (
      <div className="space-y-5">
        <Link
          href="/admin/activos"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Volver a activos
        </Link>

        <div className="rounded-2xl border border-rose-200 bg-white px-6 py-12 text-center">
          <p className="font-semibold text-slate-900">
            No se pudo cargar el activo
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {serverError}
          </p>

          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Info size={15} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Encabezado */}
      <section>
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link
            href="/admin/dashboard"
            className="transition hover:text-slate-900"
          >
            Administración
          </Link>

          <ChevronRight size={13} className="text-slate-300" />

          <Link
            href="/admin/activos"
            className="transition hover:text-slate-900"
          >
            Activos
          </Link>

          <ChevronRight size={13} className="text-slate-300" />

          <span className="text-slate-700">Editar activo</span>
        </div>

        <Link
          href={`/admin/activos/${assetId}`}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Volver al detalle del activo
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Editar activo
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Actualiza la información y características del activo registrado.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Package size={15} className="text-slate-500" />
          <span className="text-xs text-slate-500">Código:</span>
          <span className="text-xs font-semibold text-slate-800">
            {assetCode}
          </span>
        </div>
      </section>

      {/* Formulario */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="max-w-5xl space-y-5"
      >
        {/* Datos generales */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <SectionHeader
            icon={Building2}
            title="Datos generales"
            description="Información principal del activo y cliente responsable."
            color="bg-blue-50 text-blue-700"
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
                disabled={saving}
                className={inputClass}
              >
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.trade_name || client.business_name}
                  </option>
                ))}
              </select>

              <FieldError message={errors.client_id} />
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
                placeholder="Ej. Puerta cortafuego principal"
                disabled={saving}
                className={inputClass}
              />

              <FieldError message={errors.name} />
            </div>

            <div>
              <label htmlFor="reference" className={labelClass}>
                Referencia
              </label>

              <input
                id="reference"
                type="text"
                maxLength={100}
                value={form.reference}
                onChange={(e) => updateField("reference", e.target.value)}
                placeholder="Ej. PF-001"
                disabled={saving}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="location" className={labelClass}>
                Ubicación
              </label>

              <div className="relative">
                <MapPin
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="location"
                  type="text"
                  maxLength={200}
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="Ej. Piso 2 - Puerta de emergencia"
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
                placeholder="Describe las características generales del activo..."
                disabled={saving}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
              />
            </div>
          </div>
        </section>

        {/* Datos técnicos */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <SectionHeader
            icon={Wrench}
            title="Datos técnicos"
            description="Características técnicas y datos del fabricante."
            color="bg-violet-50 text-violet-700"
          />

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <label htmlFor="manufacturer" className={labelClass}>
                Fabricante
              </label>

              <div className="relative">
                <Factory
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="manufacturer"
                  type="text"
                  maxLength={150}
                  value={form.manufacturer}
                  onChange={(e) => updateField("manufacturer", e.target.value)}
                  placeholder="Nombre del fabricante"
                  disabled={saving}
                  className={`${inputClass} pl-10`}
                />
              </div>
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
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="serial_number"
                  type="text"
                  maxLength={150}
                  value={form.serial_number}
                  onChange={(e) => updateField("serial_number", e.target.value)}
                  placeholder="Número de serie del fabricante"
                  disabled={saving}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Instalación y estado */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <SectionHeader
            icon={CalendarDays}
            title="Instalación y estado"
            description="Fecha de instalación y situación actual del activo."
            color="bg-emerald-50 text-emerald-700"
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
              />

              <FieldError message={errors.installation_date} />
            </div>

            <div>
              <label htmlFor="status" className={labelClass}>
                Estado del activo
              </label>

              <select
                id="status"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
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

        {/* Mensajes */}
        {serverError && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <Info size={17} className="mt-0.5 shrink-0" />
            <p>{serverError}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={17} />
            <p>{successMessage}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href={`/admin/activos/${assetId}`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
                Guardando cambios...
              </>
            ) : (
              <>
                <Save size={17} />
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
