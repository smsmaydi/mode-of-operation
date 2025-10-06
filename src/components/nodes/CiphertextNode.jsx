import React from "react";
import { Handle, Position, useReactFlow } from "reactflow";

export default function CiphertextNode({ id, data }) {
  const instance = useReactFlow();

  // 🔍 Resim mi kontrol et
  // Detect image not only after XOR, but also when plaintext is an image
  const isImage =
    (typeof data?.result === "string" &&
      (data.result.startsWith("blob:") || data.result.startsWith("data:image"))) ||
    (data?.preview === "Ready for Run XOR") ||
    (data?.result === "Ready for Run XOR");
  console.log("CipherNode render:", data.result, "isImage:", isImage);
    

  const handleCopy = () => {
    if (data?.fullBinary) {
      navigator.clipboard.writeText(data.fullBinary);
      alert("Binary copied to clipboard!");
    }
  };

  console.log("CipherNode render:", data?.result);

  const isImageReady =
  typeof data?.result === "string" &&
  (data.result.startsWith("blob:") || data.result.startsWith("data:image"));

const shouldShowImage =
  isImageReady && data.result !== "Ready for Run XOR";

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
      {shouldShowImage ? (
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
        // Show nothing (or small hint text)
        <div style={{ fontSize: 12, color: "#666" }}>
          Waiting for XOR result...
        </div>
      )}
    </div>
  </div>
);

}
