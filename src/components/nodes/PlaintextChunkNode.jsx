import React from "react";
import { Handle, Position } from "reactflow";

/** One byte-block slice of the main Plaintext node (p1); values come from computeGraph. */
export default function PlaintextChunkNode({ data }) {
  const showLabels = !!data?.showHandleLabels;
  const idx = data?.blockIndex ?? 0;
  const hex = data?.previewHex || "…";
  const bits = data?.previewBits || "";

  return (
    <div
      style={{
        padding: 8,
        border: "1px solid var(--success)",
        borderRadius: "var(--radius-sm)",
        background: "var(--success-soft)",
        color: "var(--text)",
        minWidth: 124,
        maxWidth: 176,
        position: "relative",
      }}
    >
      <strong style={{ fontSize: 12 }}>Block {idx + 1}</strong>
      <div style={{ fontSize: "var(--text-label-size)", fontFamily: "var(--font-mono)", marginTop: 4, wordBreak: "break-all" }}>
        {hex}
      </div>
      {bits && (
        <div style={{ fontSize: "var(--text-label-size)", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginTop: 4, maxHeight: 36, overflow: "hidden" }}>
          {bits.length > 32 ? `${bits.slice(0, 32)}…` : bits}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} id="out" style={{ background: "var(--success)" }} />
      {showLabels && (
        <div style={{ position: "absolute", bottom: -12, left: "40%", fontSize: 9, color: "var(--success)" }}>
          out
        </div>
      )}
    </div>
  );
}
