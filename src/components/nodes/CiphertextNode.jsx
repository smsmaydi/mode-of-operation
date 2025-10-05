import React from "react";
import { Handle, Position, useReactFlow } from "reactflow";

export default function CiphertextNode({ id, data }) {
  const instance = useReactFlow();

  const isImage =
    typeof data?.result === "string" &&
    (data.result.startsWith("blob:") || data.result.startsWith("data:image"));

  const handleCopy = () => {
    if (data?.fullBinary) {
      navigator.clipboard.writeText(data.fullBinary);
      alert("Binary copied to clipboard!");
    }
  };

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid #999",
        borderRadius: 6,
        background: "pink",
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
      <Handle type="target" position={Position.Top} id="in" style={{ background: "violet" }} />
      <Handle type="source" position={Position.Bottom} id="out" />

      <div style={{ marginTop: 8, textAlign: "center" }}>
        {isImage ? (
          <>
            <img
              src={data.result}
              alt="cipher"
              style={{ maxWidth: "100%", borderRadius: 4 }}
            />
            <div style={{ marginTop: 6 }}>
              <a href={data.result} download="cipher.png">
                ⬇ Download
              </a>
            </div>
          </>
        ) : (
          <>
            <textarea
              readOnly
              value={data?.result ?? ""}
              style={{
                width: "100%",
                minHeight: 80,
                resize: "none",
                background: "#f9f9f9",
                border: "1px solid #ccc",
                borderRadius: 4,
                fontFamily: "monospace",
                fontSize: 13,
                padding: 4,
                whiteSpace: "pre",
              }}
            />
            {data?.fullBinary && (
              <button
                onClick={handleCopy}
                style={{
                  marginTop: 6,
                  padding: "2px 6px",
                  fontSize: 12,
                  borderRadius: 4,
                  border: "1px solid #888",
                  cursor: "pointer",
                  background: "#eee",
                }}
              >
                📋 Copy Binary
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
