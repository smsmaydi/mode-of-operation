import React from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { xorImageFileWithKey } from "../../utils/xorImageFile";

export default function BlockCipherNode({ id, data }) {
  const instance = useReactFlow();

  const runXor = async () => {
    const plaintextFile = data?.plaintextFile;
    const keyBits = data?.keyBits;

    console.log("BlockCipher: runXor got", { plaintextFile, keyBits });

    if (!(plaintextFile instanceof File)) {
      console.warn("Run XOR: plaintext File yok");
      return;
    }
    if (!keyBits || keyBits.replace(/[^01]/g, "").length === 0) {
      console.warn("Run XOR: keyBits yok veya boş");
      return;
    }

    try {
      const dataUrl = await xorImageFileWithKey(plaintextFile, keyBits);
      instance.setNodes((nds) =>
        nds.map((nn) =>
          nn.id === id
            ? { ...nn, data: { ...nn.data, preview: dataUrl } }
            : nn
        )
      );

      console.log("BlockCipher: XOR tamam, ciphertext updated");
    } catch (err) {
      console.error("BlockCipher: XOR hata", err);
    }
  };

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
      <Handle type="target" position={Position.Top}     id="plaintext"  style={{ background: "lightgreen" }} />
      <Handle type="target" position={Position.Right}   id="key"        style={{ background: "lightblue" }} />
      <Handle type="target" position={Position.Left}    id="prevCipher" style={{ background: "pink", top: "30%" }} />
      <Handle type="target" position={Position.Left}    id="iv"         style={{ background: "#ff0", top: "70%" }} />
      <Handle type="source" position={Position.Bottom}  id="out"        style={{ background: "#000" }} />


      <div style={{ marginTop: 10 }}>
        <button onClick={() => data.onRunXor?.(id)}>Run XOR</button>
      </div>
      <div style={{ marginTop: 6, fontSize: 12 }}>
        {data.preview || "Connect plaintext + key"}
      </div>
    </div>
  );
}
