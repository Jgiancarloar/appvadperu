
"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "../../../../lib/supabase/client";
import {
  FileText,
  File,
  FileImage,
  Search,
  Plus,
  ExternalLink,
  Trash2,
  X,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Upload,
  Building2,
  Package,
  ShieldCheck,
  ClipboardList,
  ChevronRight,
  Filter,
} from "lucide-react";

type UserRole = "vad_admin" | "vad_technician";

type DocumentType =
  | "certificate"
  | "technical_sheet"
  | "maintenance_report"
  | "photograph"
  | "other";

type Client = {
  business_name: string;
  trade_name: string | null;
};

type Asset = {
  id: string;
  asset_code: string;
  name: string;
  client_id: string;
  clients: Client | null;
};

type AssetDocument = {
  id: string;
  asset_id: string;
  title: string;
  document_type: DocumentType;
  description: string | null;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
  assets: Asset | null;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const documentTypes: {
  value: DocumentType;
  label: string;
}[] = [
  { value: "certificate", label: "Certificado" },
  { value: "technical_sheet", label: "Ficha técnica" },
  { value: "maintenance_report", label: "Informe de mantenimiento" },
  { value: "photograph", label: "Fotografía" },
  { value: "other", label: "Otro documento" },
];

const documentTypeLabels: Record<DocumentType, string> = {
  certificate: "Certificado",
  technical_sheet: "Ficha técnica",
  maintenance_report: "Informe de mantenimiento",
  photograph: "Fotografía",
  other: "Otro documento",
};

export default function DocumentosPage() {
  const [supabase] = useState(() => createClient());

  const [documents, setDocuments] = useState<AssetDocument[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assetId, setAssetId] = useState("");
  const [documentType, setDocumentType] =
    useState<DocumentType>("certificate");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = role === "vad_admin";

  // ==========================================
  // MENSAJE DE ERROR
  // ==========================================

  function getErrorMessage(err: unknown): string {
    if (typeof err === "object" && err !== null) {
      const error = err as {
        message?: string;
        code?: string;
        details?: string;
        hint?: string;
      };

      console.error("Detalle del error:", error);

      const parts = [
        error.message,
        error.details,
        error.hint ? `Sugerencia: ${error.hint}` : null,
        error.code ? `Código: ${error.code}` : null,
      ].filter(Boolean);

      if (parts.length > 0) return parts.join(" ");
    }

    if (err instanceof Error) return err.message;

    return "Ocurrió un error inesperado.";
  }

  // ==========================================
  // CARGAR DATOS
  // ==========================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [sessionResult, assetsResult, documentsResult] =
        await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),

          supabase
            .from("assets")
            .select(`
              id,
              asset_code,
              name,
              client_id,
              clients (
                business_name,
                trade_name
              )
            `)
            .order("asset_code", { ascending: true }),

          supabase
            .from("asset_documents")
            .select(`
              id,
              asset_id,
              title,
              document_type,
              description,
              file_path,
              file_name,
              mime_type,
              file_size,
              uploaded_by,
              created_at,
              assets (
                id,
                asset_code,
                name,
                client_id,
                clients (
                  business_name,
                  trade_name
                )
              )
            `)
            .order("created_at", { ascending: false }),
        ]);

      const sessionData = await sessionResult.json();

      if (!sessionResult.ok) {
        throw new Error(
          sessionData.error || "No se pudo verificar tu sesión."
        );
      }

      const userRole = sessionData.user?.role;

      if (userRole !== "vad_admin" && userRole !== "vad_technician") {
        throw new Error("No tienes permisos para consultar documentos.");
      }

      if (assetsResult.error) throw assetsResult.error;
      if (documentsResult.error) throw documentsResult.error;

      setRole(userRole);
      setAssets((assetsResult.data || []) as unknown as Asset[]);
      setDocuments(
        (documentsResult.data || []) as unknown as AssetDocument[]
      );
    } catch (err) {
      console.error("Error cargando documentos:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ==========================================
  // CLIENTES DISPONIBLES
  // ==========================================

  const clients = useMemo(() => {
    const map = new Map<string, string>();

    assets.forEach((asset) => {
      if (!asset.client_id) return;

      const name =
        asset.clients?.trade_name ||
        asset.clients?.business_name ||
        "Cliente sin nombre";

      map.set(asset.client_id, name);
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [assets]);

  // ==========================================
  // FILTRAR DOCUMENTOS
  // ==========================================

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return documents.filter((document) => {
      const asset = document.assets;

      const clientName =
        asset?.clients?.trade_name ||
        asset?.clients?.business_name ||
        "";

      const matchesSearch =
        !query ||
        [
          document.title,
          document.file_name,
          document.description,
          asset?.asset_code,
          asset?.name,
          clientName,
        ].some((value) => value?.toLowerCase().includes(query));

      const matchesType =
        typeFilter === "all" ||
        document.document_type === typeFilter;

      const matchesClient =
        clientFilter === "all" ||
        asset?.client_id === clientFilter;

      return matchesSearch && matchesType && matchesClient;
    });
  }, [documents, search, typeFilter, clientFilter]);

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  const stats = useMemo(
    () => ({
      total: documents.length,
      certificates: documents.filter(
        (document) => document.document_type === "certificate"
      ).length,
      technicalSheets: documents.filter(
        (document) => document.document_type === "technical_sheet"
      ).length,
      maintenanceReports: documents.filter(
        (document) => document.document_type === "maintenance_report"
      ).length,
    }),
    [documents]
  );

  // ==========================================
  // FORMULARIO
  // ==========================================

  function resetForm() {
    setTitle("");
    setAssetId("");
    setDocumentType("certificate");
    setDescription("");
    setSelectedFile(null);
    setError("");
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    resetForm();
  }

  function openModal() {
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function handleFileChange(file: File | null) {
    setError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setSelectedFile(null);
      setError("El formato debe ser PDF, JPG, PNG o WEBP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setError("El archivo supera el límite permitido de 15 MB.");
      return;
    }

    setSelectedFile(file);
  }

  // ==========================================
  // GUARDAR DOCUMENTO
  // ==========================================

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!assetId) {
      setError("Selecciona el activo al que pertenece el documento.");
      return;
    }

    if (!title.trim()) {
      setError("Ingresa el nombre del documento.");
      return;
    }

    if (!selectedFile) {
      setError("Selecciona un archivo para continuar.");
      return;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("El formato del archivo no está permitido.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("El archivo supera el límite permitido de 15 MB.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Tu sesión ha expirado. Inicia sesión nuevamente."
        );
      }

      const extension = selectedFile.name
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      if (!extension) {
        throw new Error("No se pudo determinar la extensión del archivo.");
      }

      const filePath = `${assetId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("asset-documents")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("asset_documents")
        .insert({
          asset_id: assetId,
          title: title.trim(),
          document_type: documentType,
          description: description.trim() || null,
          file_path: filePath,
          file_name: selectedFile.name,
          mime_type: selectedFile.type,
          file_size: selectedFile.size,
          uploaded_by: user.id,
        });

      if (insertError) {
        const { error: cleanupError } = await supabase.storage
          .from("asset-documents")
          .remove([filePath]);

        if (cleanupError) {
          console.error("Error limpiando archivo:", cleanupError);
        }

        throw insertError;
      }

      setModalOpen(false);
      resetForm();
      setSuccess("Documento agregado correctamente.");

      await loadData();
    } catch (err) {
      console.error("Error guardando documento:", err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // ABRIR DOCUMENTO
  // ==========================================

  async function handleOpenDocument(document: AssetDocument) {
    try {
      setOpeningId(document.id);

      const { data, error: signedUrlError } = await supabase.storage
        .from("asset-documents")
        .createSignedUrl(document.file_path, 60);

      if (signedUrlError) throw signedUrlError;

      if (!data?.signedUrl) {
        throw new Error("No se pudo generar el enlace del documento.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Error abriendo documento:", err);
      setError(getErrorMessage(err));
    } finally {
      setOpeningId(null);
    }
  }

  // ==========================================
  // ELIMINAR DOCUMENTO
  // ==========================================

  async function handleDeleteDocument(document: AssetDocument) {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar "${document.title}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      setDeletingId(document.id);

      const { error: deleteError } = await supabase
        .from("asset_documents")
        .delete()
        .eq("id", document.id);

      if (deleteError) throw deleteError;

      setDocuments((current) =>
        current.filter((item) => item.id !== document.id)
      );

      const { error: storageError } = await supabase.storage
        .from("asset-documents")
        .remove([document.file_path]);

      if (storageError) {
        console.error("Error eliminando archivo:", storageError);
        setError(
          "El registro fue eliminado, pero no se pudo eliminar el archivo almacenado. " +
            getErrorMessage(storageError)
        );
      } else {
        setSuccess("Documento eliminado correctamente.");
      }
    } catch (err) {
      console.error("Error eliminando documento:", err);
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getFileIcon(mimeType: string) {
    if (mimeType === "application/pdf") return FileText;
    if (mimeType.startsWith("image/")) return FileImage;
    return File;
  }

  // ==========================================
  // CARGANDO
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle size={18} className="animate-spin" />
          Cargando documentación...
        </div>
      </div>
    );
  }

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="space-y-7 pb-8">

      {/* ENCABEZADO */}
      <section>
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Administración</span>
          <ChevronRight size={13} className="text-slate-300" />
          <span className="text-slate-700">Documentos</span>
        </div>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Documentos
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Gestiona los certificados, fichas técnicas y documentos de los activos.
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={openModal}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus size={17} />
              Agregar documento
            </button>
          )}
        </div>
      </section>

      {/* MENSAJES */}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          <p>{success}</p>
          <button
            type="button"
            onClick={() => setSuccess("")}
            className="ml-auto"
            aria-label="Cerrar mensaje"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <p className="break-words">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto"
            aria-label="Cerrar mensaje"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* RESUMEN */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Documentos registrados"
          value={stats.total}
          icon={<FileText size={20} />}
          color="bg-slate-100 text-slate-700"
        />

        <SummaryCard
          title="Certificados"
          value={stats.certificates}
          icon={<ShieldCheck size={20} />}
          color="bg-emerald-50 text-emerald-700"
        />

        <SummaryCard
          title="Fichas técnicas"
          value={stats.technicalSheets}
          icon={<ClipboardList size={20} />}
          color="bg-blue-50 text-blue-700"
        />

        <SummaryCard
          title="Informes de mantenimiento"
          value={stats.maintenanceReports}
          icon={<FileText size={20} />}
          color="bg-amber-50 text-amber-700"
        />
      </section>

      {/* LISTADO */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">

        {/* FILTROS */}
        <div className="space-y-4 border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">
              Buscar y filtrar documentos
            </h2>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por documento, activo, código o cliente..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="all">Todos los tipos</option>
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="all">Todos los clientes</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* RESULTADOS */}
        <div className="border-b border-slate-100 px-5 py-3 sm:px-6">
          <p className="text-xs text-slate-500">
            Mostrando{" "}
            <span className="font-semibold text-slate-800">
              {filteredDocuments.length}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-800">
              {documents.length}
            </span>{" "}
            documentos
          </p>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <FolderOpen size={24} />
            </div>

            <p className="text-sm font-medium text-slate-800">
              {documents.length === 0
                ? "Todavía no hay documentos registrados"
                : "No se encontraron documentos"}
            </p>

            <p className="mt-1 max-w-md text-xs text-slate-500">
              {documents.length === 0
                ? "Los documentos que registres en las fichas de los activos aparecerán también aquí."
                : "Prueba modificando los filtros o el término de búsqueda."}
            </p>

            {isAdmin && documents.length === 0 && (
              <button
                type="button"
                onClick={openModal}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
              >
                <Plus size={16} />
                Agregar documento
              </button>
            )}
          </div>
        ) : (
          <>
            {/* TABLA DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50/80">
                  <tr className="text-xs font-semibold text-slate-500">
                    <th className="px-6 py-3">Documento</th>
                    <th className="px-4 py-3">Activo</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-6 py-3 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredDocuments.map((document) => {
                    const FileIcon = getFileIcon(document.mime_type);

                    const clientName =
                      document.assets?.clients?.trade_name ||
                      document.assets?.clients?.business_name ||
                      "Cliente no disponible";

                    return (
                      <tr key={document.id} className="transition hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                              <FileIcon size={19} />
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[230px] truncate text-sm font-semibold text-slate-800">
                                {document.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatFileSize(document.file_size)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Package size={15} className="shrink-0 text-slate-400" />
                            <div>
                              <p className="text-xs font-semibold text-slate-700">
                                {document.assets?.asset_code || "—"}
                              </p>
                              <p className="mt-0.5 max-w-[160px] truncate text-xs text-slate-500">
                                {document.assets?.name || "Activo no disponible"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex max-w-[180px] items-center gap-2 text-xs text-slate-600">
                            <Building2 size={14} className="shrink-0 text-slate-400" />
                            <span className="truncate">{clientName}</span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {documentTypeLabels[document.document_type]}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                          {formatDate(document.created_at)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void handleOpenDocument(document)}
                              disabled={openingId === document.id}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              {openingId === document.id ? (
                                <LoaderCircle size={14} className="animate-spin" />
                              ) : (
                                <ExternalLink size={14} />
                              )}
                              Abrir
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteDocument(document)}
                                disabled={deletingId === document.id}
                                className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                title="Eliminar documento"
                              >
                                {deletingId === document.id ? (
                                  <LoaderCircle size={15} className="animate-spin" />
                                ) : (
                                  <Trash2 size={15} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TARJETAS MOBILE */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredDocuments.map((document) => {
                const FileIcon = getFileIcon(document.mime_type);

                const clientName =
                  document.assets?.clients?.trade_name ||
                  document.assets?.clients?.business_name ||
                  "Cliente no disponible";

                return (
                  <div key={document.id} className="space-y-3 p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <FileIcon size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-slate-800">
                          {document.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {documentTypeLabels[document.document_type]} ·{" "}
                          {formatFileSize(document.file_size)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pl-[52px] text-xs text-slate-500">
                      <p>
                        <span className="font-medium text-slate-700">Activo:</span>{" "}
                        {document.assets?.asset_code || "—"} ·{" "}
                        {document.assets?.name || "No disponible"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-700">Cliente:</span>{" "}
                        {clientName}
                      </p>
                      <p>{formatDate(document.created_at)}</p>
                    </div>

                    <div className="flex gap-2 pl-[52px]">
                      <button
                        type="button"
                        onClick={() => void handleOpenDocument(document)}
                        disabled={openingId === document.id}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 disabled:opacity-50"
                      >
                        {openingId === document.id ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <ExternalLink size={14} />
                        )}
                        Abrir
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteDocument(document)}
                          disabled={deletingId === document.id}
                          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          aria-label={`Eliminar ${document.title}`}
                        >
                          {deletingId === document.id ? (
                            <LoaderCircle size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* MODAL AGREGAR DOCUMENTO */}
      {modalOpen && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-modal-title"
            className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <FileText size={19} />
                </div>

                <div>
                  <h2
                    id="document-modal-title"
                    className="text-base font-semibold text-slate-900"
                  >
                    Agregar documento
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Registra un nuevo documento y asígnalo a un activo.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Cerrar modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5 sm:p-6">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <p className="break-words">{error}</p>
                  </div>
                )}

                {/* ACTIVO */}
                <div>
                  <label
                    htmlFor="document-asset"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Activo relacionado{" "}
                    <span className="text-rose-600">*</span>
                  </label>

                  <select
                    id="document-asset"
                    value={assetId}
                    onChange={(event) => setAssetId(event.target.value)}
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                  >
                    <option value="">Seleccionar activo</option>
                    {assets.map((asset) => {
                      const clientName =
                        asset.clients?.trade_name ||
                        asset.clients?.business_name ||
                        "Cliente";

                      return (
                        <option key={asset.id} value={asset.id}>
                          {asset.asset_code} — {asset.name} ({clientName})
                        </option>
                      );
                    })}
                  </select>

                  {assets.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      No hay activos disponibles para asignar documentos.
                    </p>
                  )}
                </div>

                {/* NOMBRE */}
                <div>
                  <label
                    htmlFor="document-title"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Nombre del documento{" "}
                    <span className="text-rose-600">*</span>
                  </label>

                  <input
                    id="document-title"
                    type="text"
                    maxLength={150}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ej. Certificado de operatividad"
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                  />
                </div>

                {/* TIPO */}
                <div>
                  <label
                    htmlFor="document-type"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Tipo de documento{" "}
                    <span className="text-rose-600">*</span>
                  </label>

                  <select
                    id="document-type"
                    value={documentType}
                    onChange={(event) =>
                      setDocumentType(event.target.value as DocumentType)
                    }
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                  >
                    {documentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DESCRIPCIÓN */}
                <div>
                  <label
                    htmlFor="document-description"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Descripción{" "}
                    <span className="font-normal text-slate-400">
                      (opcional)
                    </span>
                  </label>

                  <textarea
                    id="document-description"
                    rows={3}
                    maxLength={1000}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Agrega información adicional sobre el documento..."
                    disabled={saving}
                    className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                  />
                </div>

                {/* ARCHIVO */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Archivo <span className="text-rose-600">*</span>
                  </label>

                  <label
                    htmlFor="document-file"
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-7 text-center transition ${
                      selectedFile
                        ? "border-emerald-300 bg-emerald-50/50"
                        : "border-slate-300 bg-slate-50/70 hover:border-slate-400 hover:bg-slate-50"
                    } ${saving ? "pointer-events-none opacity-60" : ""}`}
                  >
                    {selectedFile ? (
                      <>
                        <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                          <FileText size={22} />
                        </div>

                        <p className="max-w-full break-all text-sm font-medium text-slate-800">
                          {selectedFile.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatFileSize(selectedFile.size)}
                        </p>

                        <span className="mt-2 text-xs font-semibold text-emerald-700">
                          Cambiar archivo
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                          <Upload size={21} />
                        </div>

                        <p className="text-sm font-medium text-slate-700">
                          Selecciona un archivo para subir
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          PDF, JPG, PNG o WEBP
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Tamaño máximo: 15 MB
                        </p>
                      </>
                    )}
                  </label>

                  <input
                    id="document-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={saving}
                    onChange={(event) => {
                      handleFileChange(event.target.files?.[0] || null);
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving || assets.length === 0}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Guardar documento
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// TARJETA DE RESUMEN
// ==========================================

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className={`flex size-10 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>

        <span className="text-xs text-slate-400">Registrados</span>
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">{title}</p>
    </article>
  );
}
