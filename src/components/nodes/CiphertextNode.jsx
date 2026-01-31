import React, {useState} from "react";
import { Handle, Position, useReactFlow } from "reactflow";

export default function CiphertextNode({ id, data }) {
  const instance = useReactFlow();
  const preview = data?.preview || "";
  const result = data?.result || "";
  const [buttonText, setButtonText] = useState("Copy Binary");

  

  // Image files starts with blob: or data:image
  const isImage =
    typeof preview === "string" &&
    (preview.startsWith("blob:") || preview.startsWith("data:image"));

  const showTextArea =
    result &&
    !isImage &&
    !result.includes("Ready for Run XOR") &&
    !result.includes("Missing input");

  const handleCopy = () => {
    if (data?.fullBinary) {
      navigator.clipboard.writeText(data.fullBinary);
      setButtonText("Copied!");
      setTimeout(() => {
      setButtonText("Copy Binary");
    }, 2000);
    }
  };

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
      <Handle type="target" position={Position.Top} id="in" style={{ background: "violet" }} />
      <Handle type="source" position={Position.Bottom} id="out" />

      {}
      <div style={{ marginTop: 8, marginRight: 8, textAlign: "center" }}>
        {isImage && (
          <>
            <img
              src={preview}
              alt="cipher"
              style={{ maxWidth: "100%", borderRadius: 4 }}
            />
            <div style={{ marginTop: 6 }}>
              <a href={preview} download="cipher.png">⬇ Download</a>
            </div>
          </>
        )}


        {showTextArea && (
          <textarea
            value={result}
            readOnly
            style={{
              width: "100%",
              height: 100,
              background: "white",
              border: "1px solid #aaa",
              borderRadius: 6,
              
              marginRight: 0,
              color: "#333",
              fontFamily: "monospace",
              resize: "none",
              marginTop: 6,
            }}
          />
        )}

        {!result && (
          <div style={{ fontSize: 12, color: "#666" }}>
            Waiting for XOR result...
          </div>
        )}
      </div>

      {(data?.fullBinary && !isImage) && (
        <button
          onClick={handleCopy}
          style={{
            marginTop: 8,
            background: "#eee",
            border: "1px solid #aaa",
            borderRadius: 4,
            cursor: "pointer",
            padding: "2px 6px",
            fontSize: 12,
          }}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}
