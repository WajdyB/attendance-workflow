"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, BarChart2, FolderKanban } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Project } from "@/components/projects/types";
import ProjectList from "@/components/projects/project-list";
import ProjectDetail from "@/components/projects/project-detail";
import ProjectForm from "@/components/projects/project-form";
import ProjectReports from "@/components/projects/project-reports";

type ViewState = "list" | "detail" | "reports";

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
}

export default function ProjectsPage() {
  const { databaseUser, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const tl = (fr: string, en: string) => (language === "fr" ? fr : en);

  const roleDesc = databaseUser?.role?.description?.toLowerCase() ?? "";
  const isAdmin = roleDesc.includes("admin");
  const isManager = roleDesc.includes("manager");

  const [view, setView] = useState<ViewState>("list");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      if (isAdmin || isManager) {
        const data = await apiClient.get<Project[]>(apiConfig.endpoints.projects.all());
        setProjects(data);
      } else {
        // Collaborator: only their assigned projects
        const data = await apiClient.get<Project[]>(
          apiConfig.endpoints.projects.byUser(databaseUser!.id)
        );
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isManager, databaseUser]);

  useEffect(() => {
    if (!databaseUser) return;
    fetchProjects();
  }, [databaseUser, fetchProjects]);

  // Fetch users for the lead picker (admin/manager only)
  useEffect(() => {
    if (!isAdmin && !isManager) return;
    const fetchUsers = async () => {
      try {
        const data = await apiClient.get<{ data: UserOption[] } | UserOption[]>(
          apiConfig.endpoints.users.all
        );
        const list = Array.isArray(data) ? data : (data as any).data ?? [];
        setUsers(list.map((u: any) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
        })));
      } catch {
        // ignore
      }
    };
    fetchUsers();
  }, [isAdmin, isManager]);

  const handleProjectCreated = (project: Project) => {
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === project.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = project;
        return next;
      }
      return [project, ...prev];
    });
    setEditProject(null);
  };

  const handleDelete = async (project: Project) => {
    if (
      !confirm(
        language === "fr"
          ? `Supprimer le projet « ${project.name} » ? Cette action est irréversible.`
          : `Delete project "${project.name}"? This cannot be undone.`
      )
    )
      return;

    setDeletingId(project.id);
    try {
      await apiClient.delete(apiConfig.endpoints.projects.delete(project.id));
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      if (selectedProject?.id === project.id) {
        setSelectedProject(null);
        setView("list");
      }
    } catch {
      // handle error silently
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (project: Project) => {
    setSelectedProject(project);
    setView("detail");
  };

  const handleBack = () => {
    setSelectedProject(null);
    setView("list");
    fetchProjects();
  };

  if (authLoading || (!databaseUser && !authLoading)) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin" size={28} style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{tl("Suivi de Projet", "Project Tracking")}</h1>
          <p className="page-subtitle">
            {tl(
              "Gérez vos projets, équipes et suivez le temps passé",
              "Manage your projects, teams and track time spent"
            )}
          </p>
        </div>

        {view === "list" && (
          <div className="flex gap-2">
            {(isAdmin || isManager) && (
              <button
                onClick={() => setView(view === "reports" ? "list" : "reports")}
                className="btn-ghost"
              >
                <BarChart2 size={15} />
                {tl("Rapports", "Reports")}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => { setEditProject(null); setShowForm(true); }}
                className="btn-primary"
              >
                <Plus size={15} />
                {tl("Nouveau projet", "New project")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      ) : view === "detail" && selectedProject ? (
        <ProjectDetail
          project={selectedProject}
          isAdmin={isAdmin}
          isManager={isManager}
          onBack={handleBack}
          onEdit={
            isAdmin || isManager
              ? () => {
                  setEditProject(selectedProject);
                  setShowForm(true);
                }
              : undefined
          }
        />
      ) : view === "reports" ? (
        <div className="space-y-5">
          <button
            onClick={() => setView("list")}
            className="text-sm flex items-center gap-1 transition"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}
          >
            ← {tl("Retour aux projets", "Back to projects")}
          </button>
          <ProjectReports />
        </div>
      ) : (
        <ProjectList
          projects={projects}
          isAdmin={isAdmin}
          onEdit={(p) => {
            setEditProject(p);
            setShowForm(true);
          }}
          onDelete={handleDelete}
          onSelect={handleSelect}
        />
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <ProjectForm
          editProject={editProject ?? undefined}
          users={users}
          onClose={() => {
            setShowForm(false);
            setEditProject(null);
          }}
          onSuccess={(project) => {
            handleProjectCreated(project);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
