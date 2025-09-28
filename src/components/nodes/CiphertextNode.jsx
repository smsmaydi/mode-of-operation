import React from "react";
import { Handle, Position, useReactFlow } from "reactflow";

export default function CiphertextNode({ id, data }) {
  const instance = useReactFlow();

  console.log("CiphertextNode render:", data);

  const isImage = typeof data?.result === "string" && data.result.startsWith("data:image");

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid #999",
        borderRadius: 6,
        background: "#fff",
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

      <strong>Ciphertext</strong>
      <Handle type="target" position={Position.Top} id="in" />

      <div style={{ marginTop: 8, textAlign: "center" }}>
        {isImage ? (
          <>
            <img src={data.result} alt="cipher" style={{ maxWidth: "100%", borderRadius: 4 }} />
            <div style={{ marginTop: 6 }}>
              <a href={data.result} download="cipher.png">
                ⬇ Download
              </a>
            </div>
          </>
        ) : (
          <div style={{ fontFamily: "monospace" }}>{data?.result ?? "— (connect BlockCipher)"}</div>
        )}
      </div>
    </div>
  );
}
