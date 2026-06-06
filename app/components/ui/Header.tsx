"use client";

import { useState } from "react";
import { Download, Upload, LayoutGrid, Settings, Heart } from "lucide-react";
import SettingsPanel from "./SettingsPanel";
import FavoritesPanel from "./FavoritesPanel";

interface HeaderProps {
  taskBarOpen: boolean;
  onToggleTaskBar: () => void;
}

export default function Header({ taskBarOpen, onToggleTaskBar }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  return (
    <>
      <header
        className="h-12 flex items-center justify-between px-4 flex-shrink-0"
        style={{
          background: "#f0f0f5",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTaskBar}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-all"
            style={{
              background: taskBarOpen ? "rgba(99,102,241,0.1)" : "transparent",
              border: `1px solid ${taskBarOpen ? "rgba(99,102,241,0.3)" : "var(--border)"}`,
              color: taskBarOpen ? "#6366f1" : "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              if (!taskBarOpen) {
                e.currentTarget.style.background = "var(--surface-hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!taskBarOpen) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            title={taskBarOpen ? "关闭项目栏" : "打开项目栏"}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>

          <img
            src="/icon/title.png"
            alt="Material Explorer Logo"
            className="h-8 w-8 rounded-xl object-cover"
          />
          <h1
            className="text-sm font-medium tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            Material Explorer
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-2 rounded-xl transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            title="加载"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-2 rounded-xl transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            title="保存"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setFavoritesOpen(true)}
            className="p-2 rounded-xl transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            title="收藏"
          >
            <Heart className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            title="设置"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {favoritesOpen && <FavoritesPanel onClose={() => setFavoritesOpen(false)} />}
    </>
  );
}
