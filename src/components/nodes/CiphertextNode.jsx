import React, { useState, useEffect, useMemo } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { checkModeForDeleteButton } from "../../utils/nodeHelpers";
import { cipherFullBinaryToHexBytes, cipherOutputToByteRows } from "../../utils/cipherDisplay";

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

  const hexBytes = useMemo(
    () => cipherFullBinaryToHexBytes(data?.fullBinary ?? encValue),
    [data?.fullBinary, encValue]
  );

  const byteRows = useMemo(
    () => cipherOutputToByteRows(data?.fullBinary ?? encValue),
    [data?.fullBinary, encValue]
  );

  const hexLine = hexBytes.length ? hexBytes.join(" ") : "";

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

  const actionBtnStyle = {
    padding: "6px 12px",
    border: "1px solid var(--border)",
    borderRadius: 4,
    cursor: "pointer",
    background: "var(--surface-hover)",
    color: "var(--node-action-btn-text)",
    fontSize: 11,
  };

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface)",
        color: "var(--text)",
        minWidth: 172,
        width: "max-content",
        maxWidth: 300,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
      }}
    >
      <button
        type="button"
        className="nodrag"
        onClick={() => instance.deleteElements({ nodes: [{ id }] })}
        style={{
          position: "absolute",
          top: 2,
          right: 2,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "var(--danger)",
          fontWeight: "bold",
          display: checkModeForDeleteButton(data?.mode),
        }}
      >
        ❌
      </button>

      <strong>Ciphertext</strong>
      <Handle type="target" position={Position.Top} id="in" style={{ background: "var(--edge-xor)" }} />
      <Handle type="source" position={Position.Right} id="out" style={{ top: "50%" }} />
      {showLabels && (
        <>
          <div
            style={{
              position: "absolute",
              top: -14,
              left: "46%",
              fontSize: "var(--text-label-size)",
              color: "var(--edge-xor)",
            }}
          >
            in
          </div>
          <div
            style={{
              position: "absolute",
              right: -36,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "var(--text-label-size)",
              color: "var(--text)",
            }}
          >
            out
          </div>
        </>
      )}

      <div
        style={{
          marginTop: 8,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {isImage && (
          <div className="nodrag">
            <img
              src={deferredResult}
              alt="cipher"
              style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 4, display: "block" }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              <a href={result} download="cipher.png" style={{ color: "var(--accent-primary)" }}>
                Download
              </a>
              {data?.encryptedBlobUrl && (
                <a href={data.encryptedBlobUrl} download="cipher.enc" style={{ color: "var(--accent-primary)" }}>
                  Download Encrypted
                </a>
              )}
            </div>
          </div>
        )}

        {showEncArea && !isImage && (
          <div style={{ marginTop: 2 }}>
            <div
              className="nodrag"
              style={{
                width: "100%",
                minHeight: 36,
                background: "var(--node-field-bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 8px",
                boxSizing: "border-box",
                textAlign: "left",
              }}
            >
              {hexBytes.length > 0 ? (
                <>
                  {byteRows.length > 0 ? (
                    <>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "var(--text-muted)",
                          marginBottom: 3,
                        }}
                      >
                        Binary
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          maxHeight: 48,
                          minHeight: 28,
                          overflowY: "auto",
                          flexShrink: 0,
                        }}
                      >
                        {byteRows.map((row, idx) => (
                          <div
                            key={`${row.hex}-${idx}`}
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--node-field-text)",
                              letterSpacing: "0.05em",
                              lineHeight: 1.3,
                            }}
                          >
                            {row.bits8}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                  <div
                    style={{
                      marginTop: byteRows.length > 0 ? 6 : 0,
                      paddingTop: byteRows.length > 0 ? 6 : 0,
                      borderTop: byteRows.length > 0 ? "1px solid var(--border-subtle)" : "none",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--node-field-text)",
                      lineHeight: 1.45,
                      wordBreak: "break-all",
                    }}
                  >
                    {hexLine}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    color: "var(--node-field-text)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    lineHeight: 1.4,
                  }}
                >
                  {String(encValue)}
                </div>
              )}
            </div>
            <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {cipherType === "xor" && data?.fullBinary && (
                <button type="button" onClick={handleCopyBinary} className="nodrag" style={actionBtnStyle}>
                  {copyBinaryText}
                </button>
              )}
              {cipherType === "aes" && data?.fullBinary && (
                <button type="button" onClick={handleCopyEnc} className="nodrag" style={actionBtnStyle}>
                  {copyEncText}
                </button>
              )}
            </div>
          </div>
        )}

        {!result && !isImage && (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Waiting for result...</div>
        )}
      </div>
    </div>
  );
}

export default React.memo(CiphertextNode);
