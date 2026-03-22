"use client";

import { Eye, Download, FileText } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function RecentDocuments() {
  const { databaseUser } = useAuth();
  const documents = databaseUser?.documents || [];

  // Get status based on category
  const getStatus = (category: string): "verified" | "pending" => {
    return category === "CONTRACT" ? "verified" : "pending";
  };

  if (!databaseUser) {
    return (
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden p-8 text-center">
        <p className="text-stone-500">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-orange-100">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">
              Recent Documents
            </h3>
            <p className="text-sm text-stone-500 mt-1">
              Manage your personal and work documents
            </p>
          </div>
          <button className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1">
            View all
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-orange-100">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                DOCUMENT NAME
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                CATEGORY
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                UPLOAD DATE
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                STATUS
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-50">
            {documents.length > 0 ? (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-stone-50 transition">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-orange-500" />
                      <div>
                        <p className="text-sm font-medium text-stone-800">
                          {doc.title}
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {formatFileSize(doc.fileSize)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <span className="text-sm text-stone-600">
                      {doc.category}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <span className="text-sm text-stone-600">
                      {formatDate(doc.createdAt)}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        getStatus(doc.category) === "verified"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {getStatus(doc.category) === "verified"
                        ? "VERIFIED"
                        : "PENDING"}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
                        onClick={() => window.open(doc.fileUrl, "_blank")}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = doc.fileUrl;
                          link.download = doc.title;
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
                <td colSpan={5} className="py-8 px-6 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={40} className="text-stone-300" />
                    <p className="text-sm text-stone-500">No documents found</p>
                    <p className="text-xs text-stone-400">
                      Your uploaded documents will appear here
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {documents.length > 0 && (
        <div className="p-4 border-t border-orange-100 bg-stone-50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              Showing {documents.length} of {documents.length} documents
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm text-stone-600 border border-orange-200 rounded-md hover:bg-orange-50 transition">
                Previous
              </button>
              <button className="px-3 py-1 text-sm text-stone-600 border border-orange-200 rounded-md hover:bg-orange-50 transition">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
