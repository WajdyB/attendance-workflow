"use client";

import { Eye, Download, FileText, Upload } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { useMemo, useState } from "react";

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

interface RecentDocumentsProps {
  userId: string;
  initialDocuments: DossierDocument[];
}

const formatFileSize = (bytes: number): string => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default function RecentDocuments({ userId, initialDocuments }: RecentDocumentsProps) {
  const { language } = useLanguage();
  const [documents, setDocuments] = useState<DossierDocument[]>(initialDocuments);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [isUploading, setIsUploading] = useState(false);

  const labels = useMemo(
    () =>
      language === "fr"
        ? {
            title: "Documents collaborateur",
            subtitle: "Upload, versioning, recherche et filtrage",
            search: "Rechercher...",
            all: "Toutes catégories",
            upload: "Ajouter un document",
            name: "Nom",
            cat: "Catégorie",
            version: "Version",
            date: "Date",
            tags: "Tags",
            actions: "Actions",
            empty: "Aucun document",
            emptySub: "Ajoutez votre premier document.",
            loading: "Upload en cours...",
          }
        : {
            title: "Collaborator documents",
            subtitle: "Upload, versioning, search and filtering",
            search: "Search...",
            all: "All categories",
            upload: "Add document",
            name: "Name",
            cat: "Category",
            version: "Version",
            date: "Date",
            tags: "Tags",
            actions: "Actions",
            empty: "No documents",
            emptySub: "Upload your first document.",
            loading: "Uploading...",
          },
    [language],
  );

  const categories = useMemo(() => {
    const unique = Array.from(new Set(documents.map((d) => d.category)));
    return ["ALL", ...unique];
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const categoryMatch = category === "ALL" || doc.category === category;
      const searchMatch =
        !search ||
        doc.title.toLowerCase().includes(search.toLowerCase()) ||
        (doc.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (doc.originalName || "").toLowerCase().includes(search.toLowerCase()) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

      return categoryMatch && searchMatch;
    });
  }, [documents, category, search]);

  const refreshDocuments = async () => {
    const params = new URLSearchParams();
    if (category !== "ALL") params.set("category", category);
    if (search) params.set("search", search);

    const data = await apiClient.get<DossierDocument[]>(
      `${apiConfig.endpoints.documents.byUser(userId)}${params.toString() ? `?${params.toString()}` : ""}`,
    );
    setDocuments(data);
  };

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const rawTitle = window.prompt(language === "fr" ? "Titre du document" : "Document title", file.name) || file.name;
    const rawCategory = window.prompt(
      language === "fr"
        ? "Catégorie (HR, CONTRACT, PAYROLL, REQUEST_ATTACHMENT, OTHER)"
        : "Category (HR, CONTRACT, PAYROLL, REQUEST_ATTACHMENT, OTHER)",
      "OTHER",
    ) || "OTHER";
    const rawTags = window.prompt(language === "fr" ? "Tags (séparés par virgule)" : "Tags (comma-separated)", "") || "";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", rawTitle);
    formData.append("category", rawCategory.toUpperCase());
    formData.append("tags", JSON.stringify(rawTags.split(",").map((tag) => tag.trim()).filter(Boolean)));
    formData.append("uploadedBy", userId);

    try {
      setIsUploading(true);
      await apiClient.request(apiConfig.endpoints.documents.upload(userId), {
        method: "POST",
        body: formData,
      });
      await refreshDocuments();
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-orange-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">{labels.title}</h3>
            <p className="text-sm text-stone-500 mt-1">{labels.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={labels.search}
              className="rounded-lg border border-orange-200 px-3 py-2 text-sm"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-orange-200 px-3 py-2 text-sm"
            >
              {categories.map((entry) => (
                <option key={entry} value={entry}>
                  {entry === "ALL" ? labels.all : entry}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg bg-orange-600 px-3 py-2 text-sm text-white hover:bg-orange-700">
              <Upload size={14} />
              {isUploading ? labels.loading : labels.upload}
              <input type="file" className="hidden" onChange={onUpload} disabled={isUploading} />
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-orange-100">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">{labels.name}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">{labels.cat}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">{labels.version}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">{labels.date}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">{labels.tags}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">{labels.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-50">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-stone-50 transition">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-orange-500" />
                      <div>
                        <p className="text-sm font-medium text-stone-800">{doc.title}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{formatFileSize(doc.fileSize)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-sm text-stone-600">{doc.category}</td>
                  <td className="py-3 px-6 text-sm text-stone-600">v{doc.versionNumber}</td>
                  <td className="py-3 px-6 text-sm text-stone-600">
                    {new Date(doc.createdAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US")}
                  </td>
                  <td className="py-3 px-6 text-xs text-stone-600">{doc.tags?.join(", ") || "-"}</td>
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition" onClick={() => window.open(doc.fileUrl, "_blank")}>
                        <Eye size={16} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = doc.fileUrl;
                          link.download = doc.originalName || doc.title;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 px-6 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={40} className="text-stone-300" />
                    <p className="text-sm text-stone-500">{labels.empty}</p>
                    <p className="text-xs text-stone-400">{labels.emptySub}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

