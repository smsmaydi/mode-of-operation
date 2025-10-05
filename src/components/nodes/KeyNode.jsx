import React from "react";
import { Handle, Position, useReactFlow } from "reactflow";

export default function KeyNode({ id, data }) {
  const instance = useReactFlow();

  const onChange = (e) => {
    const cleaned = (e.target.value || "").replace(/[^01]/g, "");
    data.onChange?.(id, { bits: cleaned });
  };

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid #666",
        borderRadius: 6,
        background: "lightblue",
        position: "relative",
        minWidth: 200,
      }}
    >
      <button
        onClick={() => instance.deleteElements({ nodes: [{ id }] })}
        style={{
          position: "absolute",
          top: 2,
          right: 2,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "#b00",
          fontWeight: "bold",
        }}
      >
        ❌
      </button>

      <strong>Key</strong>
      <div style={{ marginTop: 6 }}>
        <input
          style={{ width: "100%", fontFamily: "monospace" }}
          value={data.bits || ""}
          onChange={onChange}
          placeholder="ör. 11001010"
        />
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
