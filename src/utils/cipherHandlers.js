import { encryptFileAES, decryptFileAES } from "./aesFile";
import { encryptFileDES, decryptFileDES } from "./desFile";
import { encryptImageAesEcb, decryptImageAesEcb } from "./aesEcbImage";
import { encryptImageAesCbc, decryptImageAesCbc } from "./aesCbcImage";
import { fileToPixelBytes } from "../components/crypto/imageToBytes";
import { xorRgbaBytesWithKey } from "./imageXor";
import { rgbaBytesToPngDataUrl } from "./bytesToDataUrl";

// Helper: Convert binary string to hex
export function bitsToHex(bits) {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = bits.substr(i, 4);
    hex += parseInt(nibble, 2).toString(16);
  }
  return hex;
}

export async function runXorHandler({
  blockId,
  currentNodes,
  currentEdges,
  currentMode,
  setNodes,
}) {
  const block = currentNodes.find((n) => n.id === blockId);

  if (!block) return;

  console.log("🎯 onRunXor - block.data:", block.data);
  console.log("   plaintextFile:", block.data.plaintextFile);
  console.log("   encryptedImageFile:", block.data.encryptedImageFile);
  console.log("   isDecryptMode:", block.data.isDecryptMode);
  console.log("   keyBits:", block.data.keyBits);
  console.log("   keyBits type:", typeof block.data.keyBits);
  console.log("   keyBits is string?", typeof block.data.keyBits === "string");
  console.log("   mode:", currentMode);

  // Check if decrypt mode
  const isDecrypt = block.data.isDecryptMode;
  let fileInput = isDecrypt ? block.data.encryptedImageFile : block.data.plaintextFile;
  let keyBits = block.data.keyBits;

  // CTR mode: locate plaintext file via XOR node and use keystream bits
  if (currentMode === "ctr") {
    keyBits = block.data.fullBinary || "";

    if (!fileInput) {
      const xorEdge = currentEdges.find(
        (e) => e.source === blockId && e.sourceHandle === "out" && (e.targetHandle === "pc" || e.targetHandle === "pcTop")
      );
      const xorNode = xorEdge ? currentNodes.find((n) => n.id === xorEdge.target) : null;
      const ptEdge = xorNode
        ? currentEdges.find(
            (e) => e.target === xorNode.id && (e.targetHandle === "pt" || e.targetHandle === "ptLeft")
          )
        : null;
      const ptNode = ptEdge ? currentNodes.find((n) => n.id === ptEdge.source) : null;
      fileInput = ptNode?.data?.value || fileInput;
    }
  }

  if (!fileInput || !keyBits) {
    alert("Missing image or key/keystream!");
    return;
  }

  // Ensure keyBits is a string
  if (typeof keyBits !== "string") {
    console.log("❌ keyBits is not a string! Converting...", keyBits);
    alert("Key bits format is invalid!");
    return;
  }

  // Convert File object to pixel bytes
  const input = await fileToPixelBytes(fileInput, { width: 256, height: 256 });

  // Find output edge (to ciphertext node)
  const outEdge = currentEdges.find((e) => e.source === blockId && e.sourceHandle === "out");
  const ctId = outEdge?.target;

  // For CBC mode: find previous ciphertext or IV
  let prevBytes = null;
  if (currentMode === "cbc") {
    // Look for XOR node connected to BlockCipher
    const xorEdge = currentEdges.find((e) => e.target === blockId && e.targetHandle === "xor");

    if (xorEdge) {
      // Found XOR node, get IV from the XOR node's inputs
      const xorNode = currentNodes.find((n) => n.id === xorEdge.source);
      console.log("🔍 CBC Mode - XOR node found:", xorNode?.id);

      if (xorNode) {
        // Find IV or prevCipher connected to XOR node
        const ivEdge = currentEdges.find((e) => e.target === xorNode.id && e.targetHandle === "pc");
        if (ivEdge) {
          const ivNode = currentNodes.find((n) => n.id === ivEdge.source);
          console.log("🔍 IV/PrevCipher node found:", ivNode?.type, ivNode?.id);

          if (ivNode) {
            if (ivNode.type === "iv") {
              // IV node: convert bits to bytes
              const ivBits = ivNode.data.bits || "";
              console.log("🔍 IV bits:", ivBits);
              const clean = ivBits.replace(/\s+/g, "");
              if (/^[01]+$/.test(clean) && clean.length % 8 === 0) {
                prevBytes = new Uint8Array(clean.length / 8);
                for (let i = 0; i < prevBytes.length; i++) {
                  prevBytes[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
                }
                console.log("✅ IV bytes created:", Array.from(prevBytes.slice(0, 4)));
              } else {
                console.log("❌ Invalid IV bits format");
              }
            } else if (ivNode.type === "ciphertext" && ivNode.data.xorBytes) {
              // Previous ciphertext: use xorBytes directly
              prevBytes = ivNode.data.xorBytes;
              console.log("✅ Previous ciphertext bytes:", Array.from(prevBytes.slice(0, 4)));
            }
          }
        }
      }
    } else {
      // Old flow: direct prevCipher connection to BlockCipher (fallback)
      const prevEdge = currentEdges.find((e) => e.target === blockId && e.targetHandle === "prevCipher");
      console.log("🔍 CBC Mode - Looking for prevCipher edge:", prevEdge);

      if (prevEdge) {
        const prevNode = currentNodes.find((n) => n.id === prevEdge.source);
        console.log("🔍 prevNode found:", prevNode?.type, prevNode?.id);

        if (prevNode) {
          if (prevNode.type === "iv") {
            // IV node: convert bits to bytes
            const ivBits = prevNode.data.bits || "";
            console.log("🔍 IV bits:", ivBits);
            const clean = ivBits.replace(/\s+/g, "");
            if (/^[01]+$/.test(clean) && clean.length % 8 === 0) {
              prevBytes = new Uint8Array(clean.length / 8);
              for (let i = 0; i < prevBytes.length; i++) {
                prevBytes[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
              }
              console.log("✅ IV bytes created:", Array.from(prevBytes.slice(0, 4)));
            } else {
              console.log("❌ Invalid IV bits format");
            }
          } else if (prevNode.type === "ciphertext" && prevNode.data.xorBytes) {
            // Previous ciphertext: use xorBytes directly
            prevBytes = prevNode.data.xorBytes;
            console.log("✅ Previous ciphertext bytes:", Array.from(prevBytes.slice(0, 4)));
          } else {
            console.log("❌ prevNode type not IV or ciphertext, or no xorBytes");
          }
        }
      } else {
        console.log("❌ No prevCipher edge found");
      }
    }
  }

  console.log("🔍 Final prevBytes:", prevBytes ? Array.from(prevBytes.slice(0, 4)) : null);

  // Perform XOR encryption
  let outBytes;
  if (currentMode === "cbc" && prevBytes) {
    console.log("🔐 CBC XOR: plaintext ⊕ prevBytes ⊕ key");
    console.log("   Input first 4 pixels:", input.slice(0, 16));
    console.log("   PrevBytes first 16:", Array.from(prevBytes.slice(0, 16)));
    console.log("   KeyBits:", keyBits?.slice(0, 32));

    // CBC: plaintext ⊕ prevBytes ⊕ key
    // First: XOR with prevBytes (Uint8Array ⊕ Uint8Array)
    const withPrev = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
      withPrev[i] = input[i] ^ prevBytes[i % prevBytes.length];
    }
    console.log("   After XOR with prevBytes, first 4 pixels:", withPrev.slice(0, 16));

    // Second: XOR with key (Uint8Array ⊕ bit string)
    outBytes = xorRgbaBytesWithKey(withPrev, keyBits);
    console.log("   After XOR with key, first 4 pixels:", outBytes.slice(0, 16));
  } else {
    console.log("🔐 ECB XOR: plaintext ⊕ key (or CBC without prevBytes)");
    console.log("   Input first 4 pixels:", input.slice(0, 16));
    console.log("   KeyBits:", keyBits?.slice(0, 32));

    // ECB or CBC without prevBytes: plaintext ⊕ key
    outBytes = xorRgbaBytesWithKey(input, keyBits);
    console.log("   Output first 4 pixels:", outBytes.slice(0, 16));
  }

  const outUrl = rgbaBytesToPngDataUrl(outBytes, 256, 256);

  console.log("✅ XOR Complete - ctId:", ctId, "mode:", currentMode, "hasPrevBytes:", !!prevBytes);

  // Update nodes with result
  setNodes((nds) =>
    nds.map((n) => {
      if (n.id === blockId) {
        return { ...n, data: { ...n.data, preview: outUrl, xorBytes: outBytes } };
      }
      if (ctId && n.id === ctId) {
        return { ...n, data: { ...n.data, result: outUrl, xorBytes: outBytes } };
      }
      return n;
    })
  );
}

export function runCipherHandler({ blockId, edges, mode, setNodes, onRunXor }) {
  setNodes((currentNodes) => {
    console.log("onRunCipher fired", blockId);

    const block = currentNodes.find((n) => n.id === blockId);
    console.log("block found?", !!block, block?.data);
    if (!block) return currentNodes;

    const cipherType = block.data?.cipherType || "xor";

    // Check if file input is coming from PlaintextNode
    // In ECB/CBC modes, PlaintextNode connects to XOR, so we need to find it via XOR node
    let plaintextNode = null;
    let plaintextInputType = null;
    let plaintextIsEncrypted = false;

    // First try direct connection (ECB mode): PlaintextNode -> BlockCipher
    let plaintextEdge = edges.find((e) => e.target === blockId && e.targetHandle === "plaintext");
    if (plaintextEdge) {
      plaintextNode = currentNodes.find((n) => n.id === plaintextEdge.source);
    }

    // If not found, try XOR connection (CBC/CTR mode): PlaintextNode -> XOR -> BlockCipher (or CTR node for CTR mode)
    if (!plaintextNode) {
      // For CBC: XOR connected to BlockCipher with "xor" handle
      const xorEdge = edges.find((e) => e.target === blockId && e.targetHandle === "xor");
      if (xorEdge) {
        const xorNode = currentNodes.find((n) => n.id === xorEdge.source);
        if (xorNode?.type === "xor") {
          // Find PlaintextNode connected to this XOR
          const xorPtEdge = edges.find(
            (e) => e.target === xorNode.id && (e.targetHandle === "pt" || e.targetHandle === "ptLeft")
          );
          plaintextNode = xorPtEdge ? currentNodes.find((n) => n.id === xorPtEdge.source) : null;
        }
      }
      
      // For CTR: find XOR node connected to BlockCipher with pcTop handle, then find PlaintextNode
      if (!plaintextNode && mode === "ctr") {
        const ctrXorEdge = edges.find((e) => e.source === blockId && e.sourceHandle === "out" && (e.targetHandle === "pc" || e.targetHandle === "pcTop"));
        const xorNode = ctrXorEdge ? currentNodes.find((n) => n.id === ctrXorEdge.target) : null;
        if (xorNode?.type === "xor") {
          // Find PlaintextNode connected to XOR's ptLeft handle
          const xorPtEdge = edges.find(
            (e) => e.target === xorNode.id && (e.targetHandle === "pt" || e.targetHandle === "ptLeft")
          );
          plaintextNode = xorPtEdge ? currentNodes.find((n) => n.id === xorPtEdge.source) : null;
        }
      }
    }

    plaintextInputType = plaintextNode?.data?.inputType;
    plaintextIsEncrypted = plaintextInputType === "encryptedFile";

    const isImageMode = plaintextInputType === "image" || plaintextInputType === "encryptedFile";
    const isEncryptedInput = plaintextIsEncrypted;

    console.log("cipherType =", cipherType);
    console.log("isImageMode =", isImageMode);
    console.log("plaintextInputType =", plaintextInputType);
    console.log("isEncryptedInput =", isEncryptedInput);

    if (cipherType === "xor") {
      onRunXor(blockId, currentNodes, edges, mode); // ← Pass mode!
      return currentNodes;
    }

    if (isImageMode) {
      // Get file from PlaintextNode directly (PlaintextNode's value field contains the File object)
      const plaintextFile = plaintextNode?.data?.value;
      const file = isEncryptedInput ? plaintextFile : plaintextFile;

      console.log("📁 File from PlaintextNode:", file?.name, "isEncrypted:", isEncryptedInput);

      if (!file) {
        alert("No file loaded in PlaintextNode");
        return currentNodes;
      }

      // For AES/DES, we need keyText, but we have keyBits from Key node
      // Use keyBits directly as passphrase for AES
      // For DES, convert first 64 bits to 8 characters
      const keyBits = block.data.keyBits || "";
      let keyText = block.data.keyText || "";

      console.log("🔑 KEY INFO:", {
        keyBits: keyBits.slice(0, 32) + "...",
        keyBitsLength: keyBits.length,
        keyBitsType: typeof keyBits,
        isBinary: /^[01]+$/.test(keyBits),
        keyText: keyText.slice(0, 32) + "...",
      });

      try {
        if (cipherType === "aes") {
          // Key is in hex format (32 chars = 128 bits, 64 chars = 256 bits)
          // Check if it's a valid hex key
          const isHexKey = /^[0-9a-f]+$/i.test(keyBits) && (keyBits.length === 32 || keyBits.length === 64);
          const isBinaryKey = /^[01]+$/.test(keyBits) && keyBits.length >= 8;
          const isValidKey = isHexKey || isBinaryKey;

          console.log("🔍 AES cipher mode routing:", {
            mode,
            isHexKey,
            isBinaryKey,
            isValidKey,
            keyBitsLength: keyBits.length,
            isImageMode,
            isEncryptedInput,
          });

          // Use hex key directly if available, otherwise convert binary to hex
          const keyHexForEncryption = isHexKey ? keyBits : isBinaryKey ? bitsToHex(keyBits) : null;

          if (!isValidKey || !keyHexForEncryption) {
            console.warn("❌ Invalid key format:", { isValidKey, keyHexForEncryption });
            return currentNodes;
          }

          // For ECB mode: use block-by-block encryption with hex key
          if (mode === "ecb" && isValidKey) {
            console.log("🔐 AES-ECB Image Mode (demonstrating ECB weakness)");

            // Use hex key directly
            const keyHex = keyHexForEncryption;
            console.log("  Key (HEX):", keyHex);

            const outEdge = edges.find((e) => e.source === blockId && e.sourceHandle === "out");
            const ctId = outEdge?.target;

            if (isEncryptedInput) {
              // Decrypt ECB image from .enc file
              console.log("🔓 ECB DECRYPT MODE - reading file:", file.name);
              const reader = new FileReader();
              reader.onload = (e) => {
                console.log("📖 FileReader onload triggered, bytes:", e.target.result?.byteLength);
                try {
                  const encryptedBytes = new Uint8Array(e.target.result);
                  console.log("🔍 Decrypting", encryptedBytes.length, "bytes with key:", keyHex);
                  const decryptedPixels = decryptImageAesEcb(encryptedBytes, keyHex);
                  console.log("✅ Decryption successful, pixels:", decryptedPixels.length);
                  const url = rgbaBytesToPngDataUrl(decryptedPixels, 256, 256);
                  console.log("🖼️ PNG URL created, updating nodes...");

                  setNodes((nds) => {
                    console.log("📝 setNodes callback - updating", nds.length, "nodes");
                    return nds.map((n) => {
                      if (n.id === blockId) {
                        console.log("  ✓ Updating blockId:", blockId);
                        return { ...n, data: { ...n.data, preview: url, encryptedBlobUrl: undefined } };
                      }
                      if (ctId && n.id === ctId) {
                        console.log("  ✓ Updating ctId:", ctId);
                        return { ...n, data: { ...n.data, result: url, encryptedBlobUrl: undefined } };
                      }
                      return n;
                    });
                  });
                  console.log("✅ setNodes called successfully");
                } catch (err) {
                  console.error("❌ Decrypt error:", err);
                  alert("AES-ECB decryption error: " + err.message);
                }
              };
              reader.onerror = () => {
                console.error("❌ FileReader error");
                alert("Error reading encrypted file");
              };
              console.log("📂 Starting FileReader for:", file.name);
              reader.readAsArrayBuffer(file);
            } else {
              // Encrypt ECB image
              fileToPixelBytes(file, { width: 256, height: 256 })
                .then((pixelBytes) => {
                  const encryptedPixels = encryptImageAesEcb(pixelBytes, keyHex);

                  // Create downloadable .enc file
                  const encBlob = new Blob([encryptedPixels], { type: "application/octet-stream" });
                  const encryptedBlobUrl = URL.createObjectURL(encBlob);

                  // Convert encrypted pixels to PNG for preview (synchronous)
                  const previewUrl = rgbaBytesToPngDataUrl(encryptedPixels, 256, 256);

                  setNodes((nds) =>
                    nds.map((n) => {
                      if (n.id === blockId) {
                        return { ...n, data: { ...n.data, preview: previewUrl, encryptedBlobUrl } };
                      }
                      if (ctId && n.id === ctId) {
                        return { ...n, data: { ...n.data, result: previewUrl, encryptedBlobUrl } };
                      }
                      return n;
                    })
                  );
                })
                .catch((err) => {
                  alert("AES-ECB encryption error: " + err.message);
                });
            }

            return currentNodes;
          }

          // For CBC mode: use chained block encryption with IV
          if (mode === "cbc" && isValidKey) {
            console.log("🔐 AES-CBC Image Mode (secure - patterns hidden)");

            // Use hex key directly
            const keyHex = keyHexForEncryption;
            console.log("  Key (HEX):", keyHex);

            // Find IV node (look for any IV node in the graph)
            const ivNode = currentNodes.find((n) => n.type === "iv");
            const ivBits = ivNode?.data?.bits || "";

            console.log("  IV Node found:", !!ivNode, "IV Bits length:", ivBits.length);

            // Convert IV bits to hex (must be 128 bits = 32 hex chars)
            if (!ivBits || ivBits.length !== 128) {
              alert(
                "CBC mode requires 128-bit IV (128 binary digits). Please add an IV node and generate 128-bit value."
              );
              return currentNodes;
            }

            const ivHex = bitsToHex(ivBits);
            console.log("  IV (HEX):", ivHex);

            const outEdge = edges.find((e) => e.source === blockId && e.sourceHandle === "out");
            const ctId = outEdge?.target;

            if (isEncryptedInput) {
              // Decrypt CBC image
              console.log("🔓 CBC DECRYPT MODE - reading file:", file.name, "with IV:", ivHex);
              const reader = new FileReader();
              reader.onload = (e) => {
                console.log("📖 FileReader onload triggered, bytes:", e.target.result?.byteLength);
                try {
                  const encryptedBytes = new Uint8Array(e.target.result);
                  console.log(
                    "🔍 Decrypting",
                    encryptedBytes.length,
                    "bytes with key:",
                    keyHex,
                    "IV:",
                    ivHex
                  );
                  const decryptedPixels = decryptImageAesCbc(encryptedBytes, keyHex, ivHex);
                  console.log("✅ Decryption successful, pixels:", decryptedPixels.length);
                  const url = rgbaBytesToPngDataUrl(decryptedPixels, 256, 256);
                  console.log("🖼️ PNG URL created, updating nodes...");

                  setNodes((nds) => {
                    console.log("📝 setNodes callback - updating", nds.length, "nodes");
                    return nds.map((n) => {
                      if (n.id === blockId) {
                        console.log("  ✓ Updating blockId:", blockId);
                        return { ...n, data: { ...n.data, preview: url, encryptedBlobUrl: undefined } };
                      }
                      if (ctId && n.id === ctId) {
                        console.log("  ✓ Updating ctId:", ctId);
                        return { ...n, data: { ...n.data, result: url, encryptedBlobUrl: undefined } };
                      }
                      return n;
                    });
                  });
                  console.log("✅ setNodes called successfully");
                } catch (err) {
                  console.error("❌ Decrypt error:", err);
                  alert("AES-CBC decryption error: " + err.message);
                }
              };
              reader.onerror = () => {
                console.error("❌ FileReader error");
                alert("Error reading encrypted file");
              };
              console.log("📂 Starting FileReader for:", file.name);
              reader.readAsArrayBuffer(file);
            } else {
              // Encrypt CBC image
              fileToPixelBytes(file, { width: 256, height: 256 })
                .then((pixelBytes) => {
                  const encryptedPixels = encryptImageAesCbc(pixelBytes, keyHex, ivHex);

                  // Create downloadable .enc file
                  const encBlob = new Blob([encryptedPixels], { type: "application/octet-stream" });
                  const encryptedBlobUrl = URL.createObjectURL(encBlob);

                  // Convert encrypted pixels to PNG for preview
                  const previewUrl = rgbaBytesToPngDataUrl(encryptedPixels, 256, 256);

                  setNodes((nds) =>
                    nds.map((n) => {
                      if (n.id === blockId) {
                        return { ...n, data: { ...n.data, preview: previewUrl, encryptedBlobUrl } };
                      }
                      if (ctId && n.id === ctId) {
                        return { ...n, data: { ...n.data, result: previewUrl, encryptedBlobUrl } };
                      }
                      return n;
                    })
                  );
                })
                .catch((err) => {
                  alert("AES-CBC encryption error: " + err.message);
                });
            }

            return currentNodes;
          }

          // Fallback to AES-GCM for non-ECB/CBC modes
          const passphrase = keyText || keyBits;
          if (!passphrase) throw new Error("Missing AES key");

          const outEdge = edges.find((e) => e.source === blockId && e.sourceHandle === "out");
          const ctId = outEdge?.target;

          if (isEncryptedInput) {
            decryptFileAES(file, passphrase)
              .then(({ url }) => {
                setNodes((nds) =>
                  nds.map((n) => {
                    if (n.id === blockId) {
                      return { ...n, data: { ...n.data, preview: url, encryptedBlobUrl: undefined } };
                    }
                    if (ctId && n.id === ctId) {
                      return { ...n, data: { ...n.data, result: url, encryptedBlobUrl: undefined } };
                    }
                    return n;
                  })
                );
              })
              .catch(() => {
                alert("AES decryption error: The key may be incorrect or the file may be corrupted. ");
              });
          } else {
            encryptFileAES(file, passphrase)
              .then(({ previewUrl, encryptedBlobUrl }) => {
                setNodes((nds) =>
                  nds.map((n) => {
                    if (n.id === blockId) {
                      return { ...n, data: { ...n.data, preview: previewUrl, encryptedBlobUrl } };
                    }
                    if (ctId && n.id === ctId) {
                      return { ...n, data: { ...n.data, result: previewUrl, encryptedBlobUrl } };
                    }
                    return n;
                  })
                );
              })
              .catch((err) => {
                alert("AES encryption error: " + err.message);
              });
          }
        } else if (cipherType === "des") {
          // For DES: convert first 64 bits to 8 characters, or use keyText
          if (!keyText && keyBits) {
            if (keyBits.length < 64) {
              throw new Error("DES requires at least 64 bits. Please generate 128 or 256 bit key.");
            }
            keyText = "";
            for (let i = 0; i < 8; i++) {
              const byte = keyBits.slice(i * 8, i * 8 + 8);
              keyText += String.fromCharCode(parseInt(byte, 2));
            }
          }

          if (!keyText || keyText.length !== 8) {
            throw new Error("DES key must be exactly 8 characters");
          }

          const outEdge = edges.find((e) => e.source === blockId && e.sourceHandle === "out");
          const ctId = outEdge?.target;

          if (isEncryptedInput) {
            decryptFileDES(file, keyText)
              .then(({ url }) => {
                setNodes((nds) =>
                  nds.map((n) => {
                    if (n.id === blockId) {
                      return { ...n, data: { ...n.data, preview: url, encryptedBlobUrl: undefined } };
                    }
                    if (ctId && n.id === ctId) {
                      return { ...n, data: { ...n.data, result: url, encryptedBlobUrl: undefined } };
                    }
                    return n;
                  })
                );
              })
              .catch((err) => {
                alert("DES decryption error: " + err.message);
              });
          } else {
            encryptFileDES(file, keyText)
              .then(({ previewUrl, encryptedBlobUrl }) => {
                setNodes((nds) =>
                  nds.map((n) => {
                    if (n.id === blockId) {
                      return { ...n, data: { ...n.data, preview: previewUrl, encryptedBlobUrl } };
                    }
                    if (ctId && n.id === ctId) {
                      return { ...n, data: { ...n.data, result: previewUrl, encryptedBlobUrl } };
                    }
                    return n;
                  })
                );
              })
              .catch((err) => {
                alert("DES encryption error: " + err.message);
              });
          }
        }
      } catch (err) {
        console.error("Cipher error:", err);
        alert("Cipher error: " + err.message);
      }
      return currentNodes;
    }

    // Not image mode: text-based encryption happens in computeGraph
    return currentNodes;
  });
}
