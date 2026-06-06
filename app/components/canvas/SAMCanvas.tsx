"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, MousePointer2, Trash2, Crosshair, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { segmentWithPoints, imageUrlToBase64, type SegmentResult } from "../../lib/api/sam";
import { useWorkflowStore } from "../../hooks/useWorkflowStore";

interface Point {
  x: number; // normalized 0-1
  y: number;
  label: 1 | 0; // 1=positive, 0=negative
}

interface SAMCanvasProps {
  /** 产品图 URL (blob URL 或 data URL) */
  imageUrl: string;
  /** 初始已有的 mask（Base64 PNG） */
  initialMask?: string;
  /** 要写入 mask 的节点 ID */
  nodeId: string;
  onClose: () => void;
}

export default function SAMCanvas({ imageUrl, initialMask, nodeId, onClose }: SAMCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [points, setPoints] = useState<Point[]>([]);
  const [mode, setMode] = useState<"positive" | "negative">("positive");
  const [segmentState, setSegmentState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [candidates, setCandidates] = useState<SegmentResult[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;

    const maxW = Math.min(containerRef.current?.clientWidth ?? 600, 600);
    const scale = maxW / img.naturalWidth;
    const displayW = Math.round(img.naturalWidth * scale);
    const displayH = Math.round(img.naturalHeight * scale);

    setDisplaySize({ w: displayW, h: displayH });

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (canvas) { canvas.width = displayW; canvas.height = displayH; }
    if (maskCanvas) { maskCanvas.width = displayW; maskCanvas.height = displayH; }
  };

  // Draw click points on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const pt of points) {
      const x = pt.x * canvas.width;
      const y = pt.y * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = pt.label === 1 ? "#22c55e" : "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [points]);

  // Draw selected mask overlay
  const drawMaskOverlay = useCallback((b64: string) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || maskCanvas.width === 0) return;

    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    const maskImg = new Image();
    maskImg.src = `data:image/png;base64,${b64}`;
    maskImg.onload = () => {
      ctx.globalAlpha = 0.45;
      ctx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, maskCanvas.width, maskCanvas.height);
    };
  }, []);

  // Redraw whenever points change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Show selected mask whenever candidate changes
  useEffect(() => {
    if (candidates.length > 0 && selectedCandidate >= 0) {
      drawMaskOverlay(candidates[selectedCandidate].maskBase64);
    } else {
      const ctx = maskCanvasRef.current?.getContext("2d");
      ctx?.clearRect(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height);
    }
  }, [candidates, selectedCandidate, drawMaskOverlay]);

  // Load initial mask if provided
  useEffect(() => {
    if (initialMask) {
      const fakeCandidate: SegmentResult = {
        maskBase64: initialMask,
        bbox: { x: 0, y: 0, width: 0, height: 0 },
        score: 1,
      };
      setCandidates([fakeCandidate]);
      setSelectedCandidate(0);
      setSegmentState("success");
    }
  }, [initialMask]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || segmentState === "loading") return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setPoints((prev) => [...prev, { x, y, label: mode === "positive" ? 1 : 0 }]);
  };

  const handleUndo = () => {
    setPoints((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPoints([]);
    setCandidates([]);
    setSelectedCandidate(0);
    setSegmentState("idle");
    setErrorMsg("");
    const ctx = maskCanvasRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height);
  };

  const handleSegment = async () => {
    if (points.length === 0 || !imageUrl) return;

    setSegmentState("loading");
    setErrorMsg("");

    try {
      const results = await segmentWithPoints({
        image: imageUrl,
        points: points.map((p) => ({ x: p.x, y: p.y, label: p.label })),
      });

      setCandidates(results);
      setSelectedCandidate(0);
      setSegmentState(results.length > 0 ? "success" : "error");
      if (results.length === 0) {
        setErrorMsg("SAM 未返回有效结果，请尝试调整点击位置");
      }
    } catch (err) {
      setSegmentState("error");
      setErrorMsg(err instanceof Error ? err.message : "SAM 分割请求失败，请确认服务已启动");
      setCandidates([]);
    }
  };

  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const handleApply = () => {
    if (candidates.length > 0 && selectedCandidate >= 0) {
      updateNodeData(nodeId, { selectedMask: candidates[selectedCandidate].maskBase64 });
      onClose();
    }
  };

  const imgVisible = displaySize.w > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="flex flex-col overflow-hidden rounded-2xl"
        style={{
          width: Math.max(displaySize.w + 48, 520),
          maxWidth: "95vw",
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #2a2a2a" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: "rgba(96,165,250,0.15)" }}
            >
              <Crosshair size={15} style={{ color: "#60a5fa" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#fff" }}>
                SAM 交互分割
              </p>
              <p className="text-[10px]" style={{ color: "#71717a" }}>
                点击添加正/负样本点，SAM 将分割出目标物体
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: "#71717a" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#71717a";
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex flex-col items-center gap-4 p-5">
          {/* Image + canvas stack — always visible, dims in once loaded */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl"
            style={{
              border: "1px solid #2a2a2a",
              width: displaySize.w > 0 ? displaySize.w : "auto",
              height: displaySize.h > 0 ? displaySize.h : "auto",
              background: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="segmentation target"
              style={{
                display: "block",
                width: displaySize.w || "auto",
                height: displaySize.h || "auto",
                maxWidth: "100%",
                pointerEvents: "none",
                visibility: displaySize.w > 0 ? "visible" : "hidden",
              }}
              crossOrigin="anonymous"
              onLoad={handleImageLoad}
            />

            {/* Mask overlay canvas */}
            <canvas
              ref={maskCanvasRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                width: displaySize.w || "auto",
                height: displaySize.h || "auto",
                display: displaySize.w > 0 ? "block" : "none",
              }}
            />

            {/* Points canvas */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 cursor-crosshair"
              onClick={handleCanvasClick}
              style={{
                width: displaySize.w || "auto",
                height: displaySize.h || "auto",
                display: displaySize.w > 0 ? "block" : "none",
              }}
            />

            {/* Loading spinner — shown while image hasn't loaded */}
            {displaySize.w === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin" style={{ color: "#60a5fa" }} />
                <span className="text-[11px]" style={{ color: "#71717a" }}>加载图片中…</span>
              </div>
            )}
          </div>

          {/* Points legend */}
          {points.length > 0 && (
            <div className="flex items-center gap-4 text-[11px]" style={{ color: "#71717a" }}>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "#22c55e" }} />
                正样本 {points.filter((p) => p.label === 1).length} 个
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "#ef4444" }} />
                负样本 {points.filter((p) => p.label === 0).length} 个
              </span>
            </div>
          )}

          {/* Candidate masks strip */}
          {segmentState === "success" && candidates.length > 0 && (
            <div className="w-full space-y-2">
              <p className="text-[11px] font-medium" style={{ color: "#71717a" }}>
                候选分割结果（点击选择）
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {candidates.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedCandidate(i)}
                    className="flex-shrink-0 relative overflow-hidden rounded-lg transition-all"
                    style={{
                      width: 72,
                      height: 54,
                      border: `2px solid ${selectedCandidate === i ? "#60a5fa" : "#2a2a2a"}`,
                      outline: "none",
                      boxShadow: selectedCandidate === i ? "0 0 0 2px rgba(96,165,250,0.3)" : "none",
                    }}
                  >
                    <img
                      src={`data:image/png;base64,${c.maskBase64}`}
                      alt={`mask ${i + 1}`}
                      className="w-full h-full object-contain"
                      style={{ background: "#0d0d0d" }}
                    />
                    {selectedCandidate === i && (
                      <div
                        className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-tl-lg"
                        style={{ background: "#60a5fa" }}
                      >
                        <CheckCircle2 size={9} style={{ color: "#fff" }} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {segmentState === "error" && (
            <div
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <AlertCircle size={13} style={{ color: "#ef4444", flexShrink: 0 }} />
              <span className="text-[11px]" style={{ color: "#f87171" }}>
                {errorMsg}
              </span>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderTop: "1px solid #2a2a2a" }}
        >
          {/* Point mode toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
            <button
              onClick={() => setMode("positive")}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors"
              style={{
                background: mode === "positive" ? "rgba(34,197,94,0.15)" : "transparent",
                color: mode === "positive" ? "#22c55e" : "#71717a",
                borderRight: "1px solid #2a2a2a",
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: "#22c55e" }} />
              正样本
            </button>
            <button
              onClick={() => setMode("negative")}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors"
              style={{
                background: mode === "negative" ? "rgba(239,68,68,0.15)" : "transparent",
                color: mode === "negative" ? "#ef4444" : "#71717a",
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: "#ef4444" }} />
              负样本
            </button>
          </div>

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={points.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors"
            style={{
              background: "transparent",
              border: "1px solid #2a2a2a",
              color: points.length > 0 ? "#a1a1aa" : "#52525b",
              cursor: points.length > 0 ? "pointer" : "not-allowed",
            }}
          >
            <MousePointer2 size={12} />
            撤销
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors"
            style={{ background: "transparent", border: "1px solid #2a2a2a", color: "#71717a" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f87171";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#71717a";
              e.currentTarget.style.borderColor = "#2a2a2a";
            }}
          >
            <Trash2 size={12} />
            重置
          </button>

          <div className="flex-1" />

          {/* Segment button */}
          <button
            onClick={handleSegment}
            disabled={!imgVisible || points.length === 0 || segmentState === "loading"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background:
                imgVisible && points.length > 0 && segmentState !== "loading"
                  ? "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)"
                  : "rgba(96,165,250,0.15)",
              color:
                imgVisible && points.length > 0 && segmentState !== "loading"
                  ? "#fff"
                  : "rgba(96,165,250,0.4)",
              cursor:
                imgVisible && points.length > 0 && segmentState !== "loading"
                  ? "pointer"
                  : "not-allowed",
              boxShadow:
                imgVisible && points.length > 0 && segmentState !== "loading"
                  ? "0 4px 14px rgba(96,165,250,0.35)"
                  : "none",
            }}
          >
            {segmentState === "loading" ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                分割中…
              </>
            ) : (
              <>
                <Crosshair size={13} />
                分割
              </>
            )}
          </button>

          {/* Apply button */}
          <button
            onClick={handleApply}
            disabled={candidates.length === 0 || segmentState === "loading"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background:
                candidates.length > 0 && segmentState !== "loading"
                  ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                  : "rgba(34,197,94,0.15)",
              color:
                candidates.length > 0 && segmentState !== "loading"
                  ? "#fff"
                  : "rgba(34,197,94,0.4)",
              cursor:
                candidates.length > 0 && segmentState !== "loading"
                  ? "pointer"
                  : "not-allowed",
              boxShadow:
                candidates.length > 0 && segmentState !== "loading"
                  ? "0 4px 14px rgba(34,197,94,0.3)"
                  : "none",
            }}
          >
            <CheckCircle2 size={13} />
            应用
          </button>
        </div>
      </div>
    </div>
  );
}
