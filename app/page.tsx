"use client";

import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import Header from "./components/ui/Header";
import Sidebar from "./components/ui/Sidebar";
import PropertyPanel from "./components/ui/PropertyPanel";
import WorkflowCanvas from "./components/canvas/WorkflowCanvas";
import ResizableLayout from "./components/layout/ResizableLayout";
import TaskBar from "./components/ui/TaskBar";
import { SegmentationProvider } from "./components/canvas/SegmentationProvider";

export default function Home() {
  const [taskBarOpen, setTaskBarOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(320);

  return (
    <ReactFlowProvider>
      <SegmentationProvider>
      <div className="h-screen flex flex-col" style={{ background: "var(--bg)" }}>
        <Header
          taskBarOpen={taskBarOpen}
          onToggleTaskBar={() => setTaskBarOpen((v) => !v)}
        />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {taskBarOpen && <TaskBar />}
          <ResizableLayout
            leftWidth={leftWidth}
            rightWidth={rightWidth}
            setLeftWidth={setLeftWidth}
            setRightWidth={setRightWidth}
            leftMin={160}
            leftMax={360}
            rightMin={240}
            rightMax={600}
          >
            <Sidebar />
            <WorkflowCanvas />
            <PropertyPanel />
          </ResizableLayout>
        </div>
      </div>
      </SegmentationProvider>
    </ReactFlowProvider>
  );
}
