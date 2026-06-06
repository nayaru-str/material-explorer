"use client";

import { useState, useEffect } from "react";
import { X, Download, Trash2, Heart } from "lucide-react";

interface FavoriteItem {
  url: string;
  savedAt: number;
}

interface FavoritesPanelProps {
  onClose: () => void;
}

export default function FavoritesPanel({ onClose }: FavoritesPanelProps) {
  const [items, setItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem("material-favorites") || "[]"));
  }, []);

  const removeFavorite = (url: string) => {
    const next = items.filter((f) => f.url !== url);
    setItems(next);
    localStorage.setItem("material-favorites", JSON.stringify(next));
  };

  const downloadImage = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `favorite-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      console.error("下载失败");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: 560,
          height: 480,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <Heart size={15} style={{ color: "#ef4444" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                我的收藏
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                共 {items.length} 张
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Heart size={36} style={{ color: "var(--text-tertiary)", opacity: 0.4 }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                暂无收藏
              </p>
              <p className="text-xs" style={{ color: "var(--text-tertiary)", opacity: 0.6 }}>
                在生成结果处点击「收藏」保存图片
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="group relative rounded-xl overflow-hidden"
                  style={{ border: "1.5px solid var(--border)", background: "#f4f5f7" }}
                >
                  <img
                    src={item.url}
                    alt={`收藏 ${i + 1}`}
                    className="w-full object-cover"
                    style={{ height: 160 }}
                  />
                  {/* Overlay */}
                  <div
                    className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.45)" }}
                  >
                    <button
                      onClick={() => downloadImage(item.url)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                      style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
                      title="下载"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => removeFavorite(item.url)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                      style={{ background: "rgba(239,68,68,0.25)", color: "#fca5a5" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.4)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.25)")}
                      title="取消收藏"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {/* Timestamp */}
                  <div
                    className="absolute bottom-0 left-0 right-0 px-2 py-1"
                    style={{ background: "rgba(0,0,0,0.3)" }}
                  >
                    <p className="text-[9px] truncate" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {new Date(item.savedAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
