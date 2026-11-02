
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "../../../../../lib/supabase/client";
import {
  Plus,
  FileText,
  File,
  FileImage,
  ExternalLink,
  Trash2,
  X,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Upload,
} from "lucide-react";

type UserRole = "vad_admin" | "vad_technician" | "client_user";

type DocumentType =
  | "certificate"
  | "technical_sheet"
  | "maintenance_report"
  | "photograph"
  | "other";

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
};

type Props = {
  assetId: string;
  role: UserRole;
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

export default function AssetDocuments({ assetId, role }: Props) {
  const [supabase] = useState(() => createClient());

  const [documents, setDocuments] = useState<AssetDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] =
    useState<DocumentType>("certificate");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = role === "vad_admin";

  // ==========================================
  // OBTENER MENSAJE REAL DEL ERROR
  // ==========================================

  function getErrorMessage(err: unknown): string {
    if (typeof err === "object" && err !== null) {
      const error = err as {
        message?: string;
        code?: string;
        details?: string;
        hint?: string;
      };

      console.error("Detalle del error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      const parts = [
        error.message,
        error.details,
        error.hint ? `Sugerencia: ${error.hint}` : null,
        error.code ? `Código: ${error.code}` : null,
      ].filter(Boolean);

      if (parts.length > 0) {
        return parts.join(" ");
      }
    }

    if (err instanceof Error) {
      return err.message;
    }

    return "Ocurrió un error inesperado. Inténtalo nuevamente.";
  }

  // ==========================================
  // CARGAR DOCUMENTOS
  // ==========================================

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
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
          created_at
        `)
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      setDocuments((data || []) as AssetDocument[]);
    } catch (err) {
      console.error("Error cargando documentos:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [assetId, supabase]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  // ==========================================
  // REINICIAR FORMULARIO
  // ==========================================

  function resetForm() {
    setTitle("");
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

  // ==========================================
  // SELECCIONAR ARCHIVO
  // ==========================================

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
  // VALIDAR FORMULARIO
  // ==========================================

  function validateForm() {
    if (!title.trim()) {
      setError("Ingresa el nombre del documento.");
      return false;
    }

    if (!selectedFile) {
      setError("Selecciona un archivo para continuar.");
      return false;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("El formato del archivo no está permitido.");
      return false;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("El archivo supera el límite permitido de 15 MB.");
      return false;
    }

    return true;
  }

  // ==========================================
  // GUARDAR DOCUMENTO
  // ==========================================

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!validateForm() || !selectedFile) return;

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
        throw new Error(
          "No se pudo determinar la extensión del archivo."
        );
      }

      const filePath = `${assetId}/${crypto.randomUUID()}.${extension}`;

      // Subir archivo a Storage
      const { error: uploadError } = await supabase.storage
        .from("asset-documents")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Registrar metadatos en la base de datos
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
        // Intentar eliminar el archivo si falla el registro.
        const { error: cleanupError } = await supabase.storage
          .from("asset-documents")
          .remove([filePath]);

        if (cleanupError) {
          console.error(
            "No se pudo limpiar el archivo después del error:",
            cleanupError
          );
        }

        throw insertError;
      }

      setModalOpen(false);
      resetForm();

      setSuccess("Documento agregado correctamente.");

      await loadDocuments();
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
        throw new Error(
          "No se pudo generar el enlace del documento."
        );
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
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
        console.error(
          "Error eliminando archivo de Storage:",
          storageError
        );

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
  // INTERFAZ
  // ==========================================

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">

        {/* ENCABEZADO */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <FileText size={19} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Documentación del activo
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Certificados, fichas técnicas y documentos relacionados.
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                setModalOpen(true);
              }}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Agregar documento
            </button>
          )}
        </div>

        <div className="p-5 sm:p-6">

          {/* MENSAJE DE ÉXITO */}
          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" />

              <p>{success}</p>

              <button
                type="button"
                onClick={() => setSuccess("")}
                className="ml-auto text-emerald-600 hover:text-emerald-800"
                aria-label="Cerrar mensaje"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* MENSAJE DE ERROR */}
          {error && !modalOpen && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />

              <p className="break-words">{error}</p>

              <button
                type="button"
                onClick={() => setError("")}
                className="ml-auto text-rose-600 hover:text-rose-800"
                aria-label="Cerrar mensaje"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* CARGANDO */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <LoaderCircle size={18} className="animate-spin" />
              Cargando documentos...
            </div>
          ) : documents.length === 0 ? (

            /* SIN DOCUMENTOS */
            <div className="flex flex-col items-center px-4 py-9 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <FolderOpen size={24} />
              </div>

              <p className="text-sm font-medium text-slate-800">
                No hay documentos registrados
              </p>

              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Los certificados y archivos relacionados con este activo
                aparecerán aquí.
              </p>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
                >
                  <Plus size={16} />
                  Agregar el primer documento
                </button>
              )}
            </div>
          ) : (

            /* LISTADO DE DOCUMENTOS */
            <div className="divide-y divide-slate-100">
              {documents.map((document) => {
                const FileIcon = getFileIcon(document.mime_type);

                return (
                  <div
                    key={document.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <FileIcon size={21} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {document.title}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          <span>
                            {documentTypeLabels[document.document_type]}
                          </span>

                          <span>·</span>

                          <span>
                            {formatFileSize(document.file_size)}
                          </span>

                          <span>·</span>

                          <span>{formatDate(document.created_at)}</span>
                        </div>

                        {document.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {document.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 pl-14 sm:pl-0">
                      <button
                        type="button"
                        onClick={() => void handleOpenDocument(document)}
                        disabled={openingId === document.id}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {openingId === document.id ? (
                          <LoaderCircle
                            size={14}
                            className="animate-spin"
                          />
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
                          aria-label={`Eliminar ${document.title}`}
                        >
                          {deletingId === document.id ? (
                            <LoaderCircle
                              size={15}
                              className="animate-spin"
                            />
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
          )}
        </div>
      </section>

      {/* ====================================== */}
      {/* MODAL AGREGAR DOCUMENTO */}
      {/* ====================================== */}

      {modalOpen && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-modal-title"
            className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >

            {/* CABECERA DEL MODAL */}
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
                    Registra un nuevo documento para este activo.
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

            {/* FORMULARIO */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5 sm:p-6">

                {/* ERROR */}
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <p className="break-words">{error}</p>
                  </div>
                )}

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
                      handleFileChange(
                        event.target.files?.[0] || null
                      );
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>

              {/* BOTONES */}
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
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />
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
    </>
  );
}
