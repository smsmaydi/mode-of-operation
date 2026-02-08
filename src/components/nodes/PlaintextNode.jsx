import React, { useState, useRef, useLayoutEffect } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { fileToPixelBytes } from "../crypto/imageToBytes";
import { checkModeForDeleteButton } from "../../utils/nodeHelpers";

export default function PlaintextNode({ id, data }) {
  const instance = useReactFlow();
  const showLabels = !!data?.showHandleLabels;
  const [inputType, setInputType] = useState("text");
  const [text, setText] = useState("");
  const [bits, setBits] = useState("");
  const [file, setFile] = useState(null);
  const taRef = useRef(null);



  const onTextChange = (e) => {
      const rawValue = e.target.value;

      setInputType("text");

      const formatted = formatBlocks(rawValue, 16);

      setText(formatted);
      setBits("");
      setFile(null);

      data.onChange?.(id, {
        inputType: "text",
        value: formatted,
        bits: "",
        file: null,
      });
  };

  const onBitsChange = (e) => {
    const cleaned = (e.target.value || "").replace(/[^01]/g, ""); // only 0 and 1
    setInputType("bits");
    setBits(cleaned);         // state update
    setText("");
    setFile(null);

    data.onChange?.(id, { 
      inputType: "bits", 
      value: cleaned, 
      text: "",    
      file: null     
    });
  };

  const onFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setInputType("image");
    setFile(file);
    setText("");
    setBits("");

    const pixelBytes = await fileToPixelBytes(file, {
      width: 256,
      height: 256,
    });

    data.onChange?.(id, {
      inputType: "image",
      value: file,  // ← Store the actual File object, not pixelBytes!
      width: 256,
      height: 256,
      pixelBytes,   // ← Store pixels separately if needed for preview
    });
  };

  const onEncryptedFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setInputType("encrypted");
    setFile(file);
    setText("");
    setBits("");

    data.onChange?.(id, {
      inputType: "encrypted",
      value: file,
      width: undefined,
      height: undefined,
      pixelBytes: undefined,
    });
  };

  useLayoutEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height = `${taRef.current.scrollHeight}px`;
  }, [text, inputType]);


  const formatBlocks = (str, blockSize = 16) => {
    const raw = (str || "").replace(/\n/g, ""); // delete old line breaks
    let out = "";
    for (let i = 0; i < raw.length; i += blockSize) {
      out += raw.slice(i, i + blockSize) + "\n";
    }
    return out.replace(/\n$/, ""); // remove last newLine
  };



  return (
    <div
      style={{
        padding: 10,
        border: "1px solid #666",
        borderRadius: 6,
        background: "lightgreen",
        minWidth: 220,
        position: "relative",
      }}
    >
      <button
        onClick={() => instance.deleteElements({ nodes: [{ id }] })}
        id='delete-btn'
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

      <strong>Plaintext</strong>
      <div style={{ marginTop: 8 }}>
  <div>
    <textarea style={{ width: '80%', lineHeight:1.4, padding:5, resize:'none' , overflow:'hidden', border: '1px solid #999', borderRadius:4, fontFamily:'monospace' }}
      placeholder="Text..." 
      value={inputType === "text" ? text : ""} 
      onChange={onTextChange} 
      className="nodrag"
    />
  </div>
  <div style={{ marginTop: 6 }}>
    <input 
      placeholder="Bits..." 
      value={inputType === "bits" ? bits : ""} 
      onChange={onBitsChange} 
      className="nodrag"
    />
  </div>
  <div style={{ marginTop: 6 }}>
    <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 2 }}>
      Image file (encrypt)
    </div>
    <input 
      type="file" 
      accept="image/*" 
      onChange={onFileChange}
      className="nodrag" 
    />
    <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
      Use this for original images.
    </div>
  </div>
  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 2 }}>
      Encrypted file (decrypt)
    </div>
    <input 
      type="file" 
      accept=".enc,.bin,application/octet-stream" 
      onChange={onEncryptedFileChange}
      className="nodrag" 
    />
    <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
      Use the .enc/.bin you downloaded.
    </div>
  </div>
</div>
      <Handle type="source" position={Position.Bottom} id="out" />
      <Handle type="source" position={Position.Right} id="outRight" style={{ top: "50%" }} />
      {showLabels && (
        <>
          <div style={{ position: "absolute", bottom: -14, left: "44%", fontSize: 10, color: "#111" }}>
            out
          </div>
          <div style={{ position: "absolute", top: "46%", right: -24, fontSize: 10, color: "#111" }}>
            out
          </div>
        </>
      )}
    </div>
  );
}
