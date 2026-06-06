"use client";

import { useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Connection,
  BackgroundVariant,
  Panel,
  Node,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkflowStore } from "../../hooks/useWorkflowStore";
import type { NodeType } from "../../lib/types";

import ProductImageNode from "../nodes/ProductImageNode";
import MaterialRefNode from "../nodes/MaterialRefNode";
import ColorPickerNode from "../nodes/ColorPickerNode";
import PromptNode from "../nodes/PromptNode";
import PreviewNode from "../nodes/PreviewNode";

const nodeTypes = {
  productImage: ProductImageNode,
  materialRef: MaterialRefNode,
  colorPicker: ColorPickerNode,
  prompt: PromptNode,
  preview: PreviewNode,
};

const defaultEdgeOptions = {
  type: "default",
  style: {
    stroke: "rgba(99,102,241,0.25)",
    strokeWidth: 2,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 12,
    height: 12,
    color: "rgba(99,102,241,0.35)",
  },
};

export default function WorkflowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const storeOnConnect = useWorkflowStore((s) => s.onConnect);
  const addNode = useWorkflowStore((s) => s.addNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const createProject = useWorkflowStore((s) => s.createProject);

  // Auto-create a default project on first load
  useEffect(() => {
    const state = useWorkflowStore.getState();
    if (state.currentProjectId === "" && Object.keys(state.projects).length === 0) {
      state.createProject("未命名项目 1");
    }
  }, []);

  const currentProject = useWorkflowStore(
    (state) => (state.currentProjectId ? state.projects[state.currentProjectId] : null)
  );
  const displayNodes = currentProject?.nodes ?? [];
  const displayEdges = currentProject?.edges ?? [];

  const onConnect = useCallback(
    (connection: Connection) => {
      storeOnConnect({
        source: connection.source as string,
        target: connection.target as string,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      });
    },
    [storeOnConnect]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow") as NodeType;

      if (!type || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 120,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      addNode(type, position);
    },
    [addNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        deleteKeyCode={["Backspace", "Delete"]}
        className="theme-canvas"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="rgba(0,0,0,0.12)"
        />
        <Controls
          className="!bg-white !rounded-xl !border !border-[rgba(0,0,0,0.07)] [&>button]:!bg-white [&>button]:!border-b [&>button]:!border-[rgba(0,0,0,0.07)] [&>button:hover]:!bg-[#f4f5f7] [&>button]:!text-[#6b7280] [&>button:first-child]:!rounded-t-xl [&>button:last-child]:!rounded-b-xl"
          showInteractive={false}
        />

        {displayNodes.length === 0 && (
          <Panel position="top-center" className="mt-16">
            <div className="text-center">
              <p className="text-sm mb-1" style={{ color: "rgba(0,0,0,0.3)" }}>开始</p>
              <p className="text-xs" style={{ color: "rgba(0,0,0,0.18)" }}>从左侧点击添加节点</p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
