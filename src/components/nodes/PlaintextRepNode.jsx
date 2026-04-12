import React, { useMemo } from "react";
import { Handle, Position } from "reactflow";

function previewLine(data) {
  if (!data) return "—";
  const t = data.inputType;
  if (t === "image" && data.value) return `Image: ${data.value.name || "file"}`;
  if (t === "encryptedFile" && data.value) return `Encrypted file: ${data.fileName || data.value.name || "?"}`;
  if (t === "bits" && data.value) return `Bits: ${String(data.value).slice(0, 48)}${String(data.value).length > 48 ? "…" : ""}`;
  if (t === "encrypted" && typeof data.value === "string")
    return `Cipher hex: ${data.value.replace(/(.{16})/g, "$1 ").trim().slice(0, 40)}…`;
  if (typeof data.value === "string" && data.value) return `Text: ${data.value.slice(0, 40)}${data.value.length > 40 ? "…" : ""}`;
  return "—";
}

/** Canvas: compact stand-in; real inputs live in the left sidebar. */
export default function PlaintextRepNode({ data }) {
  const showLabels = !!data?.showHandleLabels;
  const line = useMemo(() => previewLine(data), [data]);

  return (
    <div
      style={{
        padding: 8,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--node-plaintext-bg)",
        color: "var(--node-plaintext-text)",
        minWidth: 120,
        maxWidth: 200,
        position: "relative",
      }}
    >
      <strong style={{ fontSize: 12 }}>Plaintext</strong>
      {data?.isDecryptMode && (
        <span style={{ fontSize: 9, marginLeft: 6, color: "var(--success)" }}>Decrypt</span>
      )}
      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)",
          lineHeight: 1.35,
          wordBreak: "break-word",
          maxHeight: 44,
          overflow: "hidden",
        }}
        title={line}
      >
        {line}
      </div>
      <Handle type="source" position={Position.Bottom} id="out" />
      <Handle type="source" position={Position.Right} id="outRight" style={{ top: "50%" }} />
      {showLabels && (
        <>
          <div style={{ position: "absolute", bottom: -12, left: "40%", fontSize: 9, color: "var(--text)" }}>out</div>
          <div style={{ position: "absolute", top: "42%", right: -20, fontSize: 9, color: "var(--text)" }}>out</div>
        </>
      )}
    </div>
  );
}
