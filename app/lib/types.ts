import type { Node, Edge } from "@xyflow/react";

export type NodeType =
  | "productImage"
  | "materialRef"
  | "colorPicker"
  | "prompt"
  | "preview"
  | "materialLibrary";

export type ConnectionType = "image" | "color" | "text" | "any";

export type GenerationStatus = "idle" | "generating" | "success" | "error";

export interface GeneratedResult {
  url?: string;
  base64?: string;
  revisedPrompt?: string;
}

export interface CustomNodeData extends Record<string, unknown> {
  label: string;
  type: NodeType;
  imageUrl?: string;
  color?: string;
  promptText?: string;
  isLoading?: boolean;
  error?: string;
  materialType?: "wood" | "metal" | "fabric" | "plastic" | "other";
  selectedArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // 生成相关
  generationStatus?: GenerationStatus;
  generatedImages?: GeneratedResult[];
  selectedMask?: string; // Base64 PNG，用于局部替换
  apiError?: string;
}

export type CustomNode = Node<CustomNodeData>;
export type CustomEdge = Edge;

export interface WorkflowState {
  nodes: CustomNode[];
  edges: CustomEdge[];
  selectedNodeId: string | null;
}

export const NODE_WIDTH = 240;
export const NODE_PADDING = 12;

export const MATERIAL_TYPES = {
  wood: { label: "木质", color: "#d97706" },
  metal: { label: "金属", color: "#71717a" },
  fabric: { label: "织物", color: "#a855f7" },
  plastic: { label: "塑料", color: "#22d3ee" },
  other: { label: "其他", color: "#60a5fa" },
} as const;

export const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#000000",
  "#ffffff",
  "#a1a1aa",
  "#78716c",
];

export const PRESET_PROMPTS = [
  "细腻的皮革纹理",
  "拉丝金属质感",
  "哑光塑料表面",
  "天然木纹",
  "编织织物纹理",
  "珠光烤漆",
  "磨砂玻璃效果",
  "仿大理石纹理",
];
