import React, { useMemo } from "react";
import { Handle, Position } from "reactflow";

/** Canvas: compact Key stand-in; editing in left sidebar. */
export default function KeyRepNode({ data }) {
  const showLabels = !!data?.showHandleLabels;
  const line = useMemo(() => {
    const bitsRaw = data?.bits;
    const kt = data?.keyText;
    const isAes = String(data?.blockCipherType || "").toLowerCase() === "aes";
    const bits = bitsRaw != null ? String(bitsRaw).replace(/[^01]/g, "") : "";
    if (isAes) {
      if (!bits) return "AES key: (128 bit)";
      const head = bits.slice(0, 36);
      return `AES key: ${head}${bits.length > 36 ? "…" : ""}`;
    }
    if (kt && String(kt).trim()) return `AES key (hex): ${String(kt).replace(/\s/g, "").slice(0, 24)}…`;
    if (bits) return `XOR: ${bits.slice(0, 36)}${bits.length > 36 ? "…" : ""}`;
    return "—";
  }, [data?.bits, data?.keyText, data?.blockCipherType]);

  return (
    <div
      style={{
        padding: 8,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--node-key-bg)",
        color: "var(--node-key-text)",
        minWidth: 110,
        maxWidth: 180,
        position: "relative",
      }}
    >
      <strong style={{ fontSize: 12 }}>Key</strong>
      <div
        style={{
          marginTop: 6,
          fontSize: 9,
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)",
          lineHeight: 1.35,
          wordBreak: "break-all",
          maxHeight: 40,
          overflow: "hidden",
        }}
        title={line}
      >
        {line}
      </div>
      <Handle type="source" position={Position.Right} id="out" style={{ top: "50%" }} />
      {showLabels && (
        <div style={{ position: "absolute", top: "42%", right: -20, fontSize: 9, color: "var(--text)" }}>out</div>
      )}
    </div>
  );
}
