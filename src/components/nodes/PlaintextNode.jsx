import React, { useState, useRef, useLayoutEffect } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { fileToPixelBytes } from "../crypto/imageToBytes";

export default function PlaintextNode({ id, data }) {
  const instance = useReactFlow();
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
      width: 512,
      height: 512,
    });

    data.onChange?.(id, {
      inputType: "image",
      value: pixelBytes,
      width: 512,
      height: 512,
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

      <strong>Plaintext</strong>
      <div style={{ marginTop: 8 }}>
  <div>
    <textarea style={{ width: '80%', lineHeight:1.4, padding:5, resize:'none' , overflow:'hidden', border: '1px solid #999', borderRadius:4, fontFamily:'monospace' }}
      placeholder="Text..." 
      value={inputType === "text" ? text : ""} 
      onChange={onTextChange} 
    />
  </div>
  <div style={{ marginTop: 6 }}>
    <input 
      placeholder="Bits..." 
      value={inputType === "bits" ? bits : ""} 
      onChange={onBitsChange} 
    />
  </div>
  <div style={{ marginTop: 6 }}>
    <input 
      type="file" 
      accept="image/*" 
      onChange={onFileChange} 
    />
  </div>
</div>


      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
