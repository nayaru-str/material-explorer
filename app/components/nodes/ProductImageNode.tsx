"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useWorkflowStore } from "../../hooks/useWorkflowStore";
import type { CustomNodeData } from "../../lib/types";
import { Upload, X, Scissors } from "lucide-react";
import { useSegmentation } from "../canvas/SegmentationProvider";

function ProductImageNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const { open } = useSegmentation();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateNodeData(id, { imageUrl: URL.createObjectURL(file) });
    }
  };

  const handleRemoveImage = () => {
    updateNodeData(id, { imageUrl: undefined, selectedMask: undefined });
  };

  const nodeData = data as CustomNodeData;
  const accent = "#6fc2e2";
  const hasMask = !!nodeData.selectedMask;

  return (
    <div
      className="w-60 rounded-2xl overflow-hidden transition-all"
      style={{
        background: "white",
        border: selected ? `1.5px solid ${accent}` : "1.5px solid rgba(0,0,0,0.07)",
        boxShadow: selected
          ? `0 8px 32px rgba(111,194,226,0.15), 0 2px 8px rgba(111,194,226,0.08)`
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
          style={{
            background: `${accent}14`,
            border: `1px solid ${accent}25`,
          }}
        >
          <img src="/icon/raw picture.png" alt="product" className="w-5 h-5 object-contain" />
        </div>
        <span className="text-xs font-medium" style={{ color: "#1a1a2e" }}>
          产品图片
        </span>
        {hasMask && (
          <div
            className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
            style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#60a5fa" }} />
            已选区
          </div>
        )}
      </div>

      {/* Image area */}
      <div className="p-3">
        {nodeData.imageUrl ? (
          <div className="space-y-2">
            <div className="relative overflow-hidden rounded-xl" style={{ border: "1px solid rgba(0,0,0,0.07)" }}>
              <img src={nodeData.imageUrl} alt="Product" className="h-32 w-full object-cover" />
              <button
                onClick={handleRemoveImage}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full transition-colors"
                style={{ background: "rgba(255,255,255,0.9)", color: "#6b7280" }}
              >
                <X className="h-3 w-3" />
              </button>
              {hasMask && (
                <div
                  className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                  style={{ background: "rgba(96,165,250,0.85)", color: "#fff" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#fff" }} />
                  已选区
                </div>
              )}
            </div>

            {/* Segmentation button */}
            <button
              onClick={() =>
                open({
                  imageUrl: nodeData.imageUrl!,
                  initialMask: nodeData.selectedMask,
                  nodeId: id,
                })
              }
              className="flex w-full items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: hasMask ? "rgba(96,165,250,0.08)" : "rgba(96,165,250,0.06)",
                border: `1px solid ${hasMask ? "rgba(96,165,250,0.25)" : "rgba(96,165,250,0.15)"}`,
                color: "#60a5fa",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(96,165,250,0.12)";
                e.currentTarget.style.borderColor = "rgba(96,165,250,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = hasMask ? "rgba(96,165,250,0.08)" : "rgba(96,165,250,0.06)";
                e.currentTarget.style.borderColor = hasMask ? "rgba(96,165,250,0.25)" : "rgba(96,165,250,0.15)";
              }}
            >
              <Scissors size={12} />
              {hasMask ? "调整选区" : "选择分割区域"}
            </button>
          </div>
        ) : (
          <label
            className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl transition-all"
            style={{ border: "1.5px dashed rgba(0,0,0,0.12)", background: "#f9fafb" }}
          >
            <Upload className="mb-1.5 h-5 w-5" style={{ color: "#9ca3af" }} />
            <span className="text-xs" style={{ color: "#9ca3af" }}>导入产品原图</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !rounded-full"
        style={{
          background: accent,
          border: "2px solid white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
}

export default memo(ProductImageNode);
