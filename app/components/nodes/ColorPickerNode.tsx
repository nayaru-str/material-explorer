"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useWorkflowStore } from "../../hooks/useWorkflowStore";
import type { CustomNodeData } from "../../lib/types";

function ColorPickerNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const nodeData = data as CustomNodeData;
  const accent = "#fcc2a4";

  const DEFAULT_COLOR = "#60a5fa";
  const currentColor = nodeData.color || DEFAULT_COLOR;

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { color: event.target.value });
  };

  return (
    <div
      className="w-60 rounded-2xl overflow-hidden transition-all"
      style={{
        background: "white",
        border: selected ? `1.5px solid ${accent}` : "1.5px solid rgba(0,0,0,0.07)",
        boxShadow: selected
          ? `0 8px 32px rgba(252,194,164,0.15), 0 2px 8px rgba(252,194,164,0.08)`
          : "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: `${accent}14`, border: `1px solid ${accent}25` }}
        >
          <img src="/icon/color.png" alt="color" className="w-5 h-5 object-contain" />
        </div>
        <span className="text-xs font-medium" style={{ color: "#1a1a2e" }}>
          颜色选择
        </span>
      </div>

      <div className="p-3 space-y-2">
        <div
          className="flex items-center gap-2 rounded-xl p-3"
          style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#f9fafb" }}
        >
          <input
            type="color"
            value={currentColor}
            onChange={handleColorChange}
            className="w-9 h-9 rounded-xl cursor-pointer"
            style={{ border: "1px solid rgba(0,0,0,0.07)" }}
          />
          <input
            type="text"
            value={currentColor}
            onChange={handleColorChange}
            className="flex-1 px-2.5 py-2 rounded-xl text-xs font-mono"
            style={{
              border: "1px solid rgba(0,0,0,0.07)",
              background: "white",
              color: "#1a1a2e",
            }}
          />
        </div>
        <div
          className="h-8 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${currentColor} 0%, ${currentColor}cc 60%, rgba(255,255,255,0.3) 100%)`,
            border: "1px solid rgba(0,0,0,0.07)",
          }}
        />
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

export default memo(ColorPickerNode);
