"use client";

import { useWorkflowStore } from "../../hooks/useWorkflowStore";
import type { NodeType } from "../../lib/types";
import {
  GripVertical,
} from "lucide-react";

const NODE_ITEMS = [
  {
    type: "productImage" as NodeType,
    label: "产品图片",
    icon: "/icon/raw picture.png",
    color: "#6fc2e2",
    description: "上传产品照片并框选替换区域",
    detail: "支持多区域选择与随时增减",
  },
  {
    type: "materialRef" as NodeType,
    label: "材质参考",
    icon: "/icon/material reference.png",
    color: "#a69fe5",
    description: "选择材质类型或上传参考图",
    detail: "可调粗糙、光泽、反光强度",
  },
  {
    type: "colorPicker" as NodeType,
    label: "颜色选择",
    icon: "/icon/color.png",
    color: "#fcc2a4",
    description: "指定目标颜色并保留质感",
    detail: "支持吸色与常用色组",
  },
  {
    type: "prompt" as NodeType,
    label: "提示词",
    icon: "/icon/prompt.png",
    color: "#9abdf5",
    description: "自动生成描述并用标签微调",
    detail: "如做旧、哑光、保持光影等",
  },
  {
    type: "preview" as NodeType,
    label: "预览生成",
    icon: "/icon/generate.png",
    color: "#f9b8cc",
    description: "对比原图与多张生成结果",
    detail: "支持下载、收藏与历史回溯",
  },
];

export default function Sidebar() {
  const addNode = useWorkflowStore((state) => state.addNode);

  const handleDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleClick = (nodeType: NodeType) => {
    addNode(nodeType, { x: 320, y: 240 });
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
        className="flex-shrink-0 px-4 py-3.5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <p
          className="text-[11px] font-semibold tracking-widest uppercase"
          style={{ color: "var(--text-tertiary)" }}
        >
          功能面板
        </p>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {NODE_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            onClick={() => handleClick(item.type)}
            title={item.description}
            className="group relative rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all select-none"
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = `${item.color}50`;
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 12px ${item.color}15`;
              (e.currentTarget as HTMLDivElement).style.background = `${item.color}08`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              (e.currentTarget as HTMLDivElement).style.background = "var(--surface)";
            }}
          >
            <GripVertical
              className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-tertiary)" }}
              size={12}
            />

            <div className="flex items-start gap-2.5">
              <div
                className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  background: `${item.color}14`,
                  border: `1px solid ${item.color}25`,
                  color: item.color,
                }}
              >
                <img
                  src={item.icon}
                  alt={item.label}
                  className="w-5 h-5 object-contain"
                  style={{ imageRendering: "auto" }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.label}
                </p>
                <p
                  className="mt-0.5 text-[11px] leading-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.description}
                </p>
                <p
                  className="mt-0.5 text-[10px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {item.detail}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          <span className="font-medium">拖拽</span> 或{" "}
          <span className="font-medium">点击</span> 添加节点
        </p>
      </div>
    </aside>
  );
}
