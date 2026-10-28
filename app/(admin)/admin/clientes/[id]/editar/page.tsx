
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  FileText,
  Mail,
  MapPin,
  Phone,
  Save,
  UserRound,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { createClient } from "../../../../../../lib/supabase/client";
import {
  departamentos,
  obtenerProvincias,
  obtenerDistritos,
  obtenerDepartamentoPorId,
  obtenerProvinciaPorId,
  obtenerDistritoPorId,
} from "../../../../../../lib/ubigeo";

type ClientForm = {
  businessName: string;
  tradeName: string;
  ruc: string;
  contactName: string;
  email: string;
  phone: string;
  department: string;
  province: string;
  district: string;
  address: string;
  notes: string;
};

const emptyForm: ClientForm = {
  businessName: "",
  tradeName: "",
  ruc: "",
  contactName: "",
  email: "",
  phone: "",
  department: "",
  province: "",
  district: "",
  address: "",
  notes: "",
};

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

const labelClass = "text-[13px] font-medium text-slate-700";

function capitalizeName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es-PE")
    .replace(/(^|[\s'-])([\p{L}])/gu, (_, separator: string, letter: string) =>
      separator + letter.toLocaleUpperCase("es-PE"),
    );
}

export default function EditarClientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = params.id;

  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ClientForm, string>>
  >({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const [clientNotFound, setClientNotFound] = useState(false);

  const provinciasDisponibles = obtenerProvincias(form.department);
  const distritosDisponibles = obtenerDistritos(
    form.department,
    form.province,
  );

  const loadClient = useCallback(async () => {
    setLoading(true);
    setServerError("");
    setClientNotFound(false);

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("clients")
        .select(`
          id,
          business_name,
          trade_name,
          ruc,
          contact_name,
          email,
          phone,
          department,
          province,
          district,
          department_ubigeo,
          province_ubigeo,
          district_ubigeo,
          address,
          notes
        `)
        .eq("id", clientId)
        .maybeSingle();

      if (error) {
        console.error("Error al cargar cliente:", error);
        setServerError("No se pudo cargar el cliente. Inténtalo nuevamente.");
        return;
      }

      if (!data) {
        setClientNotFound(true);
        return;
      }

      // Priorizamos los códigos UBIGEO guardados.
      // Para registros anteriores sin códigos, intentamos localizar
      // la ubicación por su nombre.
      const departmentId =
        data.department_ubigeo ||
        departamentos.find(
          (item) =>
            item.name.toLocaleLowerCase("es-PE") ===
            data.department?.toLocaleLowerCase("es-PE"),
        )?.id ||
        "";

      const provinceId =
        data.province_ubigeo ||
        obtenerProvincias(departmentId).find(
          (item) =>
            item.name.toLocaleLowerCase("es-PE") ===
            data.province?.toLocaleLowerCase("es-PE"),
        )?.id ||
        "";

      const districtId =
        data.district_ubigeo ||
        obtenerDistritos(departmentId, provinceId).find(
          (item) =>
            item.name.toLocaleLowerCase("es-PE") ===
            data.district?.toLocaleLowerCase("es-PE"),
        )?.id ||
        "";

      setForm({
        businessName: data.business_name ?? "",
        tradeName: data.trade_name ?? "",
        ruc: data.ruc ?? "",
        contactName: data.contact_name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        department: departmentId,
        province: provinceId,
        district: districtId,
        address: data.address ?? "",
        notes: data.notes ?? "",
      });
    } catch (error) {
      console.error("Error inesperado al cargar cliente:", error);
      setServerError("Ocurrió un error al cargar el cliente.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  function updateField(field: keyof ClientForm, value: string) {
    setForm((previous) => {
      const updated = { ...previous, [field]: value };

      if (field === "department") {
        updated.province = "";
        updated.district = "";
      }

      if (field === "province") {
        updated.district = "";
      }

      return updated;
    });

    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
      ...(field === "department"
        ? { province: undefined, district: undefined }
        : {}),
      ...(field === "province" ? { district: undefined } : {}),
    }));

    setServerError("");
    setSuccess("");
  }

  function validateForm() {
    const nextErrors: Partial<Record<keyof ClientForm, string>> = {};

    if (!form.businessName.trim()) {
      nextErrors.businessName = "Ingresa la razón social.";
    }

    if (!/^\d{11}$/.test(form.ruc.trim())) {
      nextErrors.ruc = "El RUC debe contener exactamente 11 dígitos.";
    }

    if (!form.contactName.trim()) {
      nextErrors.contactName = "Ingresa el nombre del contacto.";
    }

    if (
      !form.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      nextErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (form.department && !obtenerDepartamentoPorId(form.department)) {
      nextErrors.department = "Selecciona un departamento válido.";
    }

    if (
      form.province &&
      !provinciasDisponibles.some((item) => item.id === form.province)
    ) {
      nextErrors.province = "Selecciona una provincia válida.";
    }

    if (
      form.district &&
      !distritosDisponibles.some((item) => item.id === form.district)
    ) {
      nextErrors.district = "Selecciona un distrito válido.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");
    setSuccess("");

    if (!validateForm()) return;

    setSaving(true);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setServerError(
          "Tu sesión ha expirado. Inicia sesión nuevamente para editar clientes.",
        );
        return;
      }

      const departamento = obtenerDepartamentoPorId(form.department);
      const provincia = obtenerProvinciaPorId(form.province);
      const distrito = obtenerDistritoPorId(form.district);

      const { data: updatedClient, error: updateError } = await supabase
        .from("clients")
        .update({
          business_name: form.businessName.trim().toLocaleLowerCase("es-PE"),
          trade_name: form.tradeName.trim()
            ? form.tradeName.trim().toLocaleLowerCase("es-PE")
            : null,
          ruc: form.ruc.trim(),
          contact_name: capitalizeName(form.contactName),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          department: departamento?.name.toLocaleLowerCase("es-PE") ?? null,
          province: provincia?.name.toLocaleLowerCase("es-PE") ?? null,
          district: distrito?.name.toLocaleLowerCase("es-PE") ?? null,
          department_ubigeo: departamento?.id ?? null,
          province_ubigeo: provincia?.id ?? null,
          district_ubigeo: distrito?.id ?? null,
          address: form.address.trim()
            ? form.address.trim().toLocaleLowerCase("es-PE")
            : null,
          notes: form.notes.trim()
            ? form.notes.trim().toLocaleLowerCase("es-PE")
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId)
        .select("id")
        .maybeSingle();

      if (updateError) {
        if (updateError.code === "23505") {
          setErrors((previous) => ({
            ...previous,
            ruc: "Este RUC ya pertenece a otro cliente.",
          }));
          return;
        }

        if (updateError.code === "42501") {
          setServerError(
            "No tienes permisos para editar clientes. Verifica tu perfil de administrador.",
          );
          return;
        }

        console.error("Error al actualizar cliente:", updateError);
        setServerError("No se pudieron guardar los cambios. Inténtalo nuevamente.");
        return;
      }

      if (!updatedClient) {
        setServerError(
          "No se actualizó el cliente. Comprueba que exista y que tengas permisos para modificarlo.",
        );
        return;
      }

      router.replace(`/admin/clientes/${clientId}`);
      router.refresh();
    } catch (error) {
      console.error("Error inesperado al actualizar cliente:", error);
      setServerError(
        "Ocurrió un error inesperado. Comprueba tu conexión e inténtalo nuevamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
        <LoaderCircle size={20} className="animate-spin" />
        Cargando información del cliente...
      </div>
    );
  }

  if (clientNotFound) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Cliente no encontrado
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          El cliente que intentas editar no existe o ya no está disponible.
        </p>
        <Link
          href="/admin/clientes"
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-medium text-white"
        >
          Volver a clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section>
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/admin/clientes" className="transition hover:text-slate-900">
            Clientes
          </Link>
          <ChevronRight size={13} className="text-slate-300" />
          <Link
            href={`/admin/clientes/${clientId}`}
            className="transition hover:text-slate-900"
          >
            Ficha del cliente
          </Link>
          <ChevronRight size={13} className="text-slate-300" />
          <span className="text-slate-700">Editar</span>
        </div>

        <Link
          href={`/admin/clientes/${clientId}`}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Volver a la ficha
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Editar cliente
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Actualiza la información de la empresa y su persona de contacto.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="max-w-5xl space-y-5"
      >
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Building2 size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                Datos de la empresa
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Información legal y comercial
              </p>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <label htmlFor="businessName" className={labelClass}>
                Razón social <span className="text-rose-600">*</span>
              </label>
              <input
                id="businessName"
                value={form.businessName}
                onChange={(e) => updateField("businessName", e.target.value)}
                placeholder="Ej. Constructora El Roble S.A.C."
                className={inputClass}
                aria-invalid={Boolean(errors.businessName)}
              />
              {errors.businessName && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {errors.businessName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="tradeName" className={labelClass}>
                Nombre comercial
              </label>
              <input
                id="tradeName"
                value={form.tradeName}
                onChange={(e) => updateField("tradeName", e.target.value)}
                placeholder="Ej. El Roble"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="ruc" className={labelClass}>
                RUC <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <FileText
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="ruc"
                  inputMode="numeric"
                  maxLength={11}
                  value={form.ruc}
                  onChange={(e) =>
                    updateField(
                      "ruc",
                      e.target.value.replace(/\D/g, "").slice(0, 11),
                    )
                  }
                  placeholder="20123456789"
                  className={`${inputClass} pl-10`}
                  aria-invalid={Boolean(errors.ruc)}
                />
              </div>
              {errors.ruc && (
                <p className="mt-1.5 text-xs text-rose-600">{errors.ruc}</p>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <UserRound size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                Datos de contacto
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Persona responsable de la empresa
              </p>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <label htmlFor="contactName" className={labelClass}>
                Nombre del contacto <span className="text-rose-600">*</span>
              </label>
              <input
                id="contactName"
                value={form.contactName}
                onChange={(e) => updateField("contactName", e.target.value)}
                placeholder="Nombre y apellidos"
                className={inputClass}
                aria-invalid={Boolean(errors.contactName)}
              />
              {errors.contactName && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {errors.contactName}
                </p>
              )}
            </div>

            <div>
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
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="contacto@empresa.com"
                  className={`${inputClass} pl-10`}
                  aria-invalid={Boolean(errors.email)}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>
                Teléfono
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="987 654 321"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <MapPin size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                Ubicación
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Dirección de la empresa
              </p>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
            <div>
              <label htmlFor="department" className={labelClass}>
                Departamento
              </label>
              <select
                id="department"
                value={form.department}
                onChange={(e) => updateField("department", e.target.value)}
                className={inputClass}
              >
                <option value="">Selecciona un departamento</option>
                {departamentos.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              {errors.department && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {errors.department}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="province" className={labelClass}>
                Provincia
              </label>
              <select
                id="province"
                value={form.province}
                onChange={(e) => updateField("province", e.target.value)}
                disabled={!form.department}
                className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
              >
                <option value="">Selecciona una provincia</option>
                {provinciasDisponibles.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
              {errors.province && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {errors.province}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="district" className={labelClass}>
                Distrito
              </label>
              <select
                id="district"
                value={form.district}
                onChange={(e) => updateField("district", e.target.value)}
                disabled={!form.province}
                className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
              >
                <option value="">Selecciona un distrito</option>
                {distritosDisponibles.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
              {errors.district && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {errors.district}
                </p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="address" className={labelClass}>
                Dirección
              </label>
              <input
                id="address"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Av., calle, número..."
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="notes" className={labelClass}>
                Observaciones
              </label>
              <textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Información adicional sobre la empresa..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>
        </section>

        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{serverError}</p>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Los campos marcados con <span className="text-rose-600">*</span>{" "}
            son obligatorios.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Link
              href={`/admin/clientes/${clientId}`}
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
                <Save size={16} />
              )}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
