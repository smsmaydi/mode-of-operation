import React from "react";
import { Handle, Position, useReactFlow } from "reactflow";

export default function PlaintextNode({ id, data }) {
  const instance = useReactFlow();

  const onTextChange = (e) => {
    data.onChange?.(id, { inputType: "text", value: e.target.value });
  };

  const onBitsChange = (e) => {
    const cleaned = (e.target.value || "").replace(/[^01]/g, "");
    data.onChange?.(id, { inputType: "bits", value: cleaned });
  };

  const onFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      console.log("PlaintextNode: File selected:", file);
      data.onChange?.(id, { inputType: "image", value: file });
    }
  };

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid #666",
        borderRadius: 6,
        background: "#ffd",
        minWidth: 220,
        position: "relative",
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

      <strong>Plaintext</strong>
      <div style={{ marginTop: 8 }}>
        <div>
          <input placeholder="Text..." onChange={onTextChange} />
        </div>
        <div style={{ marginTop: 6 }}>
          <input placeholder="Bits..." onChange={onBitsChange} />
        </div>
        <div style={{ marginTop: 6 }}>
          <input type="file" accept="image/*" onChange={onFileChange} />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
