"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useWorkflowStore } from "../../hooks/useWorkflowStore";
import type { CustomNodeData, GenerationStatus } from "../../lib/types";
import { Eye, Loader2, Sparkles, AlertCircle, RefreshCw, X, Check, Layers } from "lucide-react";

function PreviewNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const generateImage = useWorkflowStore((s) => s.generateImage);
  const clearGeneratedImages = useWorkflowStore((s) => s.clearGeneratedImages);

  const nodeData = data as CustomNodeData;
  const accent = "#f9b8cc";

  const status: GenerationStatus = nodeData.generationStatus ?? "idle";
  const isLoading = status === "generating";
  const hasImages = !!(nodeData.generatedImages && nodeData.generatedImages.length > 0);
  const currentUrl = nodeData.imageUrl as string | undefined;
  const errorMsg = nodeData.apiError as string | undefined;
  const isError = status === "error";
  const hasMask = !!(nodeData.selectedMask);

  const handleGenerate = () => {
    generateImage(id);
  };

  const handleClear = () => {
    clearGeneratedImages(id);
  };

  return (
    <div
      className="w-72 rounded-2xl overflow-hidden transition-all"
      style={{
        background: "white",
        border: selected ? `1.5px solid ${accent}` : "1.5px solid rgba(0,0,0,0.07)",
        boxShadow: selected
          ? `0 8px 32px rgba(249,184,204,0.15), 0 2px 8px rgba(249,184,204,0.08)`
          : "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: `${accent}14`, border: `1px solid ${accent}25` }}
        >
          <img src="/icon/generate.png" alt="generate" className="w-5 h-5 object-contain" />
        </div>
        <span className="text-xs font-medium" style={{ color: "#1a1a2e" }}>
          预览生成
        </span>

        {/* Status indicator */}
        <div className="ml-auto flex items-center gap-1">
          {isLoading && (
            <div className="flex items-center gap-1" style={{ color: accent }}>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-[10px]" style={{ color: accent }}>生成中</span>
            </div>
          )}
          {status === "success" && (
            <div className="flex items-center gap-0.5" style={{ color: "#22c55e" }}>
              <Check size={11} />
              <span className="text-[10px]">完成</span>
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-0.5" style={{ color: "#ef4444" }}>
              <AlertCircle size={11} />
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Preview area */}
        <div
          className="relative overflow-hidden rounded-xl flex items-center justify-center min-h-40"
          style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#f9fafb" }}
        >
          {currentUrl ? (
            <img src={currentUrl} alt="Preview" className="w-full h-40 object-contain" />
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2" style={{ color: "#d1d5db" }}>
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: accent }} />
              <span className="text-xs" style={{ color: accent }}>AI 正在生成中...</span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center px-4 py-3" style={{ color: "#f87171" }}>
              <AlertCircle className="h-6 w-6 mb-1.5" />
              <span className="text-xs text-center">{errorMsg || "生成失败"}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center" style={{ color: "#d1d5db" }}>
              <Eye className="h-7 w-7 mb-1.5" />
              <span className="text-xs">等待连接上游节点</span>
            </div>
          )}
        {hasMask && (
            <div
              className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
              style={{ background: "rgba(96,165,250,0.9)", color: "#fff" }}
            >
              <Layers size={9} />
              局部
            </div>
          )}
        </div>

        {/* Multiple results strip */}
        {hasImages && (nodeData.generatedImages as Array<{ url?: string }>).length > 1 && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {(nodeData.generatedImages as Array<{ url?: string }>).map((img, idx) => (
              <button
                key={idx}
                onClick={() => updateNodeData(id, { imageUrl: img.url })}
                className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all"
                style={{
                  borderColor: img.url === currentUrl ? accent : "rgba(0,0,0,0.07)",
                  outline: "none",
                }}
              >
                {img.url && <img src={img.url} alt={`结果 ${idx + 1}`} className="w-full h-full object-cover" />}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {hasImages && (
            <button
              onClick={handleClear}
              className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: "rgba(0,0,0,0.03)",
                border: "1px solid rgba(0,0,0,0.08)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.06)";
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.03)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <X size={12} />
              清除
            </button>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl text-xs font-medium transition-all"
            style={
              isLoading
                ? { background: "#fef2f8", color: accent, cursor: "not-allowed" }
                : {
                    background: `linear-gradient(135deg, ${accent} 0%, #fda4af 100%)`,
                    color: "white",
                    boxShadow: `0 4px 14px ${accent}40`,
                  }
            }
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.opacity = "0.9";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {hasImages ? "重新生成" : "生成方案"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left} id="product"
        className="!h-2.5 !w-2.5 !rounded-full"
        style={{ top: "30%", background: "#6fc2e2", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
      />
      <Handle type="target" position={Position.Left} id="material"
        className="!h-2.5 !w-2.5 !rounded-full"
        style={{ top: "46%", background: "#a69fe5", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
      />
      <Handle type="target" position={Position.Left} id="color"
        className="!h-2.5 !w-2.5 !rounded-full"
        style={{ top: "62%", background: "#fcc2a4", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
      />
      <Handle type="target" position={Position.Left} id="prompt"
        className="!h-2.5 !w-2.5 !rounded-full"
        style={{ top: "78%", background: "#9abdf5", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
      />
    </div>
  );
}

export default memo(PreviewNode);
