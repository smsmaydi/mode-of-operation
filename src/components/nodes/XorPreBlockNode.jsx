import React from "react";
import { Handle, Position } from "reactflow";

export default function XorPreBlockNode({ data }) {
  const hasErr = !!data?.error;
  const showLabels = !!data?.showHandleLabels;

  const formatBits = (bits) => {
    if (!bits) return "Waiting...";
    return bits.length > 16 ? bits.slice(0, 16) + "..." : bits;
  };

  return (
    <div
      style={{
        padding: "6px 8px",
        border: "1px solid var(--xor-node-border)",
        borderRadius: "var(--radius-sm)",
        background: hasErr ? "var(--danger-soft)" : "var(--xor-node-bg)",
        minWidth: 172,
        position: "relative",
        display: "block",
        color: "var(--text)",
      }}
    >
      <strong style={{ fontSize: 12 }}>XOR</strong>

      <Handle
        type="target"
        position={Position.Left}
        id="pc"
        style={{ background: "var(--xor-handle-pc)", top: "38%" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="ptLeft"
        style={{ background: "var(--xor-handle-pt)", top: "72%" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="pcTop"
        style={{ background: "var(--xor-handle-pc)", left: "30%" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="pt"
        style={{ background: "var(--xor-handle-pt)", left: "70%" }}
      />
      <Handle type="source" position={Position.Bottom} id="out" />
      {showLabels && (
        <>
          <div
            style={{
              position: "absolute",
              top: "36%",
              left: -36,
              fontSize: "var(--text-label-size)",
              color: "var(--xor-node-label-a)",
            }}
          >
            pc
          </div>
          <div
            style={{
              position: "absolute",
              top: "70%",
              left: -36,
              fontSize: "var(--text-label-size)",
              color: "var(--xor-node-label-b)",
            }}
          >
            pt
          </div>
          <div
            style={{
              position: "absolute",
              top: -14,
              left: "22%",
              fontSize: "var(--text-label-size)",
              color: "var(--xor-node-label-a)",
            }}
          >
            pc
          </div>
          <div
            style={{
              position: "absolute",
              top: -14,
              left: "66%",
              fontSize: "var(--text-label-size)",
              color: "var(--xor-node-label-b)",
            }}
          >
            pt
          </div>
          <div
            style={{
              position: "absolute",
              bottom: -14,
              left: "44%",
              fontSize: "var(--text-label-size)",
              color: "var(--xor-node-label-out)",
            }}
          >
            out
          </div>
        </>
      )}

      <div
        style={{
          marginTop: 4,
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          lineHeight: 1.25,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <div
          style={{
            padding: "3px 5px",
            background: "var(--xor-node-slot-bg)",
            borderRadius: 3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <strong>IV/Prev:</strong> {formatBits(data?.pcInput)}
        </div>
        <div
          style={{
            padding: "3px 5px",
            background: "var(--xor-node-slot-bg)",
            borderRadius: 3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <strong>Pt:</strong> {formatBits(data?.ptInput)}
        </div>
        <div
          style={{
            padding: "3px 5px",
            background: "var(--xor-node-slot-result-bg)",
            borderRadius: 3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <strong>Out:</strong> {formatBits(data?.xorOutput)}
        </div>
      </div>
    </div>
  );
}
