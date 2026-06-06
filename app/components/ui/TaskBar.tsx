"use client";

import { useState, useRef, useEffect } from "react";
import { FolderOpen, Plus, Clock, MoreHorizontal, Trash2, Pencil, Check, X } from "lucide-react";
import { useWorkflowStore, type WorkflowProject } from "../../hooks/useWorkflowStore";

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `今天 ${new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  if (diff < day) return new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (diff < 2 * day) return "昨天 " + new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  return new Date(ts).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) + " " +
    new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export default function TaskBar() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const projects = useWorkflowStore((s) => s.projects);
  const currentProjectId = useWorkflowStore((s) => s.currentProjectId);
  const createProject = useWorkflowStore((s) => s.createProject);
  const switchProject = useWorkflowStore((s) => s.switchProject);
  const renameProject = useWorkflowStore((s) => s.renameProject);
  const deleteProject = useWorkflowStore((s) => s.deleteProject);

  const projectList = Object.values(projects).sort((a, b) => b.updatedAt - a.updatedAt);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId !== null) {
      setTimeout(() => editInputRef.current?.focus(), 50);
    }
  }, [editingId]);

  const handleNewProject = () => {
    createProject();
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    setMenuOpenId(null);
  };

  const handleRename = (id: string) => {
    const project = projectList.find((p) => p.id === id);
    if (project) {
      setEditingId(id);
      setEditingName(project.name);
      setMenuOpenId(null);
    }
  };

  const handleRenameConfirm = () => {
    if (editingId && editingName.trim()) {
      renameProject(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName("");
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRenameConfirm();
    if (e.key === "Escape") handleRenameCancel();
  };

  return (
    <aside
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <p
          className="text-[11px] font-semibold tracking-widest uppercase"
          style={{ color: "var(--text-tertiary)" }}
        >
          项目
        </p>
        <button
          onClick={handleNewProject}
          className="flex h-5 w-5 items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,0,0,0.06)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-tertiary)";
          }}
          title="新建项目"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {projectList.map((project) => (
          <div
            key={project.id}
            onClick={() => !editingId && switchProject(project.id)}
            onMouseEnter={() => setHoveredId(project.id)}
            onMouseLeave={() => {
              setHoveredId(null);
              if (!menuOpenId) setMenuOpenId(null);
            }}
            className="group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
            style={{
              background:
                currentProjectId === project.id
                  ? "rgba(99,102,241,0.08)"
                  : hoveredId === project.id
                  ? "rgba(0,0,0,0.03)"
                  : "transparent",
              border:
                currentProjectId === project.id
                  ? "1.5px solid rgba(99,102,241,0.25)"
                  : "1.5px solid transparent",
            }}
          >
            {/* Active indicator */}
            {currentProjectId === project.id && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                style={{ background: "#6366f1" }}
              />
            )}

            {/* Icon */}
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
              style={{
                background:
                  currentProjectId === project.id
                    ? "rgba(99,102,241,0.12)"
                    : "rgba(0,0,0,0.04)",
                border:
                  currentProjectId === project.id
                    ? "1px solid rgba(99,102,241,0.2)"
                    : "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <FolderOpen
                size={14}
                style={{
                  color: currentProjectId === project.id ? "#6366f1" : "var(--text-tertiary)",
                }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {editingId === project.id ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    className="flex-1 px-2 py-1 rounded-lg text-xs font-medium"
                    style={{
                      border: "1.5px solid #6366f1",
                      background: "white",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleRenameConfirm}
                    className="flex h-5 w-5 items-center justify-center rounded-lg"
                    style={{ color: "#10b981" }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={handleRenameCancel}
                    className="flex h-5 w-5 items-center justify-center rounded-lg"
                    style={{ color: "#ef4444" }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <p
                    className="text-xs font-medium truncate"
                    style={{
                      color:
                        currentProjectId === project.id
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {project.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={9} style={{ color: "var(--text-tertiary)" }} />
                    <p
                      className="text-[10px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {formatTime(project.updatedAt)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            {hoveredId === project.id && editingId !== project.id && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <div className="relative" ref={menuOpenId === project.id ? menuRef : null}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === project.id ? null : project.id);
                    }}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: "var(--text-tertiary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0,0,0,0.06)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-tertiary)";
                    }}
                    title="更多"
                  >
                    <MoreHorizontal size={12} />
                  </button>

                  {/* Dropdown menu */}
                  {menuOpenId === project.id && (
                    <div
                      className="absolute right-0 top-full mt-1 w-36 z-50 rounded-xl overflow-hidden"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-md)",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(project.id);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs transition-colors"
                        style={{ color: "var(--text-secondary)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                          e.currentTarget.style.color = "var(--text-primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }}
                      >
                        <Pencil size={12} />
                        重命名
                      </button>
                      <div style={{ borderTop: "1px solid var(--border)" }} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs transition-colors"
                        style={{ color: "#ef4444" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(239,68,68,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <Trash2 size={12} />
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          <span className="font-medium">{projectList.length}</span> 个项目
        </p>
      </div>
    </aside>
  );
}
