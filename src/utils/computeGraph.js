import { xorBits } from "./bitwise";
import CryptoJS from "crypto-js";

// String → Binary (8 bit ASCII)
function textToBinary(str) {
  return Array.from(str)
    .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("");
}

// Binary → String (in 8bits chunks only)
function binaryToText(binStr) {
  const chars = [];
  for (let i = 0; i < binStr.length; i += 8) {
    const byte = binStr.slice(i, i + 8);
    if (byte.length === 8) {
      chars.push(String.fromCharCode(parseInt(byte, 2)));
    }
  }
  return chars.join("");
}

// Encrypt plaintext bits with AES (per byte)
function encryptBitsWithAES(bits, keyPassphrase) {
  try {
    if (!bits || !keyPassphrase) return null;
    
    // Convert bits to text (8 bits = 1 char)
    const plaintext = binaryToText(bits);
    if (!plaintext) return null;
    
    // Encrypt with CryptoJS AES
    const encrypted = CryptoJS.AES.encrypt(plaintext, keyPassphrase).toString();
    return encrypted;
  } catch (e) {
    console.error("AES encryption error:", e);
    return null;
  }
}

// Encrypt plaintext bits with DES (per byte) - using simple XOR simulation
// Note: CryptoJS doesn't have DES, so we'll use TripleDES
function encryptBitsWithDES(bits, keyString) {
  try {
    if (!bits || !keyString) return null;
    if (keyString.length !== 8) return null;
    
    // Convert bits to text (8 bits = 1 char)
    const plaintext = binaryToText(bits);
    if (!plaintext) return null;
    
    // For DES simulation with CryptoJS TripleDES (since DES not available)
    // We'll use TripleDES with key repeated
    const key = CryptoJS.enc.Utf8.parse(keyString);
    const encrypted = CryptoJS.TripleDES.encrypt(plaintext, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
    return encrypted;
  } catch (e) {
    console.error("DES encryption error:", e);
    return null;
  }
}

// Decrypt AES encrypted data with passphrase
function decryptBitsWithAES(encryptedData, keyPassphrase) {
  try {
    if (!encryptedData || !keyPassphrase) return null;
    
    // Decrypt with CryptoJS AES
    const decrypted = CryptoJS.AES.decrypt(encryptedData, keyPassphrase);
    const plaintextStr = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!plaintextStr) return null;
    
    // Convert back to bits
    return textToBinary(plaintextStr);
  } catch (e) {
    console.error("AES decryption error:", e);
    return null;
  }
}

// Decrypt DES encrypted data with 8-character key
function decryptBitsWithDES(encryptedData, keyString) {
  try {
    if (!encryptedData || !keyString) return null;
    if (keyString.length !== 8) return null;
    
    const key = CryptoJS.enc.Utf8.parse(keyString);
    const decrypted = CryptoJS.TripleDES.decrypt(encryptedData, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });
    const plaintextStr = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!plaintextStr) return null;
    
    // Convert back to bits
    return textToBinary(plaintextStr);
  } catch (e) {
    console.error("DES decryption error:", e);
    return null;
  }
}

export function computeGraphValues(nodes, edges, mode = 'ecb') {
  // Prevent unnecessary processing
  if (!nodes || !edges) return nodes;

  // Store original state for comparison
  const original = JSON.stringify(nodes);

  const valueMap = new Map();
  const incoming = (id) => edges.filter((e) => e.target === id);

  // --- Plaintext & Key nodes ---
  nodes.forEach((n) => {
    if (n.type === "plaintext") {
      let normVal = null;

      if (n.data.inputType === "bits") {
        normVal =
          n.data.value && n.data.value.trim() !== "" ? n.data.value : null;
      } else if (n.data.inputType === "text") {
        normVal =
          n.data.value && n.data.value.trim() !== ""
            ? textToBinary(n.data.value)
            : null;
      } else if (n.data.inputType === "image") {
        normVal = n.data.value || null; // File object
        console.log("📁 Plaintext: Image mode detected, value:", normVal?.name || "no file");
      } else if (n.data.inputType === "encrypted") {
        normVal = n.data.value || null; // Encrypted text string
        console.log("🔒 Plaintext: Encrypted text detected");
      } else if (n.data.inputType === "encryptedFile") {
        normVal = n.data.value || null; // Encrypted File object
        console.log("🔒 Plaintext: Encrypted file detected, value:", normVal?.name || "no file");
      }

      if (!normVal) normVal = null;
      // Here we store both type and value for later use
      // Also store isDecryptMode flag for routing later
      valueMap.set(n.id, { 
        type: n.data.inputType, 
        value: normVal, 
        isDecryptMode: n.data.isDecryptMode,
        decryptKey: n.data.decryptKey,
      });
      console.log("✅ Plaintext valueMap set:", {
        id: n.id,
        type: n.data.inputType,
        isDecryptMode: n.data.isDecryptMode,
        decryptKey: n.data.decryptKey ? n.data.decryptKey.slice(0, 10) + "..." : "none",
        hasValue: !!normVal,
      });
    }

    if (n.type === "key") {
      const bits = n.data.bits && n.data.bits.trim() !== "" ? n.data.bits : null;
      const keyText = n.data.keyText && n.data.keyText.trim() !== "" ? n.data.keyText : null;
      // Store both bits and keyText - will use based on cipher type
      valueMap.set(n.id, { type: "bits", value: bits || keyText, keyText, bits });
      console.log("✅ Key valueMap set:", {
        id: n.id,
        bits: bits?.slice(0, 16) + "...",
        keyText: keyText?.slice(0, 16) + "...",
      });
    }

    if (n.type === "iv") {
      const normVal =
        n.data.bits && n.data.bits.trim() !== "" ? n.data.bits : null;
      // Store IV value as bits
      valueMap.set(n.id, { type: "bits", value: normVal });
      console.log("✅ IV valueMap set:", {
        id: n.id,
        bits: normVal?.slice(0, 16) + "...",
      });
    }

    if (n.type === "ctr") {
      const nonceBits = n.data?.nonceBits || null;
      const counterBits = n.data?.counterBits || null;
      valueMap.set(n.id, { type: "ctr", value: { nonceBits, counterBits } });
      console.log("✅ CTR valueMap set:", {
        id: n.id,
        nonceBits: nonceBits?.slice(0, 16) + "...",
        counterBits: counterBits?.slice(0, 16) + "...",
      });
    }
  });

  // --- XOR nodes (pre-block XOR for CBC) ---
  nodes.forEach((n) => {
    if (n.type === "xor") {
      console.log("🔧 XOR node processing:", n.id);
      
      const inc = incoming(n.id);
      const ptEdge = inc.find((e) => e.targetHandle === "pt");  // plaintext
      const pcEdge = inc.find((e) => e.targetHandle === "pc");  // prevCipher/IV
      
      const ptData = ptEdge ? valueMap.get(ptEdge.source) : null;
      const ptVal = ptData?.value;
      const ptType = ptData?.type;
      const pcVal = pcEdge ? valueMap.get(pcEdge.source)?.value : null;
      
      // If plaintext is an image or encrypted file, skip XOR computation here
      if (ptType === "image" || ptType === "encrypted") {
        console.log("  📁 Image/encrypted detected - skipping XOR node computation");
        n.data = { ...n.data, preview: "File mode - click Run on BlockCipher" };
        valueMap.set(n.id, { type: ptType, value: ptVal });
        return;
      }
      
      // For bits/text: compute XOR
      if (ptVal && pcVal) {
        // XOR the two inputs
        const xorResult = xorBits(ptVal, pcVal);
        if (!xorResult.error) {
          valueMap.set(n.id, { type: "bits", value: xorResult.value });
          n.data = { 
            ...n.data, 
            preview: xorResult.value.slice(0, 16) + "...",
            ptInput: ptVal,
            pcInput: pcVal,
            xorOutput: xorResult.value
          };
          console.log("  ✅ XOR computed:", xorResult.value.slice(0, 16));
        } else {
          n.data = { ...n.data, error: xorResult.error };
        }
      } else {
        n.data = { ...n.data, preview: "Missing inputs", ptInput: null, pcInput: null, xorOutput: null };
        console.log("  ❌ XOR node missing inputs");
      }
    }
  });

  // --- BlockCipher nodes ---

  // inc = incoming edges
  // pEdge = plaintext edge (or xor edge in CBC mode)
  // kEdge = key edge
  // prevEdge = previous ciphertext edge

  // pVal = plaintext value
  // pType = plaintext type (bits/text/image)
  // kVal = key value (bits)
  // prevVal = previous ciphertext value (bits)
  nodes.forEach((n) => {
    if (n.type === "blockcipher") {
      console.log("🔧 BlockCipher node processing:", n.id);
      
      const inc = incoming(n.id);
      const pEdge = mode === "ctr"
        ? inc.find((e) => e.targetHandle === "ctr")
        : inc.find((e) => e.targetHandle === "plaintext" || e.targetHandle === "xor");
      const kEdge = inc.find((e) => e.targetHandle === "key");
      const prevEdge = inc.find((e) => e.targetHandle === "prevCipher");

      console.log("  📥 Incoming edges:", {
        plaintext: !!pEdge,
        key: !!kEdge,
        prevCipher: !!prevEdge,
      });

      const pVal = pEdge ? valueMap.get(pEdge.source)?.value : null;
      const pType = pEdge ? valueMap.get(pEdge.source)?.type : null;
      const pIsDecryptMode = pEdge ? valueMap.get(pEdge.source)?.isDecryptMode : false;
      const pDecryptKey = pEdge ? valueMap.get(pEdge.source)?.decryptKey : null;
      const keyMapEntry = kEdge ? valueMap.get(kEdge.source) : null;
      
      // In decrypt mode, use cipher type from BlockCipherNode, otherwise also from BlockCipherNode
      const cipherType = n.data?.cipherType || "xor";
      
      // Choose key based on cipher type
      let kVal = null;
      if (pIsDecryptMode && pDecryptKey) {
        // Decrypt mode: use key from PlaintextNode
        kVal = pDecryptKey;
      } else if (keyMapEntry) {
        // Encrypt mode: use key from Key node
        if (cipherType === "aes" || cipherType === "des") {
          kVal = keyMapEntry.keyText || keyMapEntry.value;
        } else {
          kVal = keyMapEntry.bits || keyMapEntry.value;
        }
      }
      
      const prevVal = prevEdge ? valueMap.get(prevEdge.source)?.value : null;

      console.log("  🔍 Values from valueMap:", {
        pType,
        pValExists: !!pVal,
        kValExists: !!kVal,
        prevValExists: !!prevVal,
        isDecryptMode: pIsDecryptMode,
      });

      // If any of the required inputs is missing, clear output and return
      if (!pVal || !kVal) {
        console.log("  ❌ Missing required inputs! Clearing output.");
        n.data = {
          ...n.data,
          error: undefined,
          preview: "",
          fullBinary: undefined,
        };
        return;
      }

      // CTR Mode: build keystream from nonce||counter and key
      if (mode === "ctr" && pType === "ctr") {
        const nonceBits = pVal?.nonceBits || "";
        const counterBits = pVal?.counterBits || "";
        const nonceCounter = `${nonceBits}${counterBits}`;

        if (!nonceCounter) {
          n.data = { ...n.data, error: "Missing nonce/counter", preview: undefined };
          return;
        }

        const computedCtr = xorBits(nonceCounter, kVal);
        if (computedCtr.error) {
          n.data = { ...n.data, error: computedCtr.error, preview: undefined };
        } else {
          const outBits = computedCtr.value;
          n.data = {
            ...n.data,
            error: undefined,
            preview: `keystream: ${outBits.slice(0, 32)}...`,
            fullBinary: outBits,
          };
          valueMap.set(n.id, { type: "bits", value: outBits });
        }
        return;
      }

      // Take image file and prepare for XOR
      if (pType === "image") {
        console.log("  🖼️ IMAGE MODE DETECTED!");
        console.log("    pVal type:", typeof pVal);
        console.log("    pVal is File?", pVal instanceof File);
        console.log("    pVal filename:", pVal?.name);
        
        if (pVal !== n.data.plaintextFile) {
          console.log("    ✅ Setting plaintextFile and keyBits");
          n.data = {
            ...n.data,
            preview: "Ready for Run XOR",
            plaintextFile: pVal,
            encryptedFile: undefined,
            keyBits: kVal,
            inputType: "image",
          };
        } else {
          console.log("    ℹ️ plaintextFile already set, just updating keyBits");
          n.data = {
            ...n.data,
            keyBits: kVal,
            inputType: pType,
          };
        }

        valueMap.set(n.id, {
          type: "image",
          value: pVal,
          keyBits: kVal,
        });

        console.log("  ✅ Image valueMap set for next blocks");
        return;
      }

      // DECRYPT MODE: encrypted FILE (image) needs to be decrypted with key
      if (pType === "encryptedFile" && pIsDecryptMode && pVal instanceof File) {
        console.log("  🔒 ENCRYPTED FILE (IMAGE) DECRYPT MODE!");
        console.log("    Encrypted file:", pVal.name);
        
        if (pVal !== n.data.encryptedImageFile || kVal !== n.data.lastKey) {
          console.log("    ✅ Setting encryptedImageFile for decryption");
          n.data = {
            ...n.data,
            preview: "Ready to decrypt image",
            encryptedImageFile: pVal,
            plaintextFile: undefined,
            keyBits: kVal,
            inputType: "encryptedImage",
            isDecryptMode: true,
            lastKey: kVal,
          };
        }

        valueMap.set(n.id, {
          type: "encryptedImage",
          value: pVal,
          keyBits: kVal,
          isDecryptMode: true,
        });

        console.log("  ✅ Encrypted image valueMap set for decryption");
        return;
      }

      // DECRYPT MODE: encrypted content needs to be decrypted with key
      if (pType === "encrypted" && pIsDecryptMode && typeof pVal === 'string') {
        console.log("  🔒 DECRYPT MODE DETECTED!");
        console.log("    Encrypted content (first 50 chars):", pVal.slice(0, 50));
        
        let decryptedBits = null;
        
        if (cipherType === "aes") {
          console.log("    🔓 Decrypting with AES, key:", kVal?.slice(0, 16) + "...");
          decryptedBits = decryptBitsWithAES(pVal, kVal);
        } else if (cipherType === "des") {
          console.log("    🔓 Decrypting with DES, key:", kVal?.slice(0, 8));
          decryptedBits = decryptBitsWithDES(pVal, kVal);
        } else {
          console.log("    ⚠️ Decrypt mode works with AES/DES only, not XOR");
          n.data = {
            ...n.data,
            error: "Decrypt mode requires AES or DES",
            preview: "Use AES or DES for decrypt",
          };
          return;
        }
        
        if (decryptedBits) {
          console.log("    ✅ Decryption successful, bits:", decryptedBits.slice(0, 32) + "...");
          const decryptedText = binaryToText(decryptedBits);
          n.data = {
            ...n.data,
            error: undefined,
            preview: decryptedText.slice(0, 50) + "...",
            fullBinary: decryptedBits,
            decryptedContent: decryptedText,
            cipherType: cipherType,
            lastPlaintext: pVal,
            lastKey: kVal,
            lastCipherType: cipherType,
          };
          valueMap.set(n.id, { type: "bits", value: decryptedBits });
        } else {
          console.log("    ❌ Decryption failed!");
          n.data = {
            ...n.data,
            error: "Decryption failed - wrong key or corrupted file",
            preview: "Decryption failed",
          };
        }
        return;
      }


      // TEXT / BITS CASE: Get cipher type and perform appropriate encryption
      let computed;
      let previewTxt = "";
      
      // Check if inputs have changed - if not, preserve existing encrypted result
      const inputsUnchanged = 
        n.data?.lastPlaintext === pVal && 
        n.data?.lastKey === kVal && 
        n.data?.lastCipherType === cipherType &&
        n.data?.fullBinary;
      
      if (inputsUnchanged) {
        console.log("  ℹ️ Inputs unchanged, preserving encrypted result");
        return;
      }
      
      if (cipherType === "xor") {
        // XOR encryption
        // 
        // ALGORITHM NOTES:
        // Current Implementation: Simple 1:1 XOR between plaintext and key
        //   - Plaintext: N bits
        //   - Key: 128/256 bits
        //   - Result: N bits (only first N bits of key are used)
        //   - Educational purpose: Easy to understand, visualize bit-by-bit operations
        //
        // Real-world AES/DES Implementation (via CryptoJS):
        //   - These use the ENTIRE key in their key schedule
        //   - Plaintext is automatically padded to block size (128 bits for AES, 64 bits for DES)
        //   - All key bits participate in round transformations
        //   - More secure: key reuse doesn't weaken security per block
        //
        // If we want to standardize XOR to use full key (Professional Mode):
        // ─────────────────────────────────────────────────────────────────
        // Option 1 - Key Cycling (repeat key to match plaintext length):
        //   const repeatedKey = kVal.repeat(Math.ceil(pVal.length / kVal.length))
        //                          .slice(0, pVal.length);
        //   computed = xorBits(pVal, repeatedKey);
        //
        // Option 2 - Padding plaintext to key length:
        //   const paddedPlaintext = (pVal + "0".repeat(kVal.length - (pVal.length % kVal.length)))
        //                            .slice(0, kVal.length);
        //   computed = xorBits(paddedPlaintext, kVal);
        //
        // Option 3 - Hybrid (pad plaintext to next multiple of key length):
        //   const blockSize = Math.ceil(pVal.length / kVal.length) * kVal.length;
        //   const paddedPlaintext = (pVal + "0".repeat(blockSize - pVal.length));
        //   const repeatedKey = kVal.repeat(Math.ceil(blockSize / kVal.length))
        //                          .slice(0, blockSize);
        //   computed = xorBits(paddedPlaintext, repeatedKey);
        // ─────────────────────────────────────────────────────────────────
        
        if (mode === 'cbc' && prevVal) {
          // CBC Mode: plaintext ⊕ previous_ciphertext ⊕ key
          const t = xorBits(pVal, prevVal);
          computed = xorBits(t, kVal);
        } else {
          // ECB Mode or first block in CBC: plaintext ⊕ key
          computed = xorBits ? xorBits(pVal, kVal) : { value: pVal };
        }

        if (computed.error) {
          n.data = { ...n.data, error: computed.error, preview: undefined };
        } else {
          const outBits = computed.value;
          const chunks = outBits.match(/.{1,8}/g) || [];
          const ascii = binaryToText(outBits);
          const binaryMultiLine = chunks
            .map((byte, i) => {
              const ch = ascii[i] ?? "";
              const printable =
                ch && ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126 ? ch : ".";
              return `${byte}  ${printable}`;
            })
            .join("\n");

          previewTxt = `XOR out: ${ascii}\nbin:\n${binaryMultiLine}`;

          n.data = {
            ...n.data,
            error: undefined,
            preview: previewTxt,
            fullBinary: outBits,
            lastPlaintext: pVal,
            lastKey: kVal,
            lastCipherType: cipherType,
          };

          valueMap.set(n.id, { type: "bits", value: outBits });

          const outgoingEdges = edges.filter(
            (e) =>
              e.source === n.id &&
              e.sourceHandle === "out" &&
              e.targetHandle === "in"
          );

          outgoingEdges.forEach((e) => {
            const tIdx = nodes.findIndex((nd) => nd.id === e.target);
            if (tIdx !== -1) {
              nodes[tIdx] = {
                ...nodes[tIdx],
                data: {
                  ...nodes[tIdx].data,
                  result: previewTxt,
                  fullBinary: outBits,
                },
              };
            }
          });
        }
      } else if (cipherType === "aes") {
        // AES encryption per byte
        const encrypted = encryptBitsWithAES(pVal, kVal);
        
        if (!encrypted) {
          previewTxt = `AES\nKey: ${kVal?.slice(0, 16) || "waiting..."}...\n❌ Encryption error`;
          n.data = { ...n.data, error: "AES encryption failed", preview: previewTxt };
        } else {
          // Show encrypted result in base64
          const plaintextDisplay = binaryToText(pVal) || "?";
          previewTxt = `AES\nPlain: "${plaintextDisplay}"\nEnc: ${encrypted}\nKey: ${kVal?.slice(0, 16) || "?"}...`;
          
          n.data = {
            ...n.data,
            error: undefined,
            preview: previewTxt,
            encryptedDisplay: encrypted,
            fullBinary: encrypted,
            lastPlaintext: pVal,
            lastKey: kVal,
            lastCipherType: cipherType,
          };

          valueMap.set(n.id, { type: "bits", value: encrypted });

          const outgoingEdges = edges.filter(
            (e) =>
              e.source === n.id &&
              e.sourceHandle === "out" &&
              e.targetHandle === "in"
          );

          outgoingEdges.forEach((e) => {
            const tIdx = nodes.findIndex((nd) => nd.id === e.target);
            if (tIdx !== -1) {
              nodes[tIdx] = {
                ...nodes[tIdx],
                data: {
                  ...nodes[tIdx].data,
                  result: previewTxt,
                  fullBinary: encrypted,
                },
              };
            }
          });
        }
      } else if (cipherType === "des") {
        // DES encryption per byte
        const encrypted = encryptBitsWithDES(pVal, kVal);
        
        if (!encrypted || kVal.length !== 8) {
          const keyStatus = kVal && kVal.length !== 8 ? `❌ Key must be 8 chars (${kVal.length} given)` : "❌ Encryption error";
          previewTxt = `DES\nKey: ${kVal?.slice(0, 8) || "waiting..."}...\n${keyStatus}`;
          n.data = { ...n.data, error: keyStatus, preview: previewTxt };
        } else {
          // Show encrypted result in base64
          const plaintextDisplay = binaryToText(pVal) || "?";
          previewTxt = `DES\nPlain: "${plaintextDisplay}"\nEnc: ${encrypted}\nKey: ${kVal?.slice(0, 8) || "?"}...`;
          
          n.data = {
            ...n.data,
            error: undefined,
            preview: previewTxt,
            encryptedDisplay: encrypted,
            fullBinary: encrypted,
            lastPlaintext: pVal,
            lastKey: kVal,
            lastCipherType: cipherType,
          };

          valueMap.set(n.id, { type: "bits", value: encrypted });

          const outgoingEdges = edges.filter(
            (e) =>
              e.source === n.id &&
              e.sourceHandle === "out" &&
              e.targetHandle === "in"
          );

          outgoingEdges.forEach((e) => {
            const tIdx = nodes.findIndex((nd) => nd.id === e.target);
            if (tIdx !== -1) {
              nodes[tIdx] = {
                ...nodes[tIdx],
                data: {
                  ...nodes[tIdx].data,
                  result: previewTxt,
                  fullBinary: encrypted,
                },
              };
            }
          });
        }
      }
    }
  });

  // --- Decrypt nodes ---
  nodes.forEach((n) => {
    if (n.type === "decrypt") {
      console.log("🔓 Decrypt node processing:", n.id);

      const inc = incoming(n.id);
      const encEdge = inc.find((e) => e.targetHandle === "encrypted");
      const kEdge = inc.find((e) => e.targetHandle === "key");

      const encVal = encEdge ? valueMap.get(encEdge.source)?.value : null;
      const keyMapEntry = kEdge ? valueMap.get(kEdge.source) : null;
      const cipherType = n.data?.cipherType || "aes";

      let kVal = null;
      if (keyMapEntry) {
        if (cipherType === "aes") {
          kVal = keyMapEntry.keyText || keyMapEntry.value;
        } else if (cipherType === "des") {
          kVal = keyMapEntry.keyText || keyMapEntry.value;
        }
      }

      if (!encVal || !kVal) {
        console.log("  ❌ Missing encrypted data or key");
        n.data = {
          ...n.data,
          error: "Missing encrypted data or key",
          preview: "Waiting for encrypted input and key...",
          fullBinary: undefined,
        };
        return;
      }

      let decrypted = null;
      let previewTxt = "";

      if (cipherType === "aes") {
        decrypted = decryptBitsWithAES(encVal, kVal);

        if (!decrypted) {
          previewTxt = `AES Decrypt\n❌ Decryption failed\nKey: ${kVal?.slice(0, 16) || "?"}...`;
          n.data = { ...n.data, error: "AES decryption failed", preview: previewTxt };
        } else {
          const decryptedText = binaryToText(decrypted) || "?";
          previewTxt = `AES Decrypt\nDecrypted: "${decryptedText}"\nBits: ${decrypted.slice(0, 32)}...\nKey: ${kVal?.slice(0, 16) || "?"}...`;

          n.data = {
            ...n.data,
            error: undefined,
            preview: previewTxt,
            fullBinary: decrypted,
          };

          valueMap.set(n.id, { type: "bits", value: decrypted });

          const outgoingEdges = edges.filter(
            (e) =>
              e.source === n.id &&
              e.sourceHandle === "out" &&
              e.targetHandle === "in"
          );

          outgoingEdges.forEach((e) => {
            const tIdx = nodes.findIndex((nd) => nd.id === e.target);
            if (tIdx !== -1) {
              nodes[tIdx] = {
                ...nodes[tIdx],
                data: {
                  ...nodes[tIdx].data,
                  result: previewTxt,
                  fullBinary: decrypted,
                },
              };
            }
          });
        }
      } else if (cipherType === "des") {
        if (kVal.length !== 8) {
          previewTxt = `DES Decrypt\n❌ Key must be 8 chars (${kVal.length} given)`;
          n.data = { ...n.data, error: "Invalid DES key length", preview: previewTxt };
        } else {
          decrypted = decryptBitsWithDES(encVal, kVal);

          if (!decrypted) {
            previewTxt = `DES Decrypt\n❌ Decryption failed\nKey: ${kVal?.slice(0, 8) || "?"}...`;
            n.data = { ...n.data, error: "DES decryption failed", preview: previewTxt };
          } else {
            const decryptedText = binaryToText(decrypted) || "?";
            previewTxt = `DES Decrypt\nDecrypted: "${decryptedText}"\nBits: ${decrypted.slice(0, 32)}...\nKey: ${kVal?.slice(0, 8) || "?"}...`;

            n.data = {
              ...n.data,
              error: undefined,
              preview: previewTxt,
              fullBinary: decrypted,
            };

            valueMap.set(n.id, { type: "bits", value: decrypted });

            const outgoingEdges = edges.filter(
              (e) =>
                e.source === n.id &&
                e.sourceHandle === "out" &&
                e.targetHandle === "in"
            );

            outgoingEdges.forEach((e) => {
              const tIdx = nodes.findIndex((nd) => nd.id === e.target);
              if (tIdx !== -1) {
                nodes[tIdx] = {
                  ...nodes[tIdx],
                  data: {
                    ...nodes[tIdx].data,
                    result: previewTxt,
                    fullBinary: decrypted,
                  },
                };
              }
            });
          }
        }
      }
    }
  });

  // --- Ciphertext nodes ---
  nodes.forEach((n) => {
    if (n.type === "ciphertext") {
      if (!n.data) n.data = {};

      const inc = incoming(n.id);

      // Find connected blockcipher node (if any)
      const connectedBlockEdge = inc.find((e) => {
        const src = nodes.find((b) => b.id === e.source);
        return (
          src?.type === "blockcipher" &&
          (!e.targetHandle || e.targetHandle === "in")
        );
      });

      // CTR: allow XOR -> Ciphertext
      const connectedXorEdge = mode === "ctr"
        ? inc.find((e) => {
            const src = nodes.find((b) => b.id === e.source);
            return src?.type === "xor" && (!e.targetHandle || e.targetHandle === "in");
          })
        : null;

      const block = connectedBlockEdge
        ? nodes.find((b) => b.id === connectedBlockEdge.source)
        : null;

      const xorNode = connectedXorEdge
        ? nodes.find((b) => b.id === connectedXorEdge.source)
        : null;

      if (mode === "ctr" && xorNode?.data?.xorOutput) {
        n.data = {
          ...n.data,
          result: xorNode.data.xorOutput,
          fullBinary: xorNode.data.xorOutput,
        };
        valueMap.set(n.id, { type: "bits", value: xorNode.data.xorOutput });
      } else if (!block || !block.data) {
        n.data = { ...n.data, result: "", fullBinary: undefined };
      } else {
        // IMAGE CHECK – look for both preview and result
        const possibleImage =
          block.data.preview || block.data.result || n.data.result;
        const isImage =
          typeof possibleImage === "string" &&
          (possibleImage.startsWith("data:image") ||
            possibleImage.startsWith("blob:"));

        if (isImage) {
          n.data = { ...n.data, result: possibleImage };
          valueMap.set(n.id, { type: "image", value: possibleImage });
        } else if (block.data.fullBinary) {
          n.data = {
            ...n.data,
            result: block.data.preview,
            fullBinary: block.data.fullBinary,
            decryptedContent: block.data.decryptedContent,
            cipherType: block.data.cipherType,
          };
          valueMap.set(n.id, {
            type: "bits",
            value: block.data.fullBinary,
          });
        } else {
          n.data = { ...n.data, result: "", fullBinary: undefined };
        }
      }
    }
  });
  function bitsWithAscii(bits) {
    const lines = [];
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8);
      if (byte.length < 8) continue;

      const charCode = parseInt(byte, 2);
      const char =
        charCode >= 32 && charCode <= 126
          ? String.fromCharCode(charCode)
          : "."; // printable değilse nokta

      lines.push(`${byte}  ${char}`);
    }
    return lines.join("\n");
  }


  // 🔄 Return every node with new data reference (forces React Flow update)
  const result = nodes.map((n) => ({ ...n, data: { ...n.data } }));

  // 🧩 Return old reference if nothing changed → avoids re-render
  if (JSON.stringify(result) === original) {
    return nodes;
  }

  return result;
}
