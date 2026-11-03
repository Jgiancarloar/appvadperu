
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Factory,
  Hash,
  Info,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  Tag,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AssetStatus = "active" | "inactive" | "maintenance";

type Asset = {
  id: string;
  asset_code: string;
  reference: string | null;
  name: string;
  description: string | null;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  installation_date: string | null;
  status: AssetStatus;
  created_at: string;
  updated_at: string;
};

type AssetDocument = {
  id: string;
  title: string;
  document_type:
    | "certificate"
    | "technical_sheet"
    | "maintenance_report"
    | "photograph"
    | "other";
  description: string | null;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  url: string | null;
};

type Incident = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

const statusConfig: Record<
  AssetStatus,
  { label: string; className: string; dot: string }
> = {
  active: {
    label: "Activo",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  inactive: {
    label: "Inactivo",
    className: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-400",
  },
  maintenance: {
    label: "En mantenimiento",
    className: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
};

const priorityConfig = {
  low: {
    label: "Baja",
    className: "bg-slate-100 text-slate-600",
  },
  medium: {
    label: "Media",
    className: "bg-blue-50 text-blue-700",
  },
  high: {
    label: "Alta",
    className: "bg-amber-50 text-amber-700",
  },
  critical: {
    label: "Crítica",
    className: "bg-rose-50 text-rose-700",
  },
};

const incidentStatusConfig = {
  open: {
    label: "Abierta",
    className: "bg-rose-50 text-rose-700",
  },
  in_progress: {
    label: "En proceso",
    className: "bg-amber-50 text-amber-700",
  },
  resolved: {
    label: "Resuelta",
    className: "bg-emerald-50 text-emerald-700",
  },
  closed: {
    label: "Cerrada",
    className: "bg-slate-100 text-slate-600",
  },
};

const documentTypeLabels: Record<AssetDocument["document_type"], string> = {
  certificate: "Certificado",
  technical_sheet: "Ficha técnica",
  maintenance_report: "Informe de mantenimiento",
  photograph: "Fotografía",
  other: "Otro documento",
};

function formatDate(date: string | null) {
  if (!date) return "No registrada";

  return new Date(`${date}T00:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(date: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  icon?: LucideIcon;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {label}
      </p>

      <p className="break-words text-sm font-medium text-slate-800">
        {value || "No registrado"}
      </p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}
      >
        <Icon size={19} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default function ClientAssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const assetId = params.id as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [documents, setDocuments] = useState<AssetDocument[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [documentsError, setDocumentsError] = useState("");
  const [incidentsError, setIncidentsError] = useState("");

  const loadAsset = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setDocumentsError("");
      setIncidentsError("");

      // La política RLS limita automáticamente los activos
      // que puede consultar el usuario cliente autenticado.
      const assetResult = await supabase
        .from("assets")
        .select(`
          id,
          asset_code,
          reference,
          name,
          description,
          location,
          manufacturer,
          model,
          serial_number,
          installation_date,
          status,
          created_at,
          updated_at
        `)
        .eq("id", assetId)
        .single();

      if (assetResult.error) {
        if (assetResult.error.code === "PGRST116") {
          throw new Error(
            "No se encontró el activo o no tienes permiso para consultarlo.",
          );
        }

        throw assetResult.error;
      }

      setAsset(assetResult.data as Asset);

      // Consultar documentos e incidencias del activo.
      const [documentsResult, incidentsResult] = await Promise.all([
        supabase
          .from("asset_documents")
          .select(`
            id,
            title,
            document_type,
            description,
            file_path,
            file_name,
            mime_type,
            file_size,
            created_at
          `)
          .eq("asset_id", assetId)
          .order("created_at", { ascending: false }),

        supabase
          .from("incidents")
          .select(`
            id,
            title,
            description,
            priority,
            status,
            resolution_notes,
            resolved_at,
            created_at,
            updated_at
          `)
          .eq("asset_id", assetId)
          .order("created_at", { ascending: false }),
      ]);

      if (documentsResult.error) {
        console.error("Error consultando documentos:", documentsResult.error);
        setDocumentsError("No se pudieron cargar los documentos.");
      } else {
        const documentsWithUrls = await Promise.all(
          (documentsResult.data || []).map(async (document) => {
            const { data } = await supabase.storage
              .from("asset-documents")
              .createSignedUrl(document.file_path, 3600);

            return {
              ...document,
              url: data?.signedUrl || null,
            };
          }),
        );

        setDocuments(documentsWithUrls as AssetDocument[]);
      }

      if (incidentsResult.error) {
        console.error("Error consultando incidencias:", incidentsResult.error);
        setIncidentsError("No se pudo cargar el historial de incidencias.");
      } else {
        setIncidents((incidentsResult.data || []) as Incident[]);
      }
    } catch (err) {
      console.error("Error cargando detalle del activo:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la información del activo.",
      );
    } finally {
      setLoading(false);
    }
  }, [assetId, supabase]);

  useEffect(() => {
    if (assetId) {
      void loadAsset();
    }
  }, [assetId, loadAsset]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => router.push("/cliente/activos")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Volver a mis activos
        </button>

        <div className="rounded-2xl border border-rose-200 bg-white px-6 py-14 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <AlertCircle size={23} />
          </div>

          <h2 className="font-semibold text-slate-900">
            No se pudo cargar el activo
          </h2>

          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {error || "El activo solicitado no está disponible."}
          </p>

          <button
            type="button"
            onClick={() => void loadAsset()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <RefreshCw size={15} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const status = statusConfig[asset.status];

  return (
    <div className="space-y-7 pb-8">
      {/* Encabezado */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
          <Link
            href="/cliente/dashboard"
            className="transition hover:text-slate-900"
          >
            Portal del cliente
          </Link>

          <ChevronRight size={13} className="text-slate-300" />

          <Link
            href="/cliente/activos"
            className="transition hover:text-slate-900"
          >
            Mis activos
          </Link>

          <ChevronRight size={13} className="text-slate-300" />

          <span className="text-slate-700">{asset.asset_code}</span>
        </div>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600">
              <Package size={23} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {asset.name}
                </h1>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.className}`}
                >
                  <span className={`size-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Código:{" "}
                <span className="font-medium text-slate-700">
                  {asset.asset_code}
                </span>

                {asset.reference && <span> · Referencia: {asset.reference}</span>}
              </p>
            </div>
          </div>

          <Link
            href="/cliente/activos"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Volver
          </Link>
        </div>
      </div>

      {/* Información general */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <SectionHeader
          icon={Info}
          title="Información general"
          description="Datos de identificación del activo."
          color="bg-blue-50 text-blue-600"
        />

        <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          <InfoItem
            label="Código del activo"
            value={asset.asset_code}
            icon={Hash}
          />

          <InfoItem
            label="Nombre del activo"
            value={asset.name}
            icon={Package}
          />

          <InfoItem
            label="Referencia"
            value={asset.reference}
            icon={Tag}
          />

          <div className="sm:col-span-2 lg:col-span-3">
            <InfoItem
              label="Descripción"
              value={asset.description}
              icon={FileText}
            />
          </div>
        </div>
      </section>

      {/* Datos técnicos */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <SectionHeader
          icon={Wrench}
          title="Datos técnicos"
          description="Fabricante y características técnicas del activo."
          color="bg-violet-50 text-violet-600"
        />

        <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          <InfoItem
            label="Fabricante"
            value={asset.manufacturer}
            icon={Factory}
          />

          <InfoItem
            label="Modelo"
            value={asset.model}
            icon={Package}
          />

          <InfoItem
            label="Número de serie"
            value={asset.serial_number}
            icon={Hash}
          />
        </div>
      </section>

      {/* Instalación y estado */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <SectionHeader
          icon={CalendarDays}
          title="Instalación y estado"
          description="Ubicación física y situación actual del activo."
          color="bg-emerald-50 text-emerald-600"
        />

        <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          <InfoItem
            label="Ubicación"
            value={asset.location}
            icon={MapPin}
          />

          <InfoItem
            label="Fecha de instalación"
            value={formatDate(asset.installation_date)}
            icon={CalendarDays}
          />

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500">
              Estado actual
            </p>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.className}`}
            >
              <span className={`size-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
        </div>
      </section>

      {/* Documentación */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <SectionHeader
          icon={FileText}
          title="Documentación del activo"
          description="Documentos técnicos y archivos asociados a este activo."
          color="bg-blue-50 text-blue-600"
        />

        <div className="p-5 sm:p-6">
          {documentsError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {documentsError}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <FileText size={23} />
              </div>

              <p className="text-sm font-medium text-slate-800">
                No hay documentos registrados
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Todavía no se han agregado documentos a este activo.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <FileText size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-800">
                        {document.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {documentTypeLabels[document.document_type] ||
                          "Documento"}
                        {" · "}
                        {formatFileSize(document.file_size)}
                      </p>

                      {document.description && (
                        <p className="mt-1 text-xs text-slate-500">
                          {document.description}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDateTime(document.created_at)}
                      </p>
                    </div>
                  </div>

                  {document.url ? (
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <ExternalLink size={14} />
                      Abrir documento
                    </a>
                  ) : (
                    <span className="text-xs text-rose-600">
                      Archivo no disponible
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Historial de incidencias */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <SectionHeader
          icon={AlertCircle}
          title="Historial de incidencias"
          description="Reportes y observaciones registrados sobre este activo."
          color="bg-rose-50 text-rose-600"
        />

        <div className="p-5 sm:p-6">
          {incidentsError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {incidentsError}
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <CheckCircle2 size={23} />
              </div>

              <p className="text-sm font-medium text-slate-800">
                No hay incidencias registradas
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Este activo no tiene reportes registrados hasta el momento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => {
                const priority = priorityConfig[incident.priority];
                const incidentStatus =
                  incidentStatusConfig[incident.status];

                return (
                  <article
                    key={incident.id}
                    className="rounded-xl border border-slate-200 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {incident.title}
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {incident.description}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${priority.className}`}
                        >
                          Prioridad {priority.label}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${incidentStatus.className}`}
                        >
                          {incidentStatus.label}
                        </span>
                      </div>
                    </div>

                    {incident.resolution_notes && (
                      <div className="mt-4 rounded-lg bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-semibold text-slate-600">
                          Observaciones de resolución
                        </p>

                        <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">
                          {incident.resolution_notes}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={13} />
                        Reportada: {formatDateTime(incident.created_at)}
                      </span>

                      {incident.resolved_at && (
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle2 size={13} />
                          Resuelta: {formatDateTime(incident.resolved_at)}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Información del registro */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock size={14} />
          <span>Registro creado: {formatDateTime(asset.created_at)}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} />
          <span>
            Última actualización: {formatDateTime(asset.updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
