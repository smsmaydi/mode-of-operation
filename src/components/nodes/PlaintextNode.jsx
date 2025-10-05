import React, {useState} from "react";
import { Handle, Position, useReactFlow } from "reactflow";

export default function PlaintextNode({ id, data }) {
  const instance = useReactFlow();
  const [inputType, setInputType] = useState("text");
  const [text, setText] = useState("");
  const [bits, setBits] = useState("");
  const [file, setFile] = useState(null);


 const onTextChange = (e) => {
  const value = e.target.value;
  setInputType("text");
  setText(value);           // ✅ state update
  setBits("");              // clean the rest
  setFile(null);
  
  data.onChange?.(id, { 
    inputType: "text", 
    value, 
    bits: "",       
    file: null   
  });
};

const onBitsChange = (e) => {
  const cleaned = (e.target.value || "").replace(/[^01]/g, ""); // only 0 and 1
  setInputType("bits");
  setBits(cleaned);         // ✅ state update
  setText("");
  setFile(null);

  data.onChange?.(id, { 
    inputType: "bits", 
    value: cleaned, 
    text: "",    
    file: null     
  });
};

const onFileChange = (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) {
    console.log("PlaintextNode: File selected:", file);
    setInputType("image");
    setFile(file);          // ✅ state update
    setText("");
    setBits("");

    data.onChange?.(id, { 
      inputType: "image", 
      value: file, 
      text: "", 
      bits: ""    
    });
  }
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
    <input 
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
