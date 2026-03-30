"use client";

import { Eye, Download, FileText, Upload, X, Tag, Search, Loader2, FolderOpen } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DossierDocument = {
  id: string;
  title: string;
  category: string;
  description?: string | null;
  versionNumber: number;
  tags: string[];
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  originalName?: string | null;
};

interface DocumentsPanelProps {
  userId: string;
  initialDocuments: DossierDocument[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const CATEGORIES = ["HR", "CONTRACT", "PAYROLL", "REQUEST_ATTACHMENT", "OTHER"] as const;

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  HR:                  { bg: "#6366f122", color: "#6366f1" },
  CONTRACT:            { bg: "#f59e0b22", color: "#f59e0b" },
  PAYROLL:             { bg: "#22c55e22", color: "#22c55e" },
  REQUEST_ATTACHMENT:  { bg: "#3b82f622", color: "#3b82f6" },
  OTHER:               { bg: "#71717a22", color: "#71717a" },
};

const CategoryBadge = ({ category }: { category: string }) => {
  const style = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHER;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: style.bg, color: style.color }}
    >
      {category}
    </span>
  );
};

// ─── Upload modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  userId: string;
  file: File;
  language: string;
  onClose: () => void;
  onSuccess: () => void;
}

function UploadModal({ userId, file, language, onClose, onSuccess }: UploadModalProps) {
  const fr = language === "fr";
  const [title, setTitle] = useState(file.name.replace(/\.[^/.]+$/, ""));
  const [category, setCategory] = useState<string>("OTHER");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!title.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("category", category);
      formData.append("tags", JSON.stringify(tags.split(",").map((t) => t.trim()).filter(Boolean)));
      formData.append("uploadedBy", userId);

      await apiClient.request(apiConfig.endpoints.documents.upload(userId), {
        method: "POST",
        body: formData,
      });
      onSuccess();
    } catch {
      setError(fr ? "Échec de l'upload, réessayez." : "Upload failed, please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold" style={{ color: "var(--text-1)" }}>
            {fr ? "Ajouter un document" : "Upload document"}
          </h3>
          <button onClick={onClose} className="p-1 rounded cursor-pointer" style={{ color: "var(--text-3)" }}>
            <X size={18} />
          </button>
        </div>

        {/* File info */}
        <div className="flex items-center gap-3 rounded-xl p-3 mb-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <FileText size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>{file.name}</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>{formatFileSize(file.size)}</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-2)" }}>
              {fr ? "Titre *" : "Title *"}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              placeholder={fr ? "Nom du document" : "Document name"}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-2)" }}>
              {fr ? "Catégorie" : "Category"}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-1)" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-2)" }}>
              {fr ? "Tags (séparés par virgule)" : "Tags (comma-separated)"}
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              placeholder={fr ? "ex : urgent, RH, 2025" : "e.g. urgent, HR, 2025"}
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs" style={{ color: "#ef4444" }}>{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost" disabled={uploading}>
            {fr ? "Annuler" : "Cancel"}
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !title.trim()}
            className="btn-primary disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 size={14} className="animate-spin" />{fr ? "Upload…" : "Uploading…"}</>
            ) : (
              <><Upload size={14} />{fr ? "Envoyer" : "Upload"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function DocumentsPanel({ userId, initialDocuments }: DocumentsPanelProps) {
  const { language } = useLanguage();
  const fr = language === "fr";

  const [documents, setDocuments] = useState<DossierDocument[]>(initialDocuments);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(documents.map((d) => d.category)));
    return ["ALL", ...unique];
  }, [documents]);

  const filtered = useMemo(() =>
    documents.filter((doc) => {
      const catOk = category === "ALL" || doc.category === category;
      const q = search.toLowerCase();
      const searchOk = !q ||
        doc.title.toLowerCase().includes(q) ||
        (doc.originalName ?? "").toLowerCase().includes(q) ||
        (doc.description ?? "").toLowerCase().includes(q) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(q));
      return catOk && searchOk;
    }),
    [documents, category, search]
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      const data = await apiClient.get<DossierDocument[]>(apiConfig.endpoints.documents.byUser(userId));
      setDocuments(Array.isArray(data) ? data : []);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  };

  return (
    <>
      {/* Upload modal */}
      {pendingFile && (
        <UploadModal
          userId={userId}
          file={pendingFile}
          language={language}
          onClose={() => setPendingFile(null)}
          onSuccess={async () => {
            setPendingFile(null);
            await refresh();
          }}
        />
      )}

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-1">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={fr ? "Rechercher…" : "Search…"}
                className="w-full rounded-lg py-2 pl-8 pr-3 text-sm outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              />
            </div>
            {/* Category filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-1)" }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c === "ALL" ? (fr ? "Toutes catégories" : "All categories") : c}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={refresh}
              disabled={refreshing}
              className="btn-ghost"
            >
              {refreshing ? <Loader2 size={14} className="animate-spin" /> : null}
              {fr ? "Rafraîchir" : "Refresh"}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
            >
              <Upload size={14} />
              {fr ? "Ajouter" : "Upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChosen}
            />
          </div>
        </div>

        {/* Count */}
        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          {filtered.length} {fr ? "document(s)" : "document(s)"}
          {search || category !== "ALL" ? (fr ? " trouvé(s)" : " found") : ""}
        </p>

        {/* Table / empty */}
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl py-16 gap-3"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          >
            <FolderOpen size={40} style={{ color: "var(--text-3)" }} className="opacity-30" />
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              {fr ? "Aucun document" : "No documents"}
            </p>
            {!search && category === "ALL" && (
              <button onClick={() => fileInputRef.current?.click()} className="btn-primary mt-1">
                <Upload size={14} />
                {fr ? "Ajouter le premier document" : "Upload first document"}
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {/* Header */}
            <div
              className="grid px-5 py-3 text-xs font-semibold uppercase tracking-wide"
              style={{
                background: "var(--bg)",
                borderBottom: "1px solid var(--border)",
                color: "var(--text-3)",
                gridTemplateColumns: "1fr auto auto auto auto",
              }}
            >
              <span>{fr ? "Document" : "Document"}</span>
              <span className="hidden sm:block">{fr ? "Catégorie" : "Category"}</span>
              <span className="hidden md:block px-4">{fr ? "Tags" : "Tags"}</span>
              <span className="px-4">{fr ? "Date" : "Date"}</span>
              <span>{fr ? "Actions" : "Actions"}</span>
            </div>

            {/* Rows */}
            {filtered.map((doc, idx) => (
              <div
                key={doc.id}
                className="grid items-center px-5 py-3.5"
                style={{
                  background: idx % 2 === 0 ? "var(--surface)" : "var(--bg)",
                  borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : undefined,
                  gridTemplateColumns: "1fr auto auto auto auto",
                }}
              >
                {/* Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
                  >
                    <FileText size={14} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>{doc.title}</p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>
                      {formatFileSize(doc.fileSize)} · v{doc.versionNumber}
                    </p>
                  </div>
                </div>

                {/* Category */}
                <div className="hidden sm:block">
                  <CategoryBadge category={doc.category} />
                </div>

                {/* Tags */}
                <div className="hidden md:flex items-center gap-1 px-4 flex-wrap max-w-[160px]">
                  {doc.tags?.length > 0 ? (
                    doc.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs"
                        style={{ background: "var(--bg)", color: "var(--text-3)", border: "1px solid var(--border)" }}
                      >
                        <Tag size={9} />
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "var(--text-3)" }}>—</span>
                  )}
                </div>

                {/* Date */}
                <span className="px-4 text-xs" style={{ color: "var(--text-3)" }}>
                  {new Date(doc.createdAt).toLocaleDateString(fr ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "2-digit" })}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    title={fr ? "Aperçu" : "Preview"}
                    onClick={() => window.open(doc.fileUrl, "_blank")}
                    className="p-2 rounded-lg cursor-pointer transition-colors"
                    style={{ color: "var(--text-3)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    title={fr ? "Télécharger" : "Download"}
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = doc.fileUrl;
                      a.download = doc.originalName || doc.title;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="p-2 rounded-lg cursor-pointer transition-colors"
                    style={{ color: "var(--text-3)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                  >
                    <Download size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
