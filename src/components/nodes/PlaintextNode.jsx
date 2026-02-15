import React, { useState, useEffect } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { fileToPixelBytes } from "../crypto/imageToBytes";
import { checkModeForDeleteButton } from "../../utils/nodeHelpers";

function textToHex(str) {
  if (typeof str !== "string") return "";
  return Array.from(str)
    .map((c) => (c.charCodeAt(0) & 0xff).toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

function hexToText(hexStr) {
  if (typeof hexStr !== "string") return "";
  const cleaned = hexStr.replace(/\s/g, "").replace(/[^0-9a-fA-F]/g, "");
  const bytes = [];
  for (let i = 0; i + 2 <= cleaned.length; i += 2) {
    bytes.push(parseInt(cleaned.slice(i, i + 2), 16));
  }
  return String.fromCharCode(...bytes);
}

/** Hex string (any length) → bit string. */
function encryptedHexToBits(hexStr) {
  const cleaned = String(hexStr || "").replace(/\s/g, "").replace(/[^0-9a-fA-F]/g, "");
  let out = "";
  for (let i = 0; i + 2 <= cleaned.length; i += 2) {
    const byte = parseInt(cleaned.slice(i, i + 2), 16);
    out += byte.toString(2).padStart(8, "0");
  }
  return out;
}

/** Bit string → hex string (no spaces, for value). */
function encryptedBitsToHex(bitsStr) {
  const cleaned = String(bitsStr || "").replace(/\s/g, "").replace(/[^01]/g, "");
  const padded = cleaned.length % 8 ? cleaned.padEnd(cleaned.length + (8 - (cleaned.length % 8)), "0") : cleaned;
  const out = [];
  for (let i = 0; i < padded.length; i += 8) {
    const byte = padded.slice(i, i + 8);
    out.push(parseInt(byte || "0", 2).toString(16).toUpperCase().padStart(2, "0"));
  }
  return out.join("");
}

function PlaintextNode({ id, data }) {
  const instance = useReactFlow();
  const showLabels = !!data?.showHandleLabels;
  const [inputType, setInputType] = useState(data?.inputType || "text");
  const [text, setText] = useState(data?.inputType === "text" ? (data?.value || "") : "");
  const [hex, setHex] = useState(
    data?.inputType === "text" && data?.value
      ? textToHex(data.value)
      : data?.inputType === "bits" && data?.value
      ? (data.value.match(/.{1,4}/g) || []).map((nibble) => parseInt(nibble, 2).toString(16).toUpperCase().padStart(1, "0")).join(" ")
      : ""
  );
  const [file, setFile] = useState(null);
  const [isDecryptMode, setIsDecryptMode] = useState(false);

  // Sync from external data (e.g. preset/mode change)
  useEffect(() => {
    if (data?.inputType !== inputType) {
      setInputType(data?.inputType || "text");
    }
    if (data?.inputType === "text" && data?.value !== undefined && data.value !== text) {
      setText(data.value);
      setHex(textToHex(data.value));
    } else if (data?.inputType === "bits" && data?.value !== undefined) {
      const bits = String(data.value).replace(/[^01]/g, "");
      const padded = bits.length % 8 ? bits + "0".repeat(8 - (bits.length % 8)) : bits;
      const hexFromBits = (padded.match(/.{8}/g) || [])
        .map((b) => parseInt(b, 2).toString(16).toUpperCase().padStart(2, "0"))
        .join(" ");
      setHex(hexFromBits);
      setText(hexToText(hexFromBits.replace(/\s/g, "")));
    }
  }, [data?.inputType, data?.value]);

  const onTextChange = (e) => {
    const rawValue = e.target.value;
    setInputType("text");
    setText(rawValue);
    setHex(textToHex(rawValue));
    setFile(null);
    data.onChange?.(id, {
      inputType: "text",
      value: rawValue,
      bits: "",
      file: null,
    });
  };

  const onHexChange = (e) => {
    const rawHex = e.target.value;
    setInputType("text");
    setHex(rawHex);
    const derivedText = hexToText(rawHex);
    setText(derivedText);
    setFile(null);
    data.onChange?.(id, {
      inputType: "text",
      value: derivedText,
      bits: "",
      file: null,
    });
  };

  const onFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setInputType("image");
    setFile(file);
    setText("");
    setHex("");

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
    setHex("");

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
                setHex("");
                
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
                setHex("");
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
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Text:</div>
              <textarea
                style={{
                  width: "100%",
                  height: 72,
                  lineHeight: 1.4,
                  padding: 6,
                  resize: "none",
                  overflow: "auto",
                  border: "1px solid #999",
                  borderRadius: 4,
                  fontFamily: "monospace",
                  boxSizing: "border-box",
                }}
                placeholder="Metin yazın..."
                value={text}
                onChange={onTextChange}
                className="nodrag"
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Hex:</div>
              <textarea
                style={{
                  width: "100%",
                  height: 56,
                  lineHeight: 1.4,
                  padding: 6,
                  resize: "none",
                  overflow: "auto",
                  border: "1px solid #999",
                  borderRadius: 4,
                  fontFamily: "monospace",
                  boxSizing: "border-box",
                }}
                placeholder="Hex (Text ile senkron)"
                value={hex}
                onChange={onHexChange}
                className="nodrag"
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Img: (dosya girişi)</div>
              <input type="file" accept="image/*" onChange={onFileChange} className="nodrag" />
              <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
                Resim şifrelemek için dosya seçin.
              </div>
            </div>
          </>
        ) : (
          <div>
            {/* Decrypt: Hex (top) and Bits (bottom), synced like IV */}
            <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Hex:</div>
            <textarea
              value={data?.inputType === "encrypted" && typeof data?.value === "string"
                ? (data.value.replace(/(.{2})/g, "$1 ").trim())
                : ""}
              onChange={(e) => {
                const raw = e.target.value;
                const cleaned = raw.replace(/\s/g, "").replace(/[^0-9a-fA-F]/g, "");
                data.onChange?.(id, {
                  inputType: "encrypted",
                  value: cleaned,
                  isDecryptMode: true,
                });
              }}
              placeholder="Şifreli hex (örn. A1 B2 C3...)"
              style={{
                width: "100%",
                height: 48,
                padding: 4,
                fontSize: 10,
                fontFamily: "monospace",
                resize: "none",
                border: "1px solid #999",
                borderRadius: 4,
                boxSizing: "border-box",
              }}
              className="nodrag"
            />
            <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4, marginTop: 6 }}>Bits:</div>
            <textarea
              value={data?.inputType === "encrypted" && typeof data?.value === "string"
                ? encryptedHexToBits(data.value)
                : ""}
              onChange={(e) => {
                const raw = (e.target.value || "").replace(/[^01]/g, "");
                const hexValue = encryptedBitsToHex(raw);
                data.onChange?.(id, {
                  inputType: "encrypted",
                  value: hexValue,
                  isDecryptMode: true,
                });
              }}
              placeholder="0 ve 1 (şifreli bitler)"
              style={{
                width: "100%",
                height: 48,
                padding: 4,
                fontSize: 10,
                fontFamily: "monospace",
                resize: "none",
                border: "1px solid #999",
                borderRadius: 4,
                boxSizing: "border-box",
              }}
              className="nodrag"
            />

            {/* Encrypted File Upload */}
            <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 2, marginTop: 8 }}>
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
  return prevProps.id === nextProps.id &&
         prevProps.data?.inputType === nextProps.data?.inputType &&
         prevProps.data?.value === nextProps.data?.value &&
         prevProps.data?.mode === nextProps.data?.mode &&
         prevProps.data?.showHandleLabels === nextProps.data?.showHandleLabels &&
         prevProps.data?.isDecryptMode === nextProps.data?.isDecryptMode;
});
