import React, { useState, useRef, useLayoutEffect, useCallback, useEffect } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { fileToPixelBytes } from "../crypto/imageToBytes";
import { checkModeForDeleteButton } from "../../utils/nodeHelpers";

function PlaintextNode({ id, data }) {
  const instance = useReactFlow();
  const showLabels = !!data?.showHandleLabels;
  const [inputType, setInputType] = useState(data?.inputType || "text");
  const [text, setText] = useState(data?.inputType === "text" ? (data?.value || "") : "");
  const [bits, setBits] = useState(data?.inputType === "bits" ? (data?.value || "") : "");
  const [file, setFile] = useState(null);
  const [isDecryptMode, setIsDecryptMode] = useState(false);
  const [encryptedText, setEncryptedText] = useState("");
  const taRef = useRef(null);

  // Sync state when preset data changes (e.g., when mode changes)
  useEffect(() => {
    if (data?.inputType !== inputType) {
      setInputType(data?.inputType || "text");
      if (data?.inputType === "text") {
        setText(data?.value || "");
        setBits("");
      } else if (data?.inputType === "bits") {
        setBits(data?.value || "");
        setText("");
      }
    }
  }, [data?.inputType, data?.value]);



  const onTextChange = (e) => {
      const rawValue = e.target.value;
      console.log('📝 PlaintextNode.onTextChange called with:', rawValue);

      setInputType("text");

      const formatted = formatBlocks(rawValue, 16);

      setText(formatted);
      setBits("");
      setFile(null);

      console.log('📝 Calling onChange with formatted value:', formatted);
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
      fileTimestamp: Date.now(), // Force BlockCipherNode to recognize file change
    });
  };

  const onEncryptedFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    console.log("📁 Encrypted file selected:", file.name);

    setInputType("encryptedFile");
    setFile(file);
    setText("");
    setBits("");

    const updateData = {
      inputType: "encryptedFile",
      value: file,
      encryptedImageFile: file, // Use this property so App.js can find it
      isDecryptMode: true,
      fileName: file.name,
      fileTimestamp: Date.now(), // Force BlockCipherNode to recognize file change
      cipherType: "aes", // .enc files are AES encrypted, set cipher type automatically
    };
    
    console.log("📤 PlaintextNode.onChange() called with:", {
      inputType: updateData.inputType,
      encryptedImageFile: !!updateData.encryptedImageFile,
      cipherType: updateData.cipherType,
      fileName: updateData.fileName,
    });

    // Store File object with proper property names for App.js
    data.onChange?.(id, updateData);
  };

  useLayoutEffect(() => {
    // Disabled auto-resize to prevent ResizeObserver loop
    // Textareas now have fixed height
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

      <strong>Plaintext {isDecryptMode ? "🔓 DECRYPT" : "🔐 ENCRYPT"}</strong>
      
      {/* Encrypt/Decrypt Toggle */}
      <div style={{ marginTop: 8, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none", fontSize: 12, fontWeight: "bold" }}>
          <input
            type="checkbox"
            checked={isDecryptMode}
            onChange={(e) => {
              const newDecryptMode = e.target.checked;
              setIsDecryptMode(newDecryptMode);
              
              if (!newDecryptMode) {
                // Switching to encrypt mode - clear decrypt-related state
                setInputType("text");
                setFile(null);
                setEncryptedText("");
                
                // Clear all downstream nodes (BlockCipher and Ciphertext)
                const allNodes = instance.getNodes();
                const allEdges = instance.getEdges();
                
                // Find connected BlockCipher nodes
                const connectedBlocks = allEdges
                  .filter(e => e.source === id)
                  .map(e => allNodes.find(n => n.id === e.target))
                  .filter(n => n && n.type === "blockcipher");
                
                // Find connected Ciphertext nodes (through BlockCipher)
                const connectedCiphertexts = connectedBlocks.flatMap(block => 
                  allEdges
                    .filter(e => e.source === block.id)
                    .map(e => allNodes.find(n => n.id === e.target))
                    .filter(n => n && n.type === "ciphertext")
                );
                
                // Update nodes to clear decrypt-related data
                const updatedNodes = allNodes.map(n => {
                  if (n.id === id) {
                    return {
                      ...n,
                      data: {
                        ...n.data,
                        isDecryptMode: false,
                        inputType: "text",
                        value: "",
                      }
                    };
                  }
                  if (connectedBlocks.some(b => b.id === n.id)) {
                    return {
                      ...n,
                      data: {
                        ...n.data,
                        decryptedContent: undefined,
                        preview: "",
                        fullBinary: undefined,
                        lastPlaintext: undefined,
                        lastKey: undefined,
                      }
                    };
                  }
                  if (connectedCiphertexts.some(c => c.id === n.id)) {
                    return {
                      ...n,
                      data: {
                        ...n.data,
                        decryptedContent: undefined,
                        result: "",
                        fullBinary: undefined,
                      }
                    };
                  }
                  return n;
                });
                
                instance.setNodes(updatedNodes);
              } else {
                // Switching to decrypt mode
                setInputType("encrypted");
                setText("");
                setBits("");
                setFile(null);
              }
              
              // Update parent when toggle changes
              data.onChange?.(id, {
                isDecryptMode: newDecryptMode,
                inputType: newDecryptMode ? "encrypted" : "text",
                value: "",
              });
            }}
            style={{ display: "none" }}
            className="nodrag"
          />
          <div
            style={{
              width: 50,
              height: 24,
              borderRadius: 12,
              background: isDecryptMode ? "#4CAF50" : "#ccc",
              position: "relative",
              transition: "background 0.3s ease",
              display: "flex",
              alignItems: "center",
              padding: "0 2px",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "white",
                position: "absolute",
                left: isDecryptMode ? 28 : 2,
                transition: "left 0.3s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            />
          </div>
          <span style={{ marginLeft: 6, fontSize: 12, fontWeight: "bold" }}>
            {isDecryptMode ? "Decrypt" : "Encrypt"}
          </span>
        </label>
      </div>

      <div style={{ marginTop: 8 }}>
        {!isDecryptMode ? (
          <>
            <div>
              <textarea style={{ width: '80%', height: 80, lineHeight:1.4, padding:5, resize:'none' , overflow:'auto', border: '1px solid #999', borderRadius:4, fontFamily:'monospace' }}
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
          </>
        ) : (
          <div>
            {/* Encrypted Text Paste Area */}
            <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 2 }}>
              Encrypted Text (paste)
            </div>
            <textarea 
              value={encryptedText}
              onChange={(e) => {
                const val = e.target.value;
                setEncryptedText(val);
                // Update parent with encrypted text
                data.onChange?.(id, {
                  inputType: "encrypted",
                  value: val,
                  isDecryptMode: true,
                });
              }}
              placeholder="Paste encrypted text here..."
              style={{
                width: "95%",
                padding: 5,
                fontSize: 11,
                fontFamily: "monospace",
                resize: "none",
                height: 80,
                overflow: "auto",
                border: "1px solid #999",
                borderRadius: 4,
                marginBottom: 8
              }}
              className="nodrag"
            />

            {/* Encrypted File Upload */}
            <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 2 }}>
              Encrypted File (decrypt)
            </div>
            <input 
              type="file" 
              accept="*"
              onChange={onEncryptedFileChange}
              className="nodrag" 
            />
            <div style={{ fontSize: 11, color: "#444", marginTop: 2, marginBottom: 8 }}>
              Upload encrypted file (.enc, .bin, or binary)
            </div>

          </div>
        )}
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

export default React.memo(PlaintextNode, (prevProps, nextProps) => {
  // Re-render only if id or specific data properties change, not position
  return prevProps.id === nextProps.id && 
         JSON.stringify(prevProps.data?.inputType) === JSON.stringify(nextProps.data?.inputType) &&
         JSON.stringify(prevProps.data?.value) === JSON.stringify(nextProps.data?.value) &&
         JSON.stringify(prevProps.data?.bits) === JSON.stringify(nextProps.data?.bits) &&
         JSON.stringify(prevProps.data?.mode) === JSON.stringify(nextProps.data?.mode) &&
         JSON.stringify(prevProps.data?.showHandleLabels) === JSON.stringify(nextProps.data?.showHandleLabels);
});
