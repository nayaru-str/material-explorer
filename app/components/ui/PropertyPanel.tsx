"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useWorkflowStore } from "../../hooks/useWorkflowStore";
import { PRESET_COLORS, MATERIAL_TYPES } from "../../lib/types";
import {
  Trash2,
  Copy,
  Eye,
  Upload,
  Sparkles,
  RotateCcw,
  Download,
  Plus,
  Scissors,
} from "lucide-react";
import { useSegmentation } from "../canvas/SegmentationProvider";

// ─── Color conversion helpers ──────────────────────────────────
function hexToHsv(hex: string) {
  let h = 0, s = 0, v = 0;
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return hexToHsv(`#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`);
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    v = max;
    s = max === 0 ? 0 : d / max;
    if (d === 0) {
      h = 0;
    } else if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    } else if (max === g) {
      h = ((b - r) / d + 2) * 60;
    } else {
      h = ((r - g) / d + 4) * 60;
    }
  }
  return { h, s: s * 100, v: v * 100 };
}

function hsvToHex(h: number, s: number, v: number): string {
  s /= 100; v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ─── Color Wheel (hue ring + sat/val square) ─────────────────────
function ColorWheel({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const hueRef = useRef<HTMLCanvasElement>(null);
  const squareRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef<"hue" | "square" | null>(null);

  const hsv = hexToHsv(value);

  // Draw hue ring
  useEffect(() => {
    const canvas = hueRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    const r = size / 2;
    const innerR = r - 14;
    ctx.clearRect(0, 0, size, size);
    for (let angle = 0; angle < 360; angle += 1) {
      const rad = ((angle - 90) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(r, r, r - 1, rad, rad + Math.PI / 180);
      ctx.arc(r, r, innerR, rad + Math.PI / 180, rad, true);
      ctx.closePath();
      ctx.fillStyle = hsvToHex(angle, 100, 100);
      ctx.fill();
    }
  }, []);

  // Draw sat/val square
  useEffect(() => {
    const canvas = squareRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    // Horizontal: saturation (white → hue)
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const s = (x / w) * 100;
        const v = 100 - (y / h) * 100;
        ctx.fillStyle = hsvToHex(hsv.h, s, v);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [hsv.h]);

  const getHueAngle = (e: MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = e.clientX - rect.left - cx;
    const dy = e.clientY - rect.top - cy;
    return ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
  };

  const getSatVal = (e: MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const s = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const v = Math.min(100, Math.max(0, 100 - ((e.clientY - rect.top) / rect.height) * 100));
    return { s, v };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, which: "hue" | "square") => {
    dragging.current = which;
    const canvas = which === "hue" ? hueRef.current : squareRef.current;
    if (!canvas) return;
    if (which === "hue") {
      const hue = getHueAngle(e.nativeEvent, canvas);
      onChange(hsvToHex(hue, hsv.s, hsv.v));
    } else {
      const { s, v } = getSatVal(e.nativeEvent, canvas);
      onChange(hsvToHex(hsv.h, s, v));
    }
    const move = (ev: MouseEvent) => {
      if (dragging.current === "hue") {
        const hue = getHueAngle(ev, hueRef.current!);
        onChange(hsvToHex(hue, hsv.s, hsv.v));
      } else if (dragging.current === "square") {
        const { s, v } = getSatVal(ev, squareRef.current!);
        onChange(hsvToHex(hsv.h, s, v));
      }
    };
    const up = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, [hsv, onChange]);

  const hueAngle = ((hsv.h + 90) * Math.PI) / 180;
  const hueR = 56;
  const hueX = 70 + hueR * Math.cos(hueAngle - Math.PI / 2);
  const hueY = 70 + hueR * Math.sin(hueAngle - Math.PI / 2);
  const sqW = 100;
  const sqH = 100;
  const sqX = (hsv.s / 100) * sqW;
  const sqY = ((100 - hsv.v) / 100) * sqH;

  return (
    <div className="flex items-start gap-4">
      {/* Hue ring */}
      <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
        <canvas
          ref={hueRef}
          width={140}
          height={140}
          onMouseDown={(e) => handleMouseDown(e, "hue")}
          className="cursor-crosshair rounded-full"
          style={{ display: "block" }}
        />
        {/* Hue indicator */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white pointer-events-none"
          style={{
            left: hueX - 8,
            top: hueY - 8,
            background: hsvToHex(hsv.h, 100, 100),
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }}
        />
      </div>

      {/* Saturation × Value square + controls */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        {/* Sat/Val square */}
        <div className="relative" style={{ width: "100%", aspectRatio: "1" }}>
          <canvas
            ref={squareRef}
            width={120}
            height={120}
            onMouseDown={(e) => handleMouseDown(e, "square")}
            className="cursor-crosshair rounded-xl"
            style={{ width: "100%", height: "100%", display: "block" }}
          />
          {/* Square indicator */}
          <div
            className="absolute border-2 border-white pointer-events-none rounded-full"
            style={{
              width: 12, height: 12,
              left: sqX - 6, top: sqY - 6,
              boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
              background: "transparent",
            }}
          />
        </div>

        {/* Sliders */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-8" style={{ color: "var(--text-tertiary)" }}>饱和</span>
            <input
              type="range" min={0} max={100} value={Math.round(hsv.s)}
              onChange={(e) => onChange(hsvToHex(hsv.h, Number(e.target.value), hsv.v))}
              className="flex-1"
            />
            <span className="text-[10px] font-mono w-8 text-right" style={{ color: "var(--text-tertiary)" }}>
              {Math.round(hsv.s)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-8" style={{ color: "var(--text-tertiary)" }}>明度</span>
            <input
              type="range" min={0} max={100} value={Math.round(hsv.v)}
              onChange={(e) => onChange(hsvToHex(hsv.h, hsv.s, Number(e.target.value)))}
              className="flex-1"
            />
            <span className="text-[10px] font-mono w-8 text-right" style={{ color: "var(--text-tertiary)" }}>
              {Math.round(hsv.v)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Image Panel ──────────────────────────────────────────────
function ImagePanel({
  imageUrl,
  onUpload,
  onRemove,
  label,
  accent,
  onSegmentation,
  hasMask,
}: {
  imageUrl?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  label: string;
  accent: string;
  onSegmentation?: () => void;
  hasMask?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden file input — always in DOM so ref works for re-upload */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />

      {/* Preview */}
      <div
        className="relative rounded-2xl overflow-hidden flex items-center justify-center"
        style={{
          height: 200,
          background: "#f4f5f7",
          border: "1.5px solid var(--border)",
        }}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={label}
              className="w-full h-full object-contain"
            />
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-xl transition-colors"
              style={{
                background: "rgba(255,255,255,0.9)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <Trash2 size={13} />
            </button>
            {hasMask && (
              <div
                className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                style={{ background: "rgba(96,165,250,0.85)", color: "#fff" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#fff" }} />
                已选区
              </div>
            )}
          </>
        ) : (
          <label
            className="flex flex-col items-center justify-center gap-2 cursor-pointer w-full h-full"
            style={{ color: "var(--text-tertiary)" }}
          >
            <div
              className="flex items-center justify-center h-12 w-12 rounded-2xl"
              style={{ background: `${accent}14`, border: `1px solid ${accent}25` }}
            >
              <Upload size={20} style={{ color: accent }} />
            </div>
            <span className="text-xs">点击上传图片</span>
          </label>
        )}
      </div>

      {/* Re-upload button when image exists */}
      {imageUrl && (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all"
          style={{
            border: "1.5px solid var(--border)",
            color: "var(--text-secondary)",
            background: "var(--surface)",
          }}
        >
          <RotateCcw size={12} />
          重新上传
        </button>
      )}

      {/* Segmentation button */}
      {imageUrl && onSegmentation && (
        <button
          onClick={onSegmentation}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all"
          style={{
            border: "1.5px solid rgba(96,165,250,0.25)",
            background: hasMask ? "rgba(96,165,250,0.08)" : "rgba(96,165,250,0.05)",
            color: "#60a5fa",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(96,165,250,0.12)";
            e.currentTarget.style.borderColor = "rgba(96,165,250,0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = hasMask ? "rgba(96,165,250,0.08)" : "rgba(96,165,250,0.05)";
            e.currentTarget.style.borderColor = "rgba(96,165,250,0.25)";
          }}
        >
          <Scissors size={12} />
          {hasMask ? "调整选区" : "选择分割区域"}
        </button>
      )}
    </div>
  );
}

// ─── Prompt Panel ─────────────────────────────────────────────
function PromptPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const TAGS = ["做旧", "哑光", "光泽", "保持光影", "增强纹理", "低反光", "做旧感", "仿古"];

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="描述目标效果，例如：将选中区域替换为深色胡桃木纹材质，保持产品原有形体与背景不变。"
        className="w-full resize-none rounded-xl px-3 py-3 text-xs leading-relaxed"
        style={{
          height: 120,
          border: "1.5px solid var(--border)",
          background: "#f4f5f7",
          color: "var(--text-primary)",
        }}
      />
      <div>
        <p className="text-[10px] mb-2 font-medium" style={{ color: "var(--text-tertiary)" }}>
          快速标签
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => onChange(value ? `${value}，${tag}` : tag)}
              className="px-2.5 py-1 rounded-lg text-xs transition-all"
              style={{
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Preview Panel ────────────────────────────────────────────
function PreviewPanel({
  imageUrl,
  isGenerating,
  onGenerate,
  selectedNodeId,
}: {
  imageUrl?: string;
  isGenerating?: boolean;
  onGenerate: () => void;
  selectedNodeId: string;
}) {
  const generationStatus = useWorkflowStore(
    (s) => {
      const project = Object.values(s.projects).find((p) =>
        p.nodes.some((n) => n.id === selectedNodeId)
      );
      const node = project?.nodes.find((n) => n.id === selectedNodeId);
      return (node?.data as Record<string, unknown>)?.generationStatus as string | undefined;
    }
  ) ?? "idle";

  const isLoading = isGenerating || generationStatus === "generating";

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      let blob: Blob;
      if (imageUrl.startsWith("data:")) {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      } else {
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blob = await res.blob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `material-preview-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("下载失败:", err);
    }
  };

  const handleFavorite = () => {
    if (!imageUrl) return;
    const favorites = JSON.parse(localStorage.getItem("material-favorites") || "[]") as Array<{
      url: string;
      savedAt: number;
    }>;
    if (!favorites.some((f) => f.url === imageUrl)) {
      favorites.push({ url: imageUrl, savedAt: Date.now() });
      localStorage.setItem("material-favorites", JSON.stringify(favorites));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Result display */}
      <div
        className="relative rounded-2xl overflow-hidden flex items-center justify-center"
        style={{
          height: 220,
          background: "#f4f5f7",
          border: "1.5px solid var(--border)",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Generated result"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
            <Eye size={28} />
            <span className="text-xs">生成结果将在此显示</span>
          </div>
        )}
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(244,245,247,0.85)" }}
          >
            <div className="flex flex-col items-center gap-2">
              <Sparkles size={22} className="animate-spin" style={{ color: "#6366f1" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>生成中...</span>
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-medium transition-all"
        style={
          isLoading
            ? { background: "#e0e7ff", color: "#6366f1", cursor: "not-allowed" }
            : {
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                color: "white",
                boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
              }
        }
      >
        <Sparkles size={14} />
        {isLoading ? "生成中..." : "生成方案"}
      </button>

      {imageUrl && (
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs"
            style={{ border: "1.5px solid var(--border)", color: "var(--text-secondary)", background: "var(--surface)" }}
          >
            <Download size={12} />
            下载
          </button>
          <button
            onClick={handleFavorite}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs"
            style={{ border: "1.5px solid var(--border)", color: "var(--text-secondary)", background: "var(--surface)" }}
          >
            <Plus size={12} />
            收藏
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main PropertyPanel ───────────────────────────────────────
export default function PropertyPanel() {
  const currentProjectId = useWorkflowStore((s) => s.currentProjectId);
  const projects = useWorkflowStore((s) => s.projects);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const duplicateNode = useWorkflowStore((s) => s.duplicateNode);
  const generateImage = useWorkflowStore((s) => s.generateImage);

  const { open } = useSegmentation();

  const currentProject = currentProjectId ? projects[currentProjectId] : null;
  const selectedNodeId = currentProject?.selectedNodeId ?? null;
  const nodes = currentProject?.nodes ?? [];
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const nodeData = (selectedNode?.data as Record<string, unknown> | undefined) ?? {};
  const imageUrl = nodeData.imageUrl as string | undefined;
  const promptText = (nodeData.promptText as string) || "";
  const materialType = nodeData.materialType as string | undefined;
  const isLoading = nodeData.isLoading as boolean | undefined;
  const localColor = (nodeData.color as string) || "#60a5fa";
  const selectedMask = nodeData.selectedMask as string | undefined;

  const handleColorChange = (newColor: string) => {
    if (!selectedNode) return;
    updateNodeData(selectedNode.id, { color: newColor });
  };

  const handlePromptChange = (v: string) => {
    if (!selectedNode) return;
    updateNodeData(selectedNode.id, { promptText: v });
  };

  const handleMaterialTypeChange = (type: string) => {
    if (!selectedNode) return;
    updateNodeData(selectedNode.id, {
      materialType: type as "wood" | "metal" | "fabric" | "plastic" | "other",
    });
  };

  const handleImageUpload = (file: File) => {
    if (!selectedNode) return;
    updateNodeData(selectedNode.id, { imageUrl: URL.createObjectURL(file) });
  };

  const handleRemoveImage = () => {
    if (!selectedNode) return;
    updateNodeData(selectedNode.id, { imageUrl: undefined });
  };

  const handleGenerate = () => {
    if (!selectedNode) return;
    generateImage(selectedNode.id);
  };

  // ── Node type config ──────────────────────────────────────
  const nodeConfig = {
    productImage: {
      label: "产品图片",
      accent: "#3b82f6",
      icon: "/icon/raw picture.png",
    },
    materialRef: {
      label: "材质参考",
      accent: "#f59e0b",
      icon: "/icon/material reference.png",
    },
    colorPicker: {
      label: "颜色选择",
      accent: "#06b6d4",
      icon: "/icon/color.png",
    },
    prompt: {
      label: "提示词",
      accent: "#8b5cf6",
      icon: "/icon/prompt.png",
    },
    preview: {
      label: "预览生成",
      accent: "#10b981",
      icon: "/icon/generate.png",
    },
  } as const;

  const config = selectedNode ? nodeConfig[selectedNode.type as keyof typeof nodeConfig] : null;

  // ── Empty state ───────────────────────────────────────────
  if (!selectedNode) {
    return (
      <aside
        className="h-full flex flex-col"
        style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Eye size={32} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              选择一个节点
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)", opacity: 0.6 }}>
              选中画布中的节点以查看详情
            </p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="h-full flex flex-col overflow-hidden"
      style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
    >
      {/* Panel header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{
              background: `${config?.accent}14`,
              border: `1px solid ${config?.accent}25`,
            }}
          >
            <img
              src={config?.icon}
              alt={config?.label}
              className="w-5 h-5 object-contain"
            />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              {config?.label}
            </p>
            <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              {selectedNode.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => duplicateNode(selectedNode.id)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            title="复制节点"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={() => removeNode(selectedNode.id)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            title="删除节点"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ── productImage ── */}
        {selectedNode.type === "productImage" && (
          <ImagePanel
            imageUrl={imageUrl}
            onUpload={handleImageUpload}
            onRemove={handleRemoveImage}
            label="产品图片"
            accent="#3b82f6"
            onSegmentation={() => {
              if (selectedNode) {
                open({ imageUrl: imageUrl!, initialMask: selectedMask, nodeId: selectedNode.id });
              }
            }}
            hasMask={!!selectedMask}
          />
        )}

        {/* ── materialRef ── */}
        {selectedNode.type === "materialRef" && (
          <div className="flex flex-col gap-3">
            <ImagePanel
              imageUrl={imageUrl}
              onUpload={handleImageUpload}
              onRemove={handleRemoveImage}
              label="材质参考"
              accent="#f59e0b"
              onSegmentation={() => {
              if (selectedNode) {
                open({ imageUrl: imageUrl!, initialMask: selectedMask, nodeId: selectedNode.id });
              }
            }}
              hasMask={!!selectedMask}
            />
            {/* Material type selector */}
            <div>
              <p className="text-[10px] mb-2 font-medium" style={{ color: "var(--text-tertiary)" }}>
                材质类型
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {Object.entries(MATERIAL_TYPES).map(([key, { label, color }]) => (
                  <button
                    key={key}
                    onClick={() => handleMaterialTypeChange(key)}
                    className="flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium transition-all"
                    style={
                      materialType === key
                        ? { background: `${color}18`, border: `1.5px solid ${color}50`, color }
                        : { border: "1.5px solid var(--border)", color: "var(--text-secondary)", background: "var(--surface)" }
                    }
                  >
                    <div className="h-3 w-3 rounded-full" style={{ background: color }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── colorPicker ── */}
        {selectedNode.type === "colorPicker" && (
          <div className="flex flex-col gap-4">
            <ColorWheel value={localColor} onChange={handleColorChange} />

            {/* Hex input */}
            <div>
              <p className="text-[10px] mb-2 font-medium" style={{ color: "var(--text-tertiary)" }}>
                HEX 色值
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-xl flex-shrink-0"
                  style={{ background: localColor, border: "1.5px solid var(--border)" }}
                />
                <input
                  type="text"
                  value={localColor}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) handleColorChange(v);
                  }}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-mono"
                  style={{ border: "1.5px solid var(--border)", background: "#f4f5f7", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            {/* Preset colors */}
            <div>
              <p className="text-[10px] mb-2 font-medium" style={{ color: "var(--text-tertiary)" }}>
                预设色板
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColorChange(c)}
                    className="h-8 rounded-lg transition-all"
                    style={{
                      background: c,
                      border: localColor === c ? "2px solid white" : "2px solid transparent",
                      boxShadow: localColor === c ? `0 0 0 2px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── prompt ── */}
        {selectedNode.type === "prompt" && (
          <PromptPanel value={promptText} onChange={handlePromptChange} />
        )}

        {/* ── preview ── */}
        {selectedNode.type === "preview" && (
          <PreviewPanel
            imageUrl={imageUrl}
            isGenerating={false}
            onGenerate={handleGenerate}
            selectedNodeId={selectedNode.id}
          />
        )}
      </div>
    </aside>
  );
}
