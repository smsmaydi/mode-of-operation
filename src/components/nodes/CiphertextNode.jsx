import React, {useState, useRef, useLayoutEffect} from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { checkModeForDeleteButton } from "../../utils/nodeHelpers";

function CiphertextNode({ id, data }) {
  const instance = useReactFlow();
  const result = data?.result || "";
  const [buttonText, setButtonText] = useState("Copy Binary");
  const showLabels = !!data?.showHandleLabels;
  const taRef = useRef(null);

  

  // Image files starts with blob: or data:image
  const isImage =
    typeof result === "string" &&
    (result.startsWith("blob:") || result.startsWith("data:image"));

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

  useLayoutEffect(() => {
    if (!taRef.current || !showTextArea) return;
    const timer = setTimeout(() => {
      if (taRef.current) {
        taRef.current.style.height = "auto";
        taRef.current.style.height = `${taRef.current.scrollHeight}px`;
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [result, showTextArea]);

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
          display: checkModeForDeleteButton(data?.mode),
        }}
      >
        ❌
      </button>

      <strong>Ciphertext</strong>
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

      {}
      <div style={{ marginTop: 8, marginRight: 8, textAlign: "center",width:'100%', height: '100%', aspectRatio:'1 / 1' }}>
        {isImage && (
          <>
            <img
              src={result}
              alt="cipher"
              style={{ width: "100%", height: "100%", objectFit:"contain", borderRadius: 4, display: 'block' }}
            />
            <div style={{ marginTop: 6 }}>
              <a href={result} download="cipher.png">Download</a>
            </div>
            {data?.encryptedBlobUrl && (
              <div style={{ marginTop: 6 }}>
                <a href={data.encryptedBlobUrl} download="cipher.enc">Download Encrypted</a>
              </div>
            )}
          </>
        )}


        {showTextArea && (
          <div style={{ marginTop: 6 }}>
            {data?.decryptedContent ? (
              // Decrypt mode display
              <>
                <textarea
                  value={`${data?.cipherType?.toUpperCase() || "AES"}\nENC: ${(data?.fullBinary || "").slice(0, 100)}...\nPlaintext: ${data.decryptedContent}`}
                  readOnly
                  className="nodrag"
                  style={{
                    width: "90%",
                    minHeight: 60,
                    maxHeight: 200,
                    background: "white",
                    border: "1px solid #aaa",
                    borderRadius: 6,
                    padding: "8px",
                    marginRight: 0,
                    color: "#333",
                    fontFamily: "monospace",
                    fontSize: 11,
                    resize: "none",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    lineHeight: 1.5
                  }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(data?.fullBinary || "");
                    setButtonText("Copied ENC!");
                    setTimeout(() => setButtonText("Copy ENC"), 2000);
                  }}
                  className="nodrag"
                  style={{
                    marginTop: 6,
                    padding: "6px 12px",
                    border: "1px solid #aaa",
                    borderRadius: 4,
                    cursor: "pointer",
                    background: "white",
                    fontSize: 11,
                  }}
                >
                  {buttonText === "Copied ENC!" ? buttonText : "Copy ENC"}
                </button>
              </>
            ) : (
              // Encrypt mode display (original)
              <textarea
                ref={taRef}
                value={result}
                readOnly
                className="nodrag"
                style={{
                  width: "90%",
                  minHeight: 60,
                  background: "white",
                  border: "1px solid #aaa",
                  borderRadius: 6,
                  padding: "8px",
                  marginRight: 0,
                  color: "#333",
                  fontFamily: "monospace",
                  fontSize: 11,
                  resize: "none",
                  overflow: "hidden",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  lineHeight: 1.5
                }}
              />
            )}
          </div>
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
          className="nodrag"
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}

export default React.memo(CiphertextNode);
