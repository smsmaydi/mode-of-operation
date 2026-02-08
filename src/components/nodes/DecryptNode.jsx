import React, { useState } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { checkModeForDeleteButton } from "../../utils/nodeHelpers";

export default function DecryptNode({ id, data }) {
  const instance = useReactFlow();
  const showLabels = !!data?.showHandleLabels;
  const [cipherType, setCipherType] = useState(data.cipherType || "aes");

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid #333",
        borderRadius: 6,
        background: "#FFB6C1",
        minWidth: 200,
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

      <strong>Decrypt</strong>
      <Handle type="target" position={Position.Top} id="encrypted" style={{ background: "orange", left: "70%" }} />
      <Handle type="target" position={Position.Left} id="key" style={{ background: "blue", top: "30%" }} />
      <Handle type="source" position={Position.Bottom} id="out" style={{ background: "#000" }} />

      {showLabels && (
        <>
          <div style={{ position: "absolute", top: -14, left: "62%", fontSize: 10, color: "#FF8C00" }}>
            encrypted
          </div>
          <div style={{ position: "absolute", top: "24%", left: -36, fontSize: 10, color: "#06c" }}>
            key
          </div>
          <div style={{ position: "absolute", bottom: -14, left: "44%", fontSize: 10, color: "#111" }}>
            out
          </div>
        </>
      )}

      <br />
      <label style={{ fontSize: 12, fontWeight: "bold" }}>Algorithm:</label>
      <select
        value={cipherType}
        className="nodrag"
        onChange={(e) => {
          const val = e.target.value;
          setCipherType(val);
          data.onChange?.(id, { cipherType: val });
        }}
        style={{
          width: "100%",
          padding: "3px 6px",
          fontSize: 12,
          borderRadius: 4,
          border: "1px solid #999",
          marginTop: 4,
          background: "white",
        }}
      >
        <option value="aes">AES</option>
        <option value="des">DES</option>
      </select>

      {data.preview && (
        <div style={{ marginTop: 8 }}>
          <textarea
            readOnly
            value={data.preview}
            className="nodrag"
            style={{
              width: "100%",
              minHeight: 60,
              maxHeight: 150,
              padding: "6px",
              fontSize: 10,
              fontFamily: "monospace",
              borderRadius: 4,
              border: "1px solid #999",
              background: "rgba(255,255,255,0.9)",
              resize: "none",
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          />
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <button
          className="nodrag"
          onClick={() => data.onRunDecrypt?.(id)}
          style={{ borderRadius: 5, border: "solid 1px #333", cursor: "pointer" }}
        >
          Run
        </button>
      </div>
    </div>
  );
}
