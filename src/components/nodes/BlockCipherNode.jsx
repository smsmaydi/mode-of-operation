import React from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { xorImageFileWithKey } from "../../utils/xorImageFile";

export default function BlockCipherNode({ id, data }) {
  const instance = useReactFlow();
  console.log("Render:", BlockCipherNode);
  return (
    <div
      style={{
        padding: 10,
        border: "1px solid #333",
        borderRadius: 6,
        background: "Orange",
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
        }}
      >
        ❌
      </button>

      <strong>BlockCipher (XOR)</strong>
      <Handle type="target" position={Position.Top}     id="plaintext"  style={{ background: "green", left: "70%" }} />
      <Handle type="target" position={Position.Left}   id="key"        style={{ background: "blue", top: "30%" }} />
      <Handle type="target" position={Position.Left}    id="prevCipher" style={{ background: "pink", top: "70%" }} />
      <Handle type="target" position={Position.Top}     id="iv"         style={{ background: "red", left: "30%" }} />
      <Handle type="source" position={Position.Bottom}  id="out"        style={{ background: "#000" }} />


      <div style={{ marginTop: 10 }}>
        <button onClick={() => data.onRunXor?.(id)}>Run XOR</button>
      </div>
      
    </div>
  );
}
