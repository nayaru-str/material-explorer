"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface DividerProps {
  onDrag: (delta: number) => void;
  direction: "horizontal" | "vertical";
}

function Divider({ onDrag, direction }: DividerProps) {
  const dragging = useRef(false);
  const startPos = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startPos.current = direction === "horizontal" ? e.clientX : e.clientY;
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }, [direction]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const current = direction === "horizontal" ? e.clientX : e.clientY;
      onDrag(current - startPos.current);
      startPos.current = current;
    };
    const handleMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onDrag, direction]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="flex-shrink-0 flex items-center justify-center cursor-col-resize group"
      style={{
        width: direction === "horizontal" ? 5 : undefined,
        height: direction === "vertical" ? 5 : undefined,
        background: "transparent",
        transition: "background 0.15s",
      }}
    >
      <div
        className="w-px h-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(99,102,241,0.3)" }}
      />
    </div>
  );
}

interface ResizableLayoutProps {
  leftWidth: number;
  rightWidth: number;
  setLeftWidth: (w: number) => void;
  setRightWidth: (w: number) => void;
  leftMin?: number;
  leftMax?: number;
  rightMin?: number;
  rightMax?: number;
  children: React.ReactNode;
}

export default function ResizableLayout({
  leftWidth,
  rightWidth,
  setLeftWidth,
  setRightWidth,
  leftMin = 180,
  leftMax = 360,
  rightMin = 280,
  rightMax = 560,
  children,
}: ResizableLayoutProps) {
  const handleLeftDrag = useCallback((delta: number) => {
    setLeftWidth(Math.min(leftMax, Math.max(leftMin, leftWidth + delta)));
  }, [leftWidth, leftMin, leftMax, setLeftWidth]);

  const handleRightDrag = useCallback((delta: number) => {
    setRightWidth(Math.min(rightMax, Math.max(rightMin, rightWidth - delta)));
  }, [rightWidth, rightMin, rightMax, setRightWidth]);

  const [left, center, right] = children as [React.ReactNode, React.ReactNode, React.ReactNode];

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div style={{ width: leftWidth, flexShrink: 0, minWidth: leftWidth, maxWidth: leftWidth }}>
        {left}
      </div>
      <Divider direction="horizontal" onDrag={handleLeftDrag} />
      <div className="flex-1 min-w-0">
        {center}
      </div>
      <Divider direction="horizontal" onDrag={handleRightDrag} />
      <div style={{ width: rightWidth, flexShrink: 0, minWidth: rightWidth, maxWidth: rightWidth }}>
        {right}
      </div>
    </div>
  );
}
