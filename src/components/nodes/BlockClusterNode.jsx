import React from "react";

/**
 * Parent frame for one byte-block pipeline. Selection highlight is driven by App (`clusterSelected`).
 */
export default function BlockClusterNode({ data }) {
  const selected = !!data?.clusterSelected;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        borderRadius: 10,
        border: selected ? "2px solid var(--step-accent, #6366f1)" : "1px dashed var(--border)",
        background: "color-mix(in srgb, var(--surface-raised, var(--surface)) 88%, transparent)",
        boxShadow: selected ? "0 0 0 4px color-mix(in srgb, var(--step-accent, #6366f1) 22%, transparent)" : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 4,
          left: 8,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {data?.label || `Block ${(data?.blockIndex ?? 0) + 1}`}
      </div>
    </div>
  );
}
