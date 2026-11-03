"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import AssetDocuments from "./AssetDocuments";
import { QRCodeCanvas } from "qrcode.react";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronRight,
  FileText,
  Hash,
  MapPin,
  Package,
  Pencil,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Wrench,
  Factory,
  Tag,
  Info,
  Clock,
  AlertCircle,
  Download,
} from "lucide-react";

type AssetStatus = "active" | "inactive" | "maintenance";

type UserRole = "vad_admin" | "vad_technician" | "client_user";

type Asset = {
  id: string;
  client_id: string;
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
  qr_token: string;
  created_at: string;
  updated_at: string;
  clients: {
    business_name: string;
    trade_name: string | null;
  } | null;
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

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const assetId = params.id as string;

  const qrContainerRef = useRef<HTMLDivElement>(null);

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<UserRole>("client_user");
  const [appOrigin, setAppOrigin] = useState("");

  // Obtener el dominio actual de la aplicación.
  useEffect(() => {
    setAppOrigin(window.location.origin);
  }, []);

  // Generar enlace público del activo.
  const publicAssetUrl =
    asset && appOrigin
      ? `${appOrigin}/activo/${asset.qr_token}`
      : "";

  // Cargar información del activo.
  const loadAsset = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [assetResult, sessionResult] = await Promise.all([
        supabase
          .from("assets")
          .select(`
            id,
            client_id,
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
            qr_token,
            created_at,
            updated_at,
            clients (
              business_name,
              trade_name
            )
          `)
          .eq("id", assetId)
          .single(),

        fetch("/api/auth/session"),
      ]);

      if (assetResult.error) {
        if (assetResult.error.code === "PGRST116") {
          throw new Error("No se encontró el activo solicitado.");
        }

        throw assetResult.error;
      }

      const sessionData = await sessionResult.json();

      if (!sessionResult.ok) {
        throw new Error(
          sessionData.error || "No se pudo verificar tu sesión.",
        );
      }

      const userRole = sessionData.user?.role;

      if (
        userRole !== "vad_admin" &&
        userRole !== "vad_technician" &&
        userRole !== "client_user"
      ) {
        throw new Error(
          "No tienes un rol válido para consultar este activo.",
        );
      }

      setRole(userRole);
      setIsAdmin(userRole === "vad_admin");
      setAsset(assetResult.data as unknown as Asset);
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

  // Descargar código QR.
  const handleDownloadQR = () => {
    const canvas = qrContainerRef.current?.querySelector("canvas");

    if (!canvas || !asset) return;

    const link = document.createElement("a");

    link.download = `QR-${asset.asset_code}.png`;
    link.href = canvas.toDataURL("image/png");

    link.click();
  };

  // Copiar enlace público.
  const handleCopyLink = async () => {
    if (!publicAssetUrl) return;

    try {
      await navigator.clipboard.writeText(publicAssetUrl);
    } catch (err) {
      console.error("No se pudo copiar el enlace:", err);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "No registrada";

    return new Date(`${date}T00:00:00`).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getClientName = () => {
    if (!asset?.clients) return "Cliente no disponible";

    return (
      asset.clients.trade_name ||
      asset.clients.business_name ||
      "Cliente no disponible"
    );
  };

  const InfoItem = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: string | null;
    icon?: React.ElementType;
  }) => (
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

  const SectionHeader = ({
    icon: Icon,
    title,
    description,
    color,
  }: {
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
  }) => (
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
          onClick={() => router.push("/admin/activos")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Volver a activos
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

                {asset.reference && (
                  <span> · Referencia: {asset.reference}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href="/admin/activos"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Volver
            </Link>

            {isAdmin && (
              <Link
                href={`/admin/activos/${asset.id}/editar`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Pencil size={15} />
                Editar activo
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Información general */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <SectionHeader
          icon={Info}
          title="Información general"
          description="Datos de identificación y empresa responsable del activo."
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

          <InfoItem
            label="Cliente"
            value={getClientName()}
            icon={Building2}
          />

          <div className="sm:col-span-2">
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
          description="Información del fabricante y características técnicas."
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

      {/* Identificación QR / NFC */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <SectionHeader
          icon={QrCode}
          title="Identificación QR / NFC"
          description="Código de acceso único para consultar este activo."
          color="bg-slate-100 text-slate-600"
        />

        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
          <div
            ref={qrContainerRef}
            className="flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3"
          >
            {publicAssetUrl ? (
              <QRCodeCanvas
                value={publicAssetUrl}
                size={180}
                level="H"
                marginSize={2}
              />
            ) : (
              <div className="flex size-[180px] items-center justify-center">
                <RefreshCw
                  className="animate-spin text-slate-400"
                  size={24}
                />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">
              Código QR del activo
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Escanea este código para acceder a la ficha pública del activo.
              También podrás utilizar el mismo enlace en una etiqueta NFC.
            </p>

            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium text-slate-500">
                Enlace público
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="break-all font-mono text-xs text-slate-600">
                  {publicAssetUrl || "Generando enlace..."}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadQR}
                disabled={!publicAssetUrl}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={16} />
                Descargar QR
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!publicAssetUrl}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Copiar enlace
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Formato PNG · Alta corrección de errores.
            </p>
          </div>
        </div>
      </section>

      {/* Documentación del activo */}
      <AssetDocuments assetId={asset.id} role={role} />

      {/* Incidencias */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <SectionHeader
          icon={AlertCircle}
          title="Incidencias"
          description="Historial de reportes y observaciones relacionados con el activo."
          color="bg-rose-50 text-rose-600"
        />

        <div className="flex flex-col items-center px-5 py-10 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <Wrench size={23} />
          </div>

          <p className="text-sm font-medium text-slate-800">
            Historial de incidencias pendiente
          </p>

          <p className="mt-1 max-w-md text-xs text-slate-500">
            Aquí se mostrarán los reportes, observaciones y trabajos
            realizados sobre este activo.
          </p>
        </div>
      </section>

      {/* Información del registro */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock size={14} />
          <span>
            Registro creado: {formatDateTime(asset.created_at)}
          </span>
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