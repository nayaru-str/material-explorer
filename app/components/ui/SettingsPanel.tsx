"use client";

import { useState, useEffect, useRef } from "react";
import { X, Key, Server, CheckCircle, AlertCircle, Eye, EyeOff, ExternalLink } from "lucide-react";
import { saveApiKey, clearApiKey, hasApiKey } from "../../lib/api/tongyi";

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [samEndpoint, setSamEndpoint] = useState(
    typeof window !== "undefined"
      ? localStorage.getItem("sam-endpoint") || "http://localhost:8080"
      : "http://localhost:8080"
  );
  const [saved, setSaved] = useState(false);
  const [keyExists, setKeyExists] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setKeyExists(hasApiKey());
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const handleSave = () => {
    if (apiKey.trim()) {
      saveApiKey(apiKey.trim());
      setSaved(true);
      setKeyExists(true);
      setApiKey("");
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleClear = () => {
    clearApiKey();
    setKeyExists(false);
    setApiKey("");
  };

  const handleSaveSamEndpoint = () => {
    localStorage.setItem("sam-endpoint", samEndpoint);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div
        ref={panelRef}
        className="w-[480px] rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            设置
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.06)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6">

          {/* API Key section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: "rgba(249,184,204,0.15)" }}
              >
                <Key size={13} style={{ color: "#f9b8cc" }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  通义万相 API Key
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  用于调用 Qwen-VL 图像生成与编辑能力
                </p>
              </div>
            </div>

            {/* Status */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: keyExists ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${keyExists ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}
            >
              {keyExists ? (
                <>
                  <CheckCircle size={13} style={{ color: "#22c55e" }} />
                  <span className="text-[11px]" style={{ color: "#22c55e" }}>API Key 已配置</span>
                </>
              ) : (
                <>
                  <AlertCircle size={13} style={{ color: "#ef4444" }} />
                  <span className="text-[11px]" style={{ color: "#ef4444" }}>未配置 API Key，无法使用生成功能</span>
                </>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  className="flex-1 bg-transparent text-xs outline-none"
                  style={{ color: "var(--text-primary)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="flex items-center justify-center"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <button
                onClick={handleSave}
                className="px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: "linear-gradient(135deg, #f9b8cc 0%, #fda4af 100%)",
                  color: "white",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                保存
              </button>
            </div>

            {keyExists && (
              <button
                onClick={handleClear}
                className="text-[11px] transition-colors"
                style={{ color: "#ef4444" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                清除已保存的 Key
              </button>
            )}

            <a
              href="https://dashscope.console.aliyun.com/apiKey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] transition-colors"
              style={{ color: "#60a5fa" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <ExternalLink size={10} />
              在阿里云控制台获取 API Key →
            </a>
          </div>

          {/* SAM Endpoint section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: "rgba(166,159,229,0.15)" }}
              >
                <Server size={13} style={{ color: "#a69fe5" }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  SAM 分割服务地址
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  本地部署的 SAM 模型服务（可选）
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={samEndpoint}
                onChange={(e) => setSamEndpoint(e.target.value)}
                placeholder="http://localhost:8080"
                className="flex-1 px-3 py-2.5 rounded-xl text-xs outline-none"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={handleSaveSamEndpoint}
                className="px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: "linear-gradient(135deg, #a69fe5 0%, #8b7fd4 100%)",
                  color: "white",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                保存
              </button>
            </div>
          </div>

          {/* Save feedback */}
          {saved && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl animate-pulse"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <CheckCircle size={13} style={{ color: "#22c55e" }} />
              <span className="text-[11px]" style={{ color: "#22c55e" }}>保存成功</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
