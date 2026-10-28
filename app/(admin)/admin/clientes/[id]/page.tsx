
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  DoorClosed,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import { createClient } from "../../../../../lib/supabase/server";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
};

function capitalizeName(value: string | null | undefined): string {
  if (!value) return "—";

  return value
    .trim()
    .toLocaleLowerCase("es-PE")
    .replace(/(^|[\s'-])([\p{L}])/gu, (_, separator: string, letter: string) =>
      separator + letter.toLocaleUpperCase("es-PE"),
    );
}

function displayUppercase(value: string | null | undefined): string {
  return value?.trim() ? value.trim().toLocaleUpperCase("es-PE") : "—";
}

function displayLowercase(value: string | null | undefined): string {
  return value?.trim() ? value.trim().toLocaleLowerCase("es-PE") : "—";
}

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client, error } = await supabase
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
      notes,
      status,
      assets(count)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error al consultar el cliente:", error);
    throw new Error("No se pudo cargar la información del cliente.");
  }

  if (!client) {
    notFound();
  }

  const businessName = displayUppercase(client.business_name);
  const tradeName = displayUppercase(client.trade_name);
  const contactName = capitalizeName(client.contact_name);
  const email = client.email?.trim().toLowerCase() || "";
  const phone = client.phone?.trim() || "";
  const ruc = client.ruc?.trim() || "—";

  const address = capitalizeName(client.address);

  const locationParts = [
    client.district,
    client.province,
    client.department,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => capitalizeName(part));

  const location = locationParts.length
    ? locationParts.join(", ")
    : "—";

  const assetCount = client.assets?.[0]?.count ?? 0;

  const information = [
    { label: "Razón social", value: businessName },
    { label: "Nombre comercial", value: tradeName },
    { label: "RUC", value: ruc },
    { label: "Dirección", value: address },
    { label: "Ubicación", value: location },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <Link
          href="/admin/dashboard"
          className="transition hover:text-slate-700"
        >
          Dashboard
        </Link>

        <ChevronRight size={15} />

        <Link
          href="/admin/clientes"
          className="transition hover:text-slate-700"
        >
          Clientes
        </Link>

        <ChevronRight size={15} />

        <span className="font-medium text-slate-700">
          Ficha del cliente
        </span>
      </div>

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <Link
            href="/admin/clientes"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft size={17} strokeWidth={1.8} />
            Volver a clientes
          </Link>

          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
            Ficha del cliente
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {businessName}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Información general y recursos asociados a la empresa.
          </p>
        </div>

        <Link
          href={`/admin/clientes/${client.id}/editar`}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        >
          <Pencil size={16} />
          Editar cliente
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
          <div className="flex items-center justify-between">
            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <DoorClosed size={21} />
            </div>

            <span className="text-xs text-slate-400">Registrados</span>
          </div>

          <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
            {assetCount}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Activos asociados
          </p>

          <Link
            href={`/admin/activos?cliente=${client.id}`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition hover:text-slate-950"
          >
            Consultar activos
            <ChevronRight size={15} />
          </Link>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <FileText size={21} />
          </div>

          <p className="mt-5 text-lg font-semibold text-slate-950">
            Documentación
          </p>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            Certificados, garantías y documentos vinculados a sus activos.
          </p>

          <Link
            href={`/admin/documentos?cliente=${client.id}`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition hover:text-slate-950"
          >
            Ver documentos
            <ChevronRight size={15} />
          </Link>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 sm:col-span-2 xl:col-span-1">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Building2 size={21} />
          </div>

          <p className="mt-5 text-lg font-semibold text-slate-950">
            Acceso del cliente
          </p>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            Gestión de los usuarios autorizados para consultar sus activos.
          </p>

          <Link
            href={`/admin/usuarios?cliente=${client.id}`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition hover:text-slate-950"
          >
            Consultar usuarios
            <ChevronRight size={15} />
          </Link>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white xl:col-span-3">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Building2 size={18} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Datos de la empresa
              </h2>

              <p className="text-xs text-slate-500">
                Información registrada del cliente
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {information.map((item) => (
              <div
                key={item.label}
                className="border-b border-slate-100 px-5 py-4 sm:px-6"
              >
                <p className="mb-1.5 text-xs text-slate-400">
                  {item.label}
                </p>

                <p className="break-words text-sm font-medium text-slate-800">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {client.notes && (
            <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
              <p className="mb-1.5 text-xs text-slate-400">
                Observaciones
              </p>

              <p className="text-sm leading-6 text-slate-600">
                {displayLowercase(client.notes)}
              </p>
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white xl:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">
              Persona de contacto
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Canales de comunicación de la empresa
            </p>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <UserRound size={18} />
              </div>

              <div className="min-w-0 pt-0.5">
                <p className="text-xs text-slate-400">
                  Contacto principal
                </p>

                <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                  {contactName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Mail size={18} />
              </div>

              <div className="min-w-0 pt-0.5">
                <p className="text-xs text-slate-400">
                  Correo electrónico
                </p>

                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="mt-1 block break-all text-sm font-medium text-slate-700 transition hover:text-slate-950"
                  >
                    {email}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">—</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Phone size={18} />
              </div>

              <div className="min-w-0 pt-0.5">
                <p className="text-xs text-slate-400">Teléfono</p>

                {phone ? (
                  <a
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="mt-1 block text-sm font-medium text-slate-700 transition hover:text-slate-950"
                  >
                    {phone}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">—</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <MapPin size={18} />
              </div>

              <div className="min-w-0 pt-0.5">
                <p className="text-xs text-slate-400">Ubicación</p>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  {location}
                </p>

                {address !== "—" && (
                  <p className="mt-1 break-words text-sm text-slate-500">
                    {address}
                  </p>
                )}
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
