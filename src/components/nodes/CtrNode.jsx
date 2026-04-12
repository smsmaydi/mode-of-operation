import React from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { checkModeForDeleteButton } from "../../utils/nodeHelpers";

const ZERO_64 = "0".repeat(64);

export default function CtrNode({ id, data }) {
  const instance = useReactFlow();
  const showLabels = !!data?.showHandleLabels;
  const [nonceBits, setNonceBits] = React.useState(data?.nonceBits || "");
  const [counterBits, setCounterBits] = React.useState(data?.counterBits || ZERO_64);

  const onNonceChange = (e) => {
    const cleaned = (e.target.value || "").replace(/[^01]/g, "");
    setNonceBits(cleaned);
    data.onChange?.(id, { nonceBits: cleaned });
  };

  const onCounterChange = (e) => {
    const cleaned = (e.target.value || "").replace(/[^01]/g, "");
    setCounterBits(cleaned);
    data.onChange?.(id, { counterBits: cleaned });
  };

  const generateRandomBits = (length) => {
    const bytes = new Uint8Array(Math.ceil(length / 8));
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    let result = "";
    for (let i = 0; i < length; i++) {
      const byte = bytes[Math.floor(i / 8)];
      const bit = (byte >> (7 - (i % 8))) & 1;
      result += bit ? "1" : "0";
    }
    setNonceBits(result);
    data.onChange?.(id, { nonceBits: result });
  };

  const resetCounter = () => {
    setCounterBits(ZERO_64);
    data.onChange?.(id, { counterBits: ZERO_64 });
  };

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid var(--edge-ctr-input)",
        borderRadius: "var(--radius-sm)",
        background: "var(--accent-soft)",
        color: "var(--text)",
        minWidth: 212,
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

      <strong>Nonce + Counter</strong>

      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 2 }}>
            Nonce (random)
          </div>
          <input
            value={nonceBits}
            onChange={onNonceChange}
            placeholder="bits"
            className="nodrag"
            style={{
              width: "100%",
              padding: "3px 6px",
              fontSize: 10,
              borderRadius: 4,
              border: "1px solid var(--border)",
              background: "var(--node-field-bg)",
              color: "var(--node-field-text)",
              fontFamily: "monospace",
            }}
          />
          <div style={{ marginTop: 4, display: "flex", gap: 4 }}>
            <button
              onClick={() => generateRandomBits(64)}
              className="nodrag"
              style={{
                flex: 1,
                padding: "4px",
                fontSize: 10,
                cursor: "pointer",
                borderRadius: 4,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--node-action-btn-text)",
              }}
            >
              🎲 64
            </button>
            <button
              onClick={() => generateRandomBits(128)}
              className="nodrag"
              style={{
                flex: 1,
                padding: "4px",
                fontSize: 10,
                cursor: "pointer",
                borderRadius: 4,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--node-action-btn-text)",
              }}
            >
              🎲 128
            </button>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 2 }}>
            Counter (start 0)
          </div>
          <input
            value={counterBits}
            onChange={onCounterChange}
            placeholder="bits"
            className="nodrag"
            readOnly
            style={{
              width: "100%",
              padding: "3px 6px",
              fontSize: 10,
              borderRadius: 4,
              border: "1px solid var(--border)",
              background: "var(--surface-hover)",
              color: "var(--node-field-text)",
              fontFamily: "var(--font-mono)",
            }}
          />
          <div style={{ marginTop: 4 }}>
            <button
              onClick={resetCounter}
              className="nodrag"
              style={{
                width: "100%",
                padding: "4px",
                fontSize: 10,
                cursor: "pointer",
                borderRadius: 4,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--node-action-btn-text)",
              }}
            >
              Reset to 0
            </button>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} id="out" style={{ background: "var(--edge-ctr-input)" }} />
      {showLabels && (
        <div style={{ position: "absolute", bottom: -14, left: "44%", fontSize: 10, color: "var(--edge-ctr-input)" }}>
          out
        </div>
      )}
    </div>
  );
}
