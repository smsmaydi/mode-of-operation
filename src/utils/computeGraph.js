import { xorBits } from "./bitwise";
import CryptoJS from "crypto-js";

// Binary string to Hex helper
function bitsToHex(bits) {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = bits.substr(i, 4);
    hex += parseInt(nibble, 2).toString(16);
  }
  return hex;
}

function hexToBits(hex) {
  let bits = "";
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substr(i, 2), 16).toString(2).padStart(8, "0");
    bits += byte;
  }
  return bits;
}

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
    
    // Normalize key: strip spaces so "f4 41 b5 64" is treated as hex
    const keyNormalized = String(keyPassphrase).replace(/\s/g, "").trim();
    
    // Check if key is in HEX format (only 0-9, a-f, A-F characters and even length)
    const isHexKey = /^[0-9a-fA-F]+$/.test(keyNormalized) && keyNormalized.length % 2 === 0;
    const isBinaryKey = /^[01]+$/.test(keyNormalized) && keyNormalized.length % 8 === 0;
    
    // Convert binary key to hex if needed
    let keyForAes = keyNormalized;
    if (isBinaryKey) {
      keyForAes = bitsToHex(keyNormalized);
    }
    
    // Parse key accordingly (hex key must be 16 or 32 bytes for AES-128/256)
    const key = isHexKey || isBinaryKey
      ? CryptoJS.enc.Hex.parse(keyForAes)
      : CryptoJS.enc.Utf8.parse(keyForAes);
    
    // Encrypt with CryptoJS AES in ECB mode (deterministic - same input = same output)
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Return as hex string (like the site example)
    const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
    
    return encryptedHex;
  } catch (e) {
    console.error("AES encryption error:", e);
    return null;
  }
}

// Decrypt AES encrypted data with passphrase
function decryptBitsWithAES(encryptedData, keyPassphrase) {
  try {
    if (!encryptedData || !keyPassphrase) return null;
    
    console.log("🔓 AES-ECB Decryption:");
    console.log("  Encrypted:", encryptedData.slice(0, 50) + "...");
    console.log("  Key:", keyPassphrase);
    
    // Check if key is in HEX format
    const isHexKey = /^[0-9a-fA-F]+$/.test(keyPassphrase) && keyPassphrase.length % 2 === 0;
    const isBinaryKey = /^[01]+$/.test(keyPassphrase) && keyPassphrase.length % 8 === 0;
    
    // Convert binary key to hex if needed
    let keyForAes = keyPassphrase;
    if (isBinaryKey) {
      keyForAes = bitsToHex(keyPassphrase);
      console.log("  Key converted from binary to HEX:", keyForAes);
    }
    
    // Parse key accordingly
    const key = isHexKey || isBinaryKey
      ? CryptoJS.enc.Hex.parse(keyForAes)
      : CryptoJS.enc.Utf8.parse(keyForAes);
    
    console.log("  Key format:", isBinaryKey ? "BINARY→HEX" : isHexKey ? "HEX" : "UTF-8");
    
    // Check if encrypted data is in HEX format (no Base64 characters like +, /, =)
    const isHexEncrypted = /^[0-9a-fA-F]+$/.test(encryptedData);
    
    // Create ciphertext object from hex or base64
    const cipherParams = isHexEncrypted
      ? CryptoJS.lib.CipherParams.create({
          ciphertext: CryptoJS.enc.Hex.parse(encryptedData)
        })
      : encryptedData; // CryptoJS can handle base64 string directly
    
    // Decrypt with CryptoJS AES in ECB mode
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });
    const plaintextStr = decrypted.toString(CryptoJS.enc.Utf8);
    
    console.log("  Decrypted plaintext:", plaintextStr);
    
    if (!plaintextStr) return null;
    
    // Convert back to bits
    return textToBinary(plaintextStr);
  } catch (e) {
    console.error("AES decryption error:", e);
    return null;
  }
}

export function computeGraphValues(nodes, edges, mode = 'ecb') {
  // Prevent unnecessary processing
  if (!nodes || !edges) return nodes;

  console.log('🔄 computeGraphValues called with mode:', mode, 'nodes:', nodes.length);

  const valueMap = new Map();
  const incoming = (id) => edges.filter((e) => e.target === id);

  console.log('📊 computeGraph: Processing', nodes.length, 'nodes');
  nodes.forEach((n) => console.log('  - Node:', n.id, 'type:', n.type));

  // --- Plaintext & Key nodes ---
  nodes.forEach((n) => {
    if (n.type === "plaintext") {
      let normVal = null;

      if (n.data.inputType === "bits") {
        normVal =
          n.data.value && n.data.value.trim() !== "" ? n.data.value : null;
      } else if (n.data.inputType === "text") {
        const textVal = n.data.value && n.data.value.trim() !== ""
            ? textToBinary(n.data.value)
            : null;
        normVal = textVal;
      } else if (n.data.inputType === "image") {
        normVal = n.data.value || null; // File object
      } else if (n.data.inputType === "encrypted") {
        normVal = n.data.value || null; // Encrypted text string
      } else if (n.data.inputType === "encryptedFile") {
        normVal = n.data.value || null; // Encrypted File object
      }

      if (!normVal) normVal = null;
      // Here we store both type and value for later use
      // Also store isDecryptMode flag and fileTimestamp for routing later
      valueMap.set(n.id, { 
        type: n.data.inputType, 
        value: normVal, 
        isDecryptMode: n.data.isDecryptMode,
        decryptKey: n.data.decryptKey,
        fileTimestamp: n.data.fileTimestamp, // Track file changes
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
  // In CTR mode, skip XOR processing here (will be done after BlockCipher)
  if (mode !== "ctr") {
    nodes.forEach((n) => {
      if (n.type === "xor") {
      console.log("🔧 XOR node processing:", n.id);
      
      const inc = incoming(n.id);
      const ptEdge = inc.find((e) => e.targetHandle === "pt" || e.targetHandle === "ptLeft");  // plaintext
      const pcEdge = inc.find((e) => e.targetHandle === "pc" || e.targetHandle === "pcTop");  // prevCipher/IV
      
      const ptData = ptEdge ? valueMap.get(ptEdge.source) : null;
      const ptVal = ptData?.value;
      const ptType = ptData?.type;
      const pcVal = pcEdge ? valueMap.get(pcEdge.source)?.value : null;
      const ptIsDecryptMode = ptData?.isDecryptMode;
      const ptDecryptKey = ptData?.decryptKey;
      
      // If plaintext is encrypted file (decrypt mode), skip XOR computation here
      if ((ptType === "encrypted" || ptType === "encryptedFile") && ptIsDecryptMode) {
        console.log("  📁 Encrypted file/content detected (decrypt mode) - skipping XOR node computation");
        n.data = { 
          ...n.data, 
          preview: "Decrypt mode - use BlockCipher",
          isDecryptMode: ptIsDecryptMode,
        };
        valueMap.set(n.id, { 
          type: ptType, 
          value: ptVal,
          isDecryptMode: ptIsDecryptMode,
          decryptKey: ptDecryptKey,
        });
        return;
      }

      // If plaintext is an image (encrypt mode), store for later image XOR processing
      if (ptType === "image" && !ptIsDecryptMode) {
        console.log("  🖼️ Image encrypt mode - storing image and keystream for XOR processing");
        n.data = { 
          ...n.data, 
          preview: pcVal ? "Ready for image XOR" : "Waiting for keystream...",
          plaintextFile: ptVal,
          keystreamBits: pcVal || null,
          imageMode: true,
        };
        valueMap.set(n.id, { 
          type: "image",
          value: ptVal,
          keystreamBits: pcVal,
        });
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
        // Show partial inputs even if not both available
        const preview = ptVal 
          ? `PT: ${ptVal.slice(0, 16)}...${pcVal ? ' + ' + pcVal.slice(0, 16) + '...' : ' (waiting for keystream)'}`
          : (pcVal ? `PC: ${pcVal.slice(0, 16)}...(waiting for plaintext)` : "Waiting for inputs...");
        n.data = { 
          ...n.data, 
          preview, 
          ptInput: ptVal || null, 
          pcInput: pcVal || null, 
          xorOutput: null 
        };
        console.log("  ⏳ XOR node waiting for inputs:", { ptVal: !!ptVal, pcVal: !!pcVal });
      }
    }
    });
  }

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
      const inc = incoming(n.id);
      const pEdge = mode === "ctr"
        ? inc.find((e) => e.targetHandle === "ctr")
        : inc.find((e) => e.targetHandle === "plaintext" || e.targetHandle === "xor");
      const kEdge = inc.find((e) => e.targetHandle === "key");
      const prevEdge = inc.find((e) => e.targetHandle === "prevCipher");

      const pVal = pEdge ? valueMap.get(pEdge.source)?.value : null;
      const pType = pEdge ? valueMap.get(pEdge.source)?.type : null;
      const pIsDecryptMode = pEdge ? valueMap.get(pEdge.source)?.isDecryptMode : false;
      const pDecryptKey = pEdge ? valueMap.get(pEdge.source)?.decryptKey : null;
      const keyMapEntry = kEdge ? valueMap.get(kEdge.source) : null;
      
      // In decrypt mode, use cipher type from BlockCipherNode, otherwise also from BlockCipherNode
      const cipherType = n.data?.cipherType || "xor";
      
      // Choose key based on cipher type
      let kVal = null;
      let kValBitsForCtr = null;
      if (pIsDecryptMode && pDecryptKey) {
        // Decrypt mode: use key from PlaintextNode
        kVal = pDecryptKey;
      } else if (keyMapEntry) {
        // Encrypt mode: use key from Key node
        if (cipherType === "aes") {
          // AES: use keyText (passphrase), not bits
          kVal = keyMapEntry.keyText || keyMapEntry.bits || keyMapEntry.value;
        } else {
          // XOR: use bits
          kVal = keyMapEntry.bits || keyMapEntry.value;
        }

        if (mode === "ctr") {
          const rawKey = keyMapEntry.bits || keyMapEntry.keyText || keyMapEntry.value;
          if (rawKey) {
            if (/^[01]+$/.test(rawKey)) {
              kValBitsForCtr = rawKey;
            } else if (/^[0-9a-fA-F]+$/.test(rawKey) && rawKey.length % 2 === 0) {
              kValBitsForCtr = hexToBits(rawKey);
            } else {
              kValBitsForCtr = textToBinary(rawKey);
            }
          }
        }
      }
      
      const prevVal = prevEdge ? valueMap.get(prevEdge.source)?.value : null;

      // If any of the required inputs is missing, clear output and return
      if (!pVal || !kVal) {
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

        if (!kValBitsForCtr) {
          n.data = { ...n.data, error: "Missing/invalid CTR key", preview: undefined };
          return;
        }

        let keystreamBits = null;
        if (cipherType === "aes") {
          const encryptedHex = encryptBitsWithAES(nonceCounter, kVal);
          if (!encryptedHex) {
            n.data = { ...n.data, error: "AES-CTR keystream failed", preview: undefined };
            return;
          }
          keystreamBits = hexToBits(encryptedHex);
        } else {
          // XOR CTR (legacy)
          let keyRepeated = kValBitsForCtr;
          if (nonceCounter.length > kValBitsForCtr.length) {
            keyRepeated = kValBitsForCtr.repeat(Math.ceil(nonceCounter.length / kValBitsForCtr.length))
                              .slice(0, nonceCounter.length);
          }
          const computedCtr = xorBits(nonceCounter, keyRepeated);
          if (computedCtr.error) {
            n.data = { ...n.data, error: computedCtr.error, preview: undefined };
            return;
          }
          keystreamBits = computedCtr.value;
        }

        if (!keystreamBits) {
          n.data = { ...n.data, error: "CTR keystream missing", preview: undefined };
          return;
        }

        n.data = {
          ...n.data,
          error: undefined,
          preview: `${cipherType.toUpperCase()}-CTR keystream: ${keystreamBits.slice(0, 32)}...`,
          fullBinary: keystreamBits,
        };
        valueMap.set(n.id, { type: "bits", value: keystreamBits });
        return;
      }

      // Take image file and prepare for XOR
      if (pType === "image") {
        console.log("  🖼️ IMAGE MODE DETECTED!");
        console.log("    pVal type:", typeof pVal);
        console.log("    pVal is File?", pVal instanceof File);
        console.log("    pVal filename:", pVal?.name);
        const existingPreview = n.data?.preview;
        const hasImagePreview =
          typeof existingPreview === "string" &&
          (existingPreview.startsWith("data:image") || existingPreview.startsWith("blob:"));
        
        // Get fileTimestamp from plaintext node
        const pTimestamp = pEdge ? valueMap.get(pEdge.source)?.fileTimestamp : null;
        
        // Update if file changed (different reference or timestamp) or key changed
        if (pVal !== n.data.plaintextFile || 
            kVal !== n.data.lastKey ||
            pTimestamp !== n.data.lastFileTimestamp) {
          console.log("    ✅ Setting plaintextFile and keyBits (file/key changed)");
          n.data = {
            ...n.data,
            preview: hasImagePreview ? existingPreview : "Ready for Run XOR",
            plaintextFile: pVal,
            encryptedFile: undefined,
            keyBits: kVal,
            inputType: "image",
            lastKey: kVal,
            lastFileTimestamp: pTimestamp,
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
        const existingPreview = n.data?.preview;
        const hasImagePreview =
          typeof existingPreview === "string" &&
          (existingPreview.startsWith("data:image") || existingPreview.startsWith("blob:"));
        
        // Get fileTimestamp from plaintext node
        const pTimestamp = pEdge ? valueMap.get(pEdge.source)?.fileTimestamp : null;
        
        // Update if file changed (different timestamp) or key changed
        if (pVal !== n.data.encryptedImageFile || 
            kVal !== n.data.lastKey || 
            pTimestamp !== n.data.lastFileTimestamp) {
          console.log("    ✅ Setting encryptedImageFile for decryption");
          n.data = {
            ...n.data,
            preview: hasImagePreview ? existingPreview : "Ready to decrypt image",
            encryptedImageFile: pVal,
            plaintextFile: undefined,
            keyBits: kVal,
            inputType: "encryptedImage",
            isDecryptMode: true,
            lastKey: kVal,
            lastFileTimestamp: pTimestamp,
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
        } else {
          console.log("    ⚠️ Decrypt mode works with AES only, not XOR");
          n.data = {
            ...n.data,
            error: "Decrypt mode requires AES",
            preview: "Use AES for decrypt",
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
      
      console.log("  🔍 Cache check:", {
        lastPlaintext: n.data?.lastPlaintext?.slice(0, 16) + "...",
        currentPlaintext: pVal?.slice(0, 16) + "...",
        lastKey: n.data?.lastKey?.slice(0, 16) + "...",
        currentKey: kVal?.slice(0, 16) + "...",
        lastCipherType: n.data?.lastCipherType,
        currentCipherType: cipherType,
        inputsUnchanged,
      });
      
      if (inputsUnchanged) {
        console.log("  ℹ️ Inputs unchanged, preserving encrypted result");
        return;
      }
      
      if (cipherType === "xor") {
        // XOR encryption
        // ALGORITHM NOTES:
        // Current Implementation: Simple 1:1 XOR between plaintext and key
        //   - Plaintext: N bits
        //   - Key: 128/256 bits
        //   - Result: N bits (only first N bits of key are used)
        //   - Educational purpose: Easy to understand, visualize bit-by-bit operations
        //
        // Real-world AES/DES Implementation (via CryptoJS):
        //   - These use the ENTIRE key in their key schedule
        //   - Plaintext is automatically padded to block size (128 bits for AES)
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
            console.log("  ✅ Ciphertext UPDATE: found at index", tIdx, "target id:", e.target, "updating with result:", previewTxt?.slice(0, 30));
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
        console.log("🔐 AES case executing with pVal:", pVal?.slice(0, 20), "kVal:", kVal?.slice(0, 16));
        const encrypted = encryptBitsWithAES(pVal, kVal);
        
        console.log("🔐 Encrypted result:", encrypted ? encrypted.slice(0, 30) : "NULL");
        
        if (!encrypted) {
          previewTxt = `AES\nKey: ${kVal?.slice(0, 16) || "waiting..."}...\n❌ Encryption error`;
          n.data = { ...n.data, error: "AES encryption failed", preview: previewTxt };
        } else {
          // Show encrypted result in hex
          const plaintextDisplay = binaryToText(pVal) || "?";
          previewTxt = `AES\nPlain: "${plaintextDisplay}"\nEnc: ${encrypted}`;
          
          n.data = {
            ...n.data,
            error: undefined,
            preview: previewTxt,
            encryptedDisplay: encrypted,
            fullBinary: encrypted,
            cipherType,
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

          console.log("🔗 AES: BlockCipher (id:", n.id, ") outgoing edges:", outgoingEdges.length);
          if (outgoingEdges.length === 0) {
            console.log("⚠️ AES: NO EDGES FOUND!");
          }

          outgoingEdges.forEach((e) => {
            const tIdx = nodes.findIndex((nd) => nd.id === e.target);
            console.log("✅ AES: Found node:", e.target, "at index:", tIdx, "will update with:", previewTxt?.slice(0, 30));
            if (tIdx !== -1) {
              console.log("✅ AES: UPDATING Ciphertext", nodes[tIdx].id);
              nodes[tIdx] = {
                ...nodes[tIdx],
                data: {
                  ...nodes[tIdx].data,
                  result: previewTxt,
                  fullBinary: encrypted,
                },
              };
            } else {
              console.log("❌ AES: Target node not found!");
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

      const kVal = keyMapEntry
        ? (keyMapEntry.keyText || keyMapEntry.bits || keyMapEntry.value)
        : null;

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
      }
    }
  });

  // --- XOR nodes for CTR mode (after BlockCipher) ---
  if (mode === "ctr") {
    nodes.forEach((n) => {
      if (n.type === "xor") {
        console.log("🔧 XOR node processing (CTR mode - after BlockCipher):", n.id);
        
        const inc = incoming(n.id);
        const ptEdge = inc.find((e) => e.targetHandle === "pt" || e.targetHandle === "ptLeft");  // plaintext
        const pcEdge = inc.find((e) => e.targetHandle === "pc" || e.targetHandle === "pcTop");  // prevCipher/keystream
        
        const ptData = ptEdge ? valueMap.get(ptEdge.source) : null;
        const ptVal = ptData?.value;
        const ptType = ptData?.type;
        const pcVal = pcEdge ? valueMap.get(pcEdge.source)?.value : null;
        const ptIsDecryptMode = ptData?.isDecryptMode;
        const ptDecryptKey = ptData?.decryptKey;
        
        // If plaintext is an image or encrypted file, skip XOR computation here
        if (ptType === "image" || ptType === "encrypted" || ptType === "encryptedFile") {
          console.log("  📁 Image/encrypted detected - skipping XOR node computation");
          n.data = { 
            ...n.data, 
            preview: "File mode - click Run on BlockCipher",
            isDecryptMode: ptIsDecryptMode,
          };
          valueMap.set(n.id, { 
            type: ptType, 
            value: ptVal,
            isDecryptMode: ptIsDecryptMode,
            decryptKey: ptDecryptKey,
          });
          return;
        }
        
        // For bits/text: compute XOR
        if (ptVal && pcVal) {
          const pcSource = pcEdge ? nodes.find((nd) => nd.id === pcEdge.source) : null;
          const ctrCipher = pcSource?.data?.cipherType || "xor";
          // XOR the two inputs
          const xorResult = xorBits(ptVal, pcVal);
          if (!xorResult.error) {
            const ctrHex = ctrCipher === "aes"
              ? bitsToHex(xorResult.value).toUpperCase()
              : null;
            valueMap.set(n.id, { type: "bits", value: xorResult.value });
            n.data = { 
              ...n.data, 
              preview: `${ctrCipher.toUpperCase()}-CTR: ${(ctrHex || xorResult.value).slice(0, 16)}...`,
              previewFull: `${ctrCipher.toUpperCase()}-CTR\n${ctrHex || xorResult.value}`,
              ptInput: ptVal,
              pcInput: pcVal,
              xorOutput: xorResult.value,
              xorOutputHex: ctrHex || undefined
            };
            console.log("  ✅ XOR computed:", xorResult.value.slice(0, 16));
          } else {
            n.data = { ...n.data, error: xorResult.error };
          }
        } else {
          // Show partial inputs even if not both available
          const preview = ptVal 
            ? `PT: ${ptVal.slice(0, 16)}...${pcVal ? ' + ' + pcVal.slice(0, 16) + '...' : ' (waiting for keystream)'}`
            : (pcVal ? `PC: ${pcVal.slice(0, 16)}...(waiting for plaintext)` : "Waiting for inputs...");
          n.data = { 
            ...n.data, 
            preview, 
            ptInput: ptVal || null, 
            pcInput: pcVal || null, 
            xorOutput: null 
          };
          console.log("  ⏳ XOR node waiting for inputs:", { ptVal: !!ptVal, pcVal: !!pcVal });
        }
      }
    });
  }

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
          result: xorNode.data.previewFull || xorNode.data.xorOutput,
          fullBinary: xorNode.data.xorOutputHex || xorNode.data.xorOutput,
        };
        valueMap.set(n.id, { type: "bits", value: xorNode.data.xorOutput });
      } else if (!block || !block.data) {
        n.data = { ...n.data, result: "", fullBinary: undefined };
      } else {
        // IMAGE CHECK – look for both preview and result
        const candidateImages = [
          n.data.result,
          block.data.preview,
          block.data.result,
        ];
        const possibleImage = candidateImages.find(
          (value) =>
            typeof value === "string" &&
            (value.startsWith("data:image") || value.startsWith("blob:"))
        );
        const isImage = !!possibleImage;

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
        } else if (block.data.preview) {
          n.data = {
            ...n.data,
            result: block.data.preview,
            fullBinary: block.data.fullBinary,
            decryptedContent: block.data.decryptedContent,
            cipherType: block.data.cipherType,
          };
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

  return result;
}
