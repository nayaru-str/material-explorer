"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import SAMCanvas from "../canvas/SAMCanvas";

interface SegmentationPayload {
  imageUrl: string;
  initialMask?: string;
  nodeId: string;
}

interface SegmentationContextValue {
  open: (payload: SegmentationPayload) => void;
  close: () => void;
}

const SegmentationContext = createContext<SegmentationContextValue>({
  open: () => {},
  close: () => {},
});

export function useSegmentation() {
  return useContext(SegmentationContext);
}

// ─── Provider (renders SAMCanvas via portal at body level) ───────
export function SegmentationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SegmentationPayload | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const open = useCallback((payload: SegmentationPayload) => {
    setState(payload);
  }, []);

  const close = useCallback(() => {
    setState(null);
  }, []);

  return (
    <SegmentationContext.Provider value={{ open, close }}>
      {children}
      {mounted && state && createPortal(
        <SAMCanvas
          imageUrl={state.imageUrl}
          initialMask={state.initialMask}
          nodeId={state.nodeId}
          onClose={close}
        />,
        document.body
      )}
    </SegmentationContext.Provider>
  );
}
