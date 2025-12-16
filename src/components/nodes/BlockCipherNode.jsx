import React , {useState } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { xorImageFileWithKey } from "../../utils/xorImageFile";

export default function BlockCipherNode({ id, data }) {
  const instance = useReactFlow();
  console.log("Render:", BlockCipherNode);

  const [cipherType, setCipherType] = useState(data.cipherType || "xor");


  const effectiveCipherType = data.cipherType || "xor";

  const keyLabel =
    effectiveCipherType === "aes"
      ? "AES key"
      : effectiveCipherType === "des"
      ? "DES key (8 chars)"
      : "XOR key";

  const keyPlaceholder =
    effectiveCipherType === "aes"
      ? "passphrase"
      : effectiveCipherType === "des"
      ? "8 characters"
      : "";


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

      <strong>BlockCipher</strong>
      <Handle type="target" position={Position.Top}     id="plaintext"  style={{ background: "green", left: "70%" }} />
      <Handle type="target" position={Position.Left}   id="key"        style={{ background: "blue", top: "30%" }} />
      <Handle type="target" position={Position.Left}    id="prevCipher" style={{ background: "pink", top: "70%" }} />
      <Handle type="target" position={Position.Top}     id="iv"         style={{ background: "red", left: "30%" }} />
      <Handle type="source" position={Position.Bottom}  id="out"        style={{ background: "#000" }} />

      <br/>
      <label style={{ fontSize: 12, fontWeight: "bold" }}>Algorithm:</label>
      <select
        value={cipherType}
        onChange={(e) => 
          {
            const val = e.target.value;
            setCipherType(val);
            data.onChange?.(id, { cipherType: val });
          }
        }
        style={{
          width: "100%",
          padding: "3px 6px",
          fontSize: 12,
          borderRadius: 4,
          border: "1px solid #999",
          marginTop: 4,
          background: "white"
        }}
      >
        <option value="xor">XOR</option>
        <option value="aes">AES</option>
        <option value="des">DES</option>
      </select>
      

      <div style={{ marginTop: 10 }}>
        <button onClick={() => data.onRunCipher?.(id)} style={{ borderRadius: 5, border: "solid 1px #333", cursor: "pointer" }}>
          Run
        </button>
      </div>      
    </div>
  );
}
