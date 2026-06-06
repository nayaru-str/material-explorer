"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useWorkflowStore } from "../../hooks/useWorkflowStore";
import type { CustomNodeData } from "../../lib/types";
import { Upload, X } from "lucide-react";

const MATERIAL_COLORS: Record<string, string> = {
  wood: "#d97706",
  metal: "#8b8f98",
  fabric: "#a855f7",
  plastic: "#22d3ee",
  other: "#a69fe5",
};

function MaterialRefNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const nodeData = data as CustomNodeData;
  const accent = MATERIAL_COLORS[nodeData.materialType || "other"] || "#60a5fa";

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateNodeData(id, { imageUrl: URL.createObjectURL(file) });
    }
  };

  const handleRemoveImage = () => {
    updateNodeData(id, { imageUrl: undefined });
  };

  return (
    <div
      className="w-60 rounded-2xl overflow-hidden transition-all"
      style={{
        background: "white",
        border: selected ? `1.5px solid ${accent}` : "1.5px solid rgba(0,0,0,0.07)",
        boxShadow: selected
          ? `0 8px 32px ${accent}22, 0 2px 8px ${accent}10`
          : "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
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
            <img src="/icon/material reference.png" alt="material" className="w-5 h-5 object-contain" />
          </div>
        <span className="text-xs font-medium" style={{ color: "#1a1a2e" }}>
          材质参考
        </span>
      </div>

      <div className="p-3">
        {nodeData.imageUrl ? (
          <div className="relative overflow-hidden rounded-xl" style={{ border: "1px solid rgba(0,0,0,0.07)" }}>
            <img src={nodeData.imageUrl} alt="Material" className="h-32 w-full object-cover" />
            <button
              onClick={handleRemoveImage}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: "rgba(255,255,255,0.9)", color: "#6b7280" }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label
            className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl transition-all"
            style={{ border: "1.5px dashed rgba(0,0,0,0.12)", background: "#f9fafb" }}
          >
            <Upload className="mb-1.5 h-5 w-5" style={{ color: "#9ca3af" }} />
            <span className="text-xs" style={{ color: "#9ca3af" }}>导入材质参考图</span>
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

export default memo(MaterialRefNode);
