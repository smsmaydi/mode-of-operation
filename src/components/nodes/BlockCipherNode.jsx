import React, { useEffect } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { checkModeForDeleteButton } from "../../utils/nodeHelpers";

function BlockCipherNode({ id, data }) {
  const instance = useReactFlow();
  const showLabels = !!data?.showHandleLabels;
  const cipherType = data.cipherType || "xor";

  // Auto-trigger cipher for encrypted image files (no on-canvas Run control).
  useEffect(() => {
    if (data.inputType === "encryptedImage" && data.encryptedImageFile && data.keyBits) {
      data.onRunCipher?.(id);
    }
  }, [data.encryptedImageFile, data.keyBits, data.inputType, data.onRunCipher, id]);

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--node-blockcipher-bg)",
        color: "var(--node-blockcipher-text)",
        minWidth: 172,
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
          color: "var(--danger)",
          fontWeight: "bold",
          display: checkModeForDeleteButton(data?.mode),
        }}
      >
        ❌
      </button>

      <strong>BlockCipher</strong>
      <Handle type="target" position={Position.Top}     id="plaintext"  style={{ background: "green", left: "70%" }} />
      <Handle type="target" position={Position.Left}   id="key"        style={{ background: "blue", top: "30%" }} />
      <Handle type="target" position={Position.Top} id="xor" style={{ background: "purple", left: "30%" }} />
      <Handle type="target" position={Position.Top}   id="ctr"        style={{ background: "var(--edge-ctr-input)" }} />
      <Handle type="source" position={Position.Bottom}  id="out"        style={{ background: "var(--text)" }} />

      {showLabels && (
        <>
          <div style={{ position: "absolute", top: -14, left: "62%", fontSize: 10, color: "var(--success)" }}>
            plaintext
          </div>
          <div style={{ position: "absolute", top: "24%", left: -36, fontSize: 10, color: "var(--accent-primary)" }}>
            key
          </div>
          <div style={{ position: "absolute", top: -14, left: "18%", fontSize: 10, color: "var(--edge-xor)" }}>
            xor
          </div>
          <div style={{ position: "absolute", top: -14, left: "42%", fontSize: 10, color: "var(--edge-ctr-input)" }}>
            ctr
          </div>
          <div style={{ position: "absolute", bottom: -14, left: "44%", fontSize: 10, color: "var(--text)" }}>
            out
          </div>
        </>
      )}

      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
        {cipherType === "aes" ? "AES" : "XOR"}
      </div>
    </div>
  );
}

export default React.memo(BlockCipherNode);
