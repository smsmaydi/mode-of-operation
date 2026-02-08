import { xorBits } from "./bitwise";

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
        normVal = n.data.value || null; // Encrypted File object
        console.log("🔒 Plaintext: Encrypted file detected, value:", normVal?.name || "no file");
      }

      if (!normVal) normVal = null;
      // Here we store both type and value for later use
      valueMap.set(n.id, { type: n.data.inputType, value: normVal });
      console.log("✅ Plaintext valueMap set:", {
        id: n.id,
        type: n.data.inputType,
        hasValue: !!normVal,
      });
    }

    if (n.type === "key") {
      const normVal =
        n.data.bits && n.data.bits.trim() !== "" ? n.data.bits : null;
      // Here we store the value of key as bits
      valueMap.set(n.id, { type: "bits", value: normVal });
      console.log("✅ Key valueMap set:", {
        id: n.id,
        bits: normVal?.slice(0, 16) + "...",
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
      const kVal = kEdge ? valueMap.get(kEdge.source)?.value : null;
      const prevVal = prevEdge ? valueMap.get(prevEdge.source)?.value : null;

      console.log("  🔍 Values from valueMap:", {
        pType,
        pValExists: !!pVal,
        kValExists: !!kVal,
        prevValExists: !!prevVal,
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
      if (pType === "image" || pType === "encrypted") {
        console.log("  🖼️ IMAGE MODE DETECTED!");
        console.log("    pVal type:", typeof pVal);
        console.log("    pVal is File?", pVal instanceof File);
        console.log("    pVal filename:", pVal?.name);
        
        if (pType === "encrypted" && pVal !== n.data.encryptedFile) {
          console.log("    ✅ Setting encryptedFile and keyBits");
          n.data = {
            ...n.data,
            preview: "Ready for Run (Decrypt)",
            encryptedFile: pVal,
            plaintextFile: undefined,
            keyBits: kVal,
            inputType: "encrypted",
          };
        } else if (pType === "image" && pVal !== n.data.plaintextFile) {
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


      // TEXT / BITS CASE: Calculate XOR with ECB/CBC logic
      let computed;
      
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
        // const binaryMultiLine = chunks.join("\n");
        const ascii = binaryToText(outBits);
        const binaryMultiLine = chunks
          .map((byte, i) => {
            // ascii'nin i. karakteri (yoksa boş)
            const ch = ascii[i] ?? "";

            // görünmeyen karakterleri noktaya çevir (istersen kaldırabilirsin)
            const printable =
              ch && ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126 ? ch : ".";

            return `${byte}  ${printable}`;
          })
          .join("\n");

        /* Output Text in Ciphernode*/ 
        const previewTxt = `out: ${ascii}\nbin:\n${binaryMultiLine}`;

        // Update node data
        n.data = {
          ...n.data,
          error: undefined,
          preview: previewTxt,
          fullBinary: outBits,
        };

        // Save output value as bits
        valueMap.set(n.id, { type: "bits", value: outBits });

        // Create variable for connected outgoing blockcipher nodes
        const outgoingEdges = edges.filter(
          (e) =>
            e.source === n.id &&
            e.sourceHandle === "out" &&
            e.targetHandle === "in"
        );

        // Update connected ciphertext nodes directly
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
