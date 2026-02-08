import React , {useState, useEffect } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { xorImageFileWithKey } from "../../utils/xorImageFile";
import { checkModeForDeleteButton } from "../../utils/nodeHelpers";

function BlockCipherNode({ id, data }) {
  const instance = useReactFlow();
  const showLabels = !!data?.showHandleLabels;

  const [cipherType, setCipherType] = useState(data.cipherType || "xor");

  // Auto-trigger Run for encrypted image files
  useEffect(() => {
    if (data.inputType === "encryptedImage" && data.encryptedImageFile && data.keyBits) {
      console.log("🔄 Auto-triggering Run for encrypted image file");
      data.onRunCipher?.(id);
    }
  }, [data.encryptedImageFile, data.keyBits, data.inputType, data.onRunCipher, id]);

  // const handleCipherChange = (e) => {
  //   const v = e.target.value;
  //   console.log("BlockCipherNode select changed to:", v, "node id:", id);
  //   data.onChange?.(id, { cipherType: v });
  // };


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
          display: checkModeForDeleteButton(data?.mode),
        }}
      >
        ❌
      </button>

      <strong>BlockCipher</strong>
      <Handle type="target" position={Position.Top}     id="plaintext"  style={{ background: "green", left: "70%" }} />
      <Handle type="target" position={Position.Left}   id="key"        style={{ background: "blue", top: "30%" }} />
      <Handle type="target" position={Position.Top} id="xor" style={{ background: "purple", left: "30%" }} />
      <Handle type="target" position={Position.Top}   id="ctr"        style={{ background: "#5a4ecb" }} />
      <Handle type="source" position={Position.Bottom}  id="out"        style={{ background: "#000" }} />

      {showLabels && (
        <>
          <div style={{ position: "absolute", top: -14, left: "62%", fontSize: 10, color: "#0a0" }}>
            plaintext
          </div>
          <div style={{ position: "absolute", top: "24%", left: -36, fontSize: 10, color: "#06c" }}>
            key
          </div>
          <div style={{ position: "absolute", top: -14, left: "18%", fontSize: 10, color: "#7a1fa2" }}>
            xor
          </div>
          <div style={{ position: "absolute", top: -14, left: "42%", fontSize: 10, color: "#5a4ecb" }}>
            ctr
          </div>
          <div style={{ position: "absolute", bottom: -14, left: "44%", fontSize: 10, color: "#111" }}>
            out
          </div>
        </>
      )}

      <br/>
      <label style={{ fontSize: 12, fontWeight: "bold" }}>Algorithm:</label>
      <select
        value={cipherType}
        className="nodrag"
        onChange={(e) => 
          {
            const val = e.target.value;
            setCipherType(val);
            data.onChange?.(id, { cipherType: val });
            // handleCipherChange(e);
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
        <button className="nodrag" onClick={() => data.onRunCipher?.(id)} style={{ borderRadius: 5, border: "solid 1px #333", cursor: "pointer" }}>
          Run
        </button>
      </div>      
    </div>
  );
}

export default React.memo(BlockCipherNode);
