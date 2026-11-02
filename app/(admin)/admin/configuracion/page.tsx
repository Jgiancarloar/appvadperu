
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ImagePlus,
  Upload,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";

type LogoType = "logo_url" | "document_logo_url";

type Settings = {
  company_name: string;
  trade_name: string;
  tax_id: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  document_logo_url: string;
};

const initialSettings: Settings = {
  company_name: "",
  trade_name: "",
  tax_id: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  logo_url: "",
  document_logo_url: "",
};

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<LogoType | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const documentLogoInputRef = useRef<HTMLInputElement>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [documentLogoPreview, setDocumentLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/settings");

        if (!response.ok) {
          throw new Error("No se pudo cargar la información de la empresa.");
        }

        const data = await response.json();

        if (data.settings) {
          const saved = data.settings;

          setSettings({
            company_name: saved.company_name ?? "",
            trade_name: saved.trade_name ?? "",
            tax_id: saved.tax_id ?? "",
            address: saved.address ?? "",
            phone: saved.phone ?? "",
            email: saved.email ?? "",
            website: saved.website ?? "",
            logo_url: saved.logo_url ?? "",
            document_logo_url: saved.document_logo_url ?? "",
          });
        }
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Ocurrió un error al cargar.",
        );
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  function handleChange(field: keyof Settings, value: string) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar la información.");
      }

      if (data.settings) {
        const saved = data.settings;

        setSettings({
          company_name: saved.company_name ?? "",
          trade_name: saved.trade_name ?? "",
          tax_id: saved.tax_id ?? "",
          address: saved.address ?? "",
          phone: saved.phone ?? "",
          email: saved.email ?? "",
          website: saved.website ?? "",
          logo_url: saved.logo_url ?? "",
          document_logo_url: saved.document_logo_url ?? "",
        });
      }

      setMessage("La información de la empresa se guardó correctamente.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ocurrió un error al guardar.",
      );
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File, type: LogoType) {
    setMessage("");

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Formato no permitido. Selecciona PNG, JPG o WEBP.");
      setMessageType("error");
      return;
    }

    if (file.size <= 0 || file.size > 2 * 1024 * 1024) {
      setMessage("La imagen debe pesar como máximo 2 MB.");
      setMessageType("error");
      return;
    }

    const localPreview = URL.createObjectURL(file);

    if (type === "logo_url") {
      setLogoPreview(localPreview);
    } else {
      setDocumentLogoPreview(localPreview);
    }

    setUploading(type);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch("/api/admin/settings/logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo subir el logo.");
      }

      setSettings((current) => ({
        ...current,
        [type]: data.path,
      }));

      if (type === "logo_url") {
        setLogoPreview(data.signedUrl || localPreview);
      } else {
        setDocumentLogoPreview(data.signedUrl || localPreview);
      }

      setMessage("Logo actualizado correctamente.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ocurrió un error al subir.",
      );
      setMessageType("error");

      if (type === "logo_url") {
        setLogoPreview(null);
      } else {
        setDocumentLogoPreview(null);
      }
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(null);

      if (type === "logo_url" && logoInputRef.current) {
        logoInputRef.current.value = "";
      }

      if (type === "document_logo_url" && documentLogoInputRef.current) {
        documentLogoInputRef.current.value = "";
      }
    }
  }

  function LogoUploader({
    title,
    description,
    type,
    preview,
    inputRef,
  }: {
    title: string;
    description: string;
    type: LogoType;
    preview: string | null;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) {
    const isUploading = uploading === type;

    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-[13px] font-medium text-slate-700">{title}</h3>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>

        <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          {preview ? (
            <img
              src={preview}
              alt={title}
              className="h-24 max-w-full object-contain"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white text-slate-300">
              <ImageIcon className="h-9 w-9" />
            </div>
          )}

          {isUploading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Subiendo imagen...
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              {preview ? "Logo cargado" : "Selecciona una imagen para subir"}
            </p>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleUpload(file, type);
          }}
        />

        <button
          type="button"
          disabled={!!uploading}
          onClick={() => inputRef.current?.click()}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}

          {isUploading ? "Subiendo..." : preview ? "Reemplazar logo" : "Subir logo"}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Administra la información general de tu empresa.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Información de la empresa
              </h2>
              <p className="text-xs text-slate-500">
                Datos generales, fiscales y de contacto.
              </p>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            {(
              [
                ["Razón social", "company_name", "Ej. VAD-PERU E.I.R.L."],
                ["Nombre comercial", "trade_name", "Ej. VAD-PERU"],
                ["RUC", "tax_id", "20123456789"],
                ["Teléfono", "phone", "+51 999 999 999"],
                ["Correo electrónico", "email", "contacto@empresa.com"],
                ["Página web", "website", "www.vad-peru.com"],
              ] as const
            ).map(([label, field, placeholder]) => (
              <div key={field} className="space-y-2">
                <label className="text-[13px] font-medium text-slate-700">
                  {label}
                </label>
                <input
                  type={field === "email" ? "email" : "text"}
                  value={settings[field]}
                  onChange={(event) => handleChange(field, event.target.value)}
                  placeholder={placeholder}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />

                {field === "website" && (
                  <p className="text-xs text-slate-400">
                    Puedes escribir tu dominio con o sin https://.
                  </p>
                )}
              </div>
            ))}

            <div className="space-y-2 sm:col-span-2">
              <label className="text-[13px] font-medium text-slate-700">
                Dirección fiscal
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(event) => handleChange("address", event.target.value)}
                placeholder="Dirección de la empresa"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <ImagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Logotipos
              </h2>
              <p className="text-xs text-slate-500">
                Identidad visual de la empresa y sus documentos.
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
            <LogoUploader
              title="Logo de la empresa"
              description="Se utilizará en el sistema y sus paneles."
              type="logo_url"
              preview={logoPreview}
              inputRef={logoInputRef}
            />

            <LogoUploader
              title="Logo para documentos"
              description="Se utilizará en certificados y reportes."
              type="document_logo_url"
              preview={documentLogoPreview}
              inputRef={documentLogoInputRef}
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !!uploading}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
