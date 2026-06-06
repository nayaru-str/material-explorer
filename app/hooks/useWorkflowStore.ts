"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyNodeChanges, applyEdgeChanges, type NodeChange, type EdgeChange } from "@xyflow/react";
import type { NodeType, CustomNode, CustomEdge, CustomNodeData } from "../lib/types";
import { generateWithQwen, urlToDataUrl, isDataUrl, hasApiKey } from "../lib/api/tongyi";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WorkflowProject {
  id: string;
  name: string;
  nodes: CustomNode[];
  edges: CustomEdge[];
  selectedNodeId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowStore {
  // ── Project management ──────────────────────────────────────────────────
  currentProjectId: string;
  projects: Record<string, WorkflowProject>;

  createProject: (name?: string) => void;
  switchProject: (projectId: string) => void;
  renameProject: (projectId: string, name: string) => void;
  deleteProject: (projectId: string) => void;

  // ── Node / edge operations (always on current project) ────────────────
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<CustomNodeData>) => void;
  setNodes: (nodes: CustomNode[]) => void;
  setEdges: (edges: CustomEdge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => void;
  selectNode: (nodeId: string | null) => void;
  duplicateNode: (nodeId: string) => void;

  // ── Selector helpers ──────────────────────────────────────────────────
  getCurrentProject: () => WorkflowProject | null;

  // ── Generation ──────────────────────────────────────────────────────────
  generateImage: (previewNodeId: string) => Promise<void>;
  setSelectedMask: (previewNodeId: string, maskBase64: string) => void;
  clearGeneratedImages: (previewNodeId: string) => void;
}

// ─── Defaults ──────────────────────────────────────────────────────────────

const getDefaultNodeData = (type: NodeType): Partial<CustomNodeData> => {
  switch (type) {
    case "productImage":
      return { label: "产品图片", type };
    case "materialRef":
      return { label: "材质参考", type, materialType: "other" };
    case "colorPicker":
      return { label: "颜色选择", type, color: "#60a5fa" };
    case "prompt":
      return { label: "提示词", type, promptText: "" };
    case "preview":
      return { label: "预览 & 生成", type };
    case "materialLibrary":
      return { label: "材质库", type };
    default:
      return { label: "节点", type };
  }
};

let nodeIdCounter = 1;
const getNodeId = (type: NodeType) => `${type}_${nodeIdCounter++}`;

const makeProject = (id: string, name: string): WorkflowProject => ({
  id,
  name,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getConnectedNodes(project: WorkflowProject, targetId: string): CustomNode[] {
  const visited = new Set<string>();
  const result: CustomNode[] = [];

  function traverse(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = project.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    result.push(node);
    // 找到所有指向这个节点的源节点（往上游走）
    const inEdges = project.edges.filter((e) => e.target === nodeId);
    for (const edge of inEdges) {
      traverse(edge.source);
    }
  }

  traverse(targetId);
  // 去掉自己（预览节点本身）
  return result.filter((n) => n.id !== targetId);
}

async function ensureDataUrl(url: string): Promise<string> {
  if (isDataUrl(url)) return url;
  return urlToDataUrl(url);
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      currentProjectId: "",
      projects: {},

      // ── Project management ──────────────────────────────────────────────

      createProject: (name) => {
        const id = `project_${Date.now()}`;
        const existingNames = Object.values(get().projects).map((p) => p.name);
        const defaultName =
          name ||
          (() => {
            let n = 1;
            while (existingNames.includes(`未命名项目 ${n}`)) n++;
            return `未命名项目 ${n}`;
          })();

        const project = makeProject(id, defaultName);
        set((state) => ({
          currentProjectId: id,
          projects: { ...state.projects, [id]: project },
        }));
      },

      switchProject: (projectId) => {
        if (get().projects[projectId]) {
          set({ currentProjectId: projectId });
        }
      },

      renameProject: (projectId, name) => {
        set((state) => {
          const project = state.projects[projectId];
          if (!project) return state;
          return {
            projects: {
              ...state.projects,
              [projectId]: { ...project, name, updatedAt: Date.now() },
            },
          };
        });
      },

      deleteProject: (projectId) => {
        const { projects, currentProjectId } = get();
        const remaining = Object.keys(projects).filter((id) => id !== projectId);
        const newProjects = { ...projects };
        delete newProjects[projectId];

        let newCurrentId = currentProjectId;
        if (currentProjectId === projectId) {
          newCurrentId = remaining[remaining.length - 1] ?? "";
        }

        set({ projects: newProjects, currentProjectId: newCurrentId });
      },

      // ── Node / edge helpers ────────────────────────────────────────────

      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects[currentProjectId] ?? null;
      },

      // ── Node / edge operations ────────────────────────────────────────

      addNode: (type, position) => {
        const { currentProjectId, projects } = get();
        const project = projects[currentProjectId];
        if (!project) return;

        const id = getNodeId(type);
        const newNode: CustomNode = {
          id,
          type,
          position,
          data: getDefaultNodeData(type) as CustomNodeData,
        };

        set((state) => ({
          projects: {
            ...state.projects,
            [currentProjectId]: {
              ...project,
              nodes: [...project.nodes, newNode],
              selectedNodeId: id,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      removeNode: (nodeId) => {
        const { currentProjectId, projects } = get();
        const project = projects[currentProjectId];
        if (!project) return;

        set((state) => ({
          projects: {
            ...state.projects,
            [currentProjectId]: {
              ...project,
              nodes: project.nodes.filter((n) => n.id !== nodeId),
              edges: project.edges.filter(
                (e) => e.source !== nodeId && e.target !== nodeId
              ),
              selectedNodeId:
                project.selectedNodeId === nodeId ? null : project.selectedNodeId,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      updateNodeData: (nodeId, data) => {
        const { currentProjectId, projects } = get();
        const project = projects[currentProjectId];
        if (!project) return;

        set((state) => ({
          projects: {
            ...state.projects,
            [currentProjectId]: {
              ...project,
              nodes: project.nodes.map((node) =>
                node.id === nodeId
                  ? { ...node, data: { ...node.data, ...data } }
                  : node
              ),
              updatedAt: Date.now(),
            },
          },
        }));
      },

      setNodes: (nodes) => {
        const { currentProjectId, projects } = get();
        const project = projects[currentProjectId];
        if (!project) return;

        set((state) => ({
          projects: {
            ...state.projects,
            [currentProjectId]: { ...project, nodes, updatedAt: Date.now() },
          },
        }));
      },

      setEdges: (edges) => {
        const { currentProjectId, projects } = get();
        const project = projects[currentProjectId];
        if (!project) return;

        set((state) => ({
          projects: {
            ...state.projects,
            [currentProjectId]: { ...project, edges, updatedAt: Date.now() },
          },
        }));
      },

      onNodesChange: (changes) => {
        const { currentProjectId, projects } = get();
        const project = projects[currentProjectId];
        if (!project) return;

        const newNodes = applyNodeChanges(changes, project.nodes) as CustomNode[];
        set((state) => ({
          projects: {
            ...state.projects,
            [currentProjectId]: { ...project, nodes: newNodes, updatedAt: Date.now() },
          },
        }));
      },

      onEdgesChange: (changes) => {
        const { currentProjectId, projects } = get();
        const project = projects[currentProjectId];
        if (!project) return;

        const newEdges = applyEdgeChanges(changes, project.edges);
        set((state) => ({
          projects: {
            ...state.projects,
            [currentProjectId]: { ...project, edges: newEdges, updatedAt: Date.now() },
          },
        }));
      },

      onConnect: (connection) => {
        const { currentProjectId, projects } = get();
        const project = projects[currentProjectId];
        if (!project) return;

        const newEdge: CustomEdge = {
          id: `e_${connection.source}_${connection.target}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          animated: true,
          style: { stroke: "#60a5fa", strokeWidth: 2 },
        };

        set((state) => ({
          projects: {
            ...state.projects,
            [currentProjectId]: {
              ...project,
              edges: [...project.edges, newEdge],
              updatedAt: Date.now(),
            },
          },
        }));
      },

      selectNode: (nodeId) => {
        const { currentProjectId, projects } = get();
        const project = projects[currentProjectId];
        if (!project) return;

        set((state) => ({
          projects: {
            ...state.projects,
            [currentProjectId]: { ...project, selectedNodeId: nodeId, updatedAt: Date.now() },
          },
        }));
      },

      duplicateNode: (nodeId) => {
        const { currentProjectId, projects } = get();
        const project = projects[currentProjectId];
        if (!project) return;

        const node = project.nodes.find((n) => n.id === nodeId);
        if (!node || !node.type) return;

        const newId = getNodeId(node.type as NodeType);
        const newNode: CustomNode = {
          ...node,
          id: newId,
          position: { x: node.position.x + 40, y: node.position.y + 40 },
          data: { ...node.data },
          selected: false,
        };

        set((state) => ({
          projects: {
            ...state.projects,
            [currentProjectId]: {
              ...project,
              nodes: [...project.nodes, newNode],
              selectedNodeId: newId,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      // ── Generation ───────────────────────────────────────────────────────

      generateImage: async (previewNodeId) => {
        const updateNodeData = get().updateNodeData;

        const { currentProjectId, projects } = get();
        const project = projects[currentProjectId];
        if (!project) return;

        if (!hasApiKey()) {
          updateNodeData(previewNodeId, {
            generationStatus: "error",
            apiError: "请先在设置中配置通义万相 API Key",
          });
          return;
        }

        // 收集上游节点数据
        const connectedNodes = getConnectedNodes(project, previewNodeId);

        const productNode = connectedNodes.find((n) => n.type === "productImage");
        const materialNode = connectedNodes.find((n) => n.type === "materialRef");
        const colorNode = connectedNodes.find((n) => n.type === "colorPicker");
        const promptNode = connectedNodes.find((n) => n.type === "prompt");
        const previewNode = project.nodes.find((n) => n.id === previewNodeId);

        if (!productNode) {
          updateNodeData(previewNodeId, {
            generationStatus: "error",
            apiError: "请先连接产品图片节点",
          });
          return;
        }

        // 开始生成
        updateNodeData(previewNodeId, {
          generationStatus: "generating",
          apiError: undefined,
          generatedImages: [],
        });

        try {
          // 将图片统一转为 data URL
          const productDataUrl = productNode.data.imageUrl
            ? await ensureDataUrl(productNode.data.imageUrl)
            : "";
          const materialDataUrl = materialNode?.data.imageUrl
            ? await ensureDataUrl(materialNode.data.imageUrl)
            : undefined;

          const result = await generateWithQwen({
            productImage: productDataUrl,
            materialImage: materialDataUrl,
            targetColor: colorNode?.data.color as string | undefined,
            prompt: (promptNode?.data.promptText as string) || "材质替换",
            maskBase64: productNode.data.selectedMask as string | undefined,
            n: 1,
          });

          updateNodeData(previewNodeId, {
            generationStatus: "success",
            generatedImages: result.images,
            imageUrl: result.images[0]?.url,
          });
        } catch (err) {
          updateNodeData(previewNodeId, {
            generationStatus: "error",
            apiError: err instanceof Error ? err.message : "生成失败",
          });
        }
      },

      setSelectedMask: (previewNodeId, maskBase64) => {
        get().updateNodeData(previewNodeId, { selectedMask: maskBase64 });
      },

      clearGeneratedImages: (previewNodeId) => {
        get().updateNodeData(previewNodeId, {
          generatedImages: [],
          imageUrl: undefined,
          generationStatus: "idle",
        });
      },
    }),
    {
      name: "material-explorer-projects",
      version: 1,
    }
  )
);
