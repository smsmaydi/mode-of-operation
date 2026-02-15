import React, { useState, useEffect } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { checkModeForDeleteButton } from "../../utils/nodeHelpers";

function CiphertextNode({ id, data }) {
  const instance = useReactFlow();
  const result = data?.result || "";
  const [copyBinaryText, setCopyBinaryText] = useState("Copy Binary");
  const [copyEncText, setCopyEncText] = useState("Copy Enc");
  const [deferredResult, setDeferredResult] = useState("");
  const showLabels = !!data?.showHandleLabels;
  const cipherType = (data?.cipherType || "").toLowerCase();

  useEffect(() => {
    const timer = setTimeout(() => setDeferredResult(result), 100);
    return () => clearTimeout(timer);
  }, [result]);

  const isImage =
    typeof deferredResult === "string" &&
    (deferredResult.startsWith("blob:") || deferredResult.startsWith("data:image"));

  const encValue = data?.fullBinary ?? result;
  const showEncArea =
    encValue &&
    !isImage &&
    !String(result).includes("Ready for Run XOR") &&
    !String(result).includes("Missing input");

  const handleCopyBinary = () => {
    if (data?.fullBinary) {
      navigator.clipboard.writeText(data.fullBinary);
      setCopyBinaryText("Copied!");
      setTimeout(() => setCopyBinaryText("Copy Binary"), 2000);
    }
  };

  const handleCopyEnc = () => {
    if (data?.fullBinary) {
      navigator.clipboard.writeText(data.fullBinary);
      setCopyEncText("Copied!");
      setTimeout(() => setCopyEncText("Copy Enc"), 2000);
    }
  };

  return (
    <div
      className="nodrag"
      style={{
        padding: 10,
        border: "1px solid #999",
        borderRadius: 6,
        background: "#fff",
        minWidth: 200,
        width: "max-content",
        maxWidth: 320,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
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
          display: checkModeForDeleteButton(data?.mode),
        }}
      >
        ❌
      </button>

      <strong>Ciphertext</strong>
      {data?.showAesSteps && data?.onOpenAesSubBytes && (
        <button
          type="button"
          onClick={() => data.onOpenAesSubBytes(id)}
          className="nodrag"
          style={{
            display: "block",
            marginTop: 6,
            marginBottom: 4,
            padding: "6px 10px",
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            border: "none",
            borderRadius: 6,
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          AES Steps
        </button>
      )}
      <Handle type="target" position={Position.Top} id="in" style={{ background: "violet" }} />
      <Handle type="source" position={Position.Bottom} id="out" />
      {showLabels && (
        <>
          <div style={{ position: "absolute", top: -14, left: "46%", fontSize: 10, color: "#7a1fa2" }}>
            in
          </div>
          <div style={{ position: "absolute", bottom: -14, left: "44%", fontSize: 10, color: "#111" }}>
            out
          </div>
        </>
      )}

      <div style={{ marginTop: 8, textAlign: "center", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        {isImage && (
          <>
            <img
              src={deferredResult}
              alt="cipher"
              style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 4, display: "block" }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              <a href={result} download="cipher.png">Download</a>
              {data?.encryptedBlobUrl && (
                <a href={data.encryptedBlobUrl} download="cipher.enc">Download Encrypted</a>
              )}
            </div>
          </>
        )}

        {showEncArea && !isImage && (
          <div style={{ marginTop: 6 }}>
            <div
              className="nodrag"
              style={{
                width: "100%",
                minHeight: 44,
                background: "white",
                border: "1px solid #aaa",
                borderRadius: 6,
                padding: "8px",
                color: "#333",
                fontFamily: "monospace",
                fontSize: 11,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                lineHeight: 1.4,
                boxSizing: "border-box",
              }}
            >
              Enc: {encValue}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {cipherType === "xor" && data?.fullBinary && (
                <button
                  onClick={handleCopyBinary}
                  className="nodrag"
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #aaa",
                    borderRadius: 4,
                    cursor: "pointer",
                    background: "#eee",
                    fontSize: 11,
                  }}
                >
                  {copyBinaryText}
                </button>
              )}
              {(cipherType === "aes" || cipherType === "des") && data?.fullBinary && (
                <button
                  onClick={handleCopyEnc}
                  className="nodrag"
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #aaa",
                    borderRadius: 4,
                    cursor: "pointer",
                    background: "#eee",
                    fontSize: 11,
                  }}
                >
                  {copyEncText}
                </button>
              )}
            </div>
          </div>
        )}

        {!result && !isImage && (
          <div style={{ fontSize: 12, color: "#666" }}>
            Waiting for result...
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(CiphertextNode);
