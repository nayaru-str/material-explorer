"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useWorkflowStore } from "../../hooks/useWorkflowStore";
import type { CustomNodeData } from "../../lib/types";
import { MessageSquare, Send } from "lucide-react";

function PromptNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const nodeData = data as CustomNodeData;
  const accent = "#9abdf5";

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { promptText: event.target.value });
  };

  return (
    <div
      className="w-60 rounded-2xl overflow-hidden transition-all"
      style={{
        background: "white",
        border: selected ? `1.5px solid ${accent}` : "1.5px solid rgba(0,0,0,0.07)",
        boxShadow: selected
          ? `0 8px 32px rgba(154,189,245,0.15), 0 2px 8px rgba(154,189,245,0.08)`
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
          <img src="/icon/prompt.png" alt="prompt" className="w-5 h-5 object-contain" />
        </div>
        <span className="text-xs font-medium" style={{ color: "#1a1a2e" }}>
          提示词
        </span>
        {nodeData.promptText && (
          <Send className="ml-auto h-3 w-3" style={{ color: `${accent}80` }} />
        )}
      </div>

      <div className="p-3">
        <textarea
          value={nodeData.promptText || ""}
          onChange={handleTextChange}
          placeholder="描述目标效果..."
          className="h-24 w-full resize-none rounded-xl border px-3 py-2.5 text-xs"
          style={{
            border: "1px solid rgba(0,0,0,0.07)",
            background: "#f9fafb",
            color: "#1a1a2e",
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

export default memo(PromptNode);
