import { xorBits } from "./bitwise";

// String → Binary (8 bit ASCII)
function textToBinary(str) {
  return Array.from(str)
    .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("");
}

// Binary → String (8’er bitlik parçalardan)
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

export function computeGraphValues(nodes, edges) {
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
      }

      if (!normVal) normVal = null;
      valueMap.set(n.id, { type: n.data.inputType, value: normVal });
    }

    if (n.type === "key") {
      const normVal =
        n.data.bits && n.data.bits.trim() !== "" ? n.data.bits : null;
      valueMap.set(n.id, { type: "bits", value: normVal });
    }
  });

  // --- BlockCipher nodes ---
  nodes.forEach((n) => {
    if (n.type === "blockcipher") {
      const inc = incoming(n.id);
      const pEdge = inc.find((e) => e.targetHandle === "plaintext");
      const kEdge = inc.find((e) => e.targetHandle === "key");
      const prevEdge = inc.find((e) => e.targetHandle === "prevCipher");

      const pVal = pEdge ? valueMap.get(pEdge.source)?.value : null;
      const pType = pEdge ? valueMap.get(pEdge.source)?.type : null;
      const kVal = kEdge ? valueMap.get(kEdge.source)?.value : null;
      const prevVal = prevEdge ? valueMap.get(prevEdge.source)?.value : null;

      // Eksik veri varsa sıfırla
      if (!pVal || !kVal) {
        n.data = {
          ...n.data,
          error: undefined,
          preview: "",
          fullBinary: undefined,
        };
        return;
      }

      // 🟢 IMAGE DURUMU: sadece veriyi sakla, XOR App.js’te yapılır
      if (pType === "image") {
        n.data = {
          ...n.data,
          preview: "Ready for Run XOR",
          plaintextFile: pVal, // File object
          keyBits: kVal,
        };
        valueMap.set(n.id, {
          type: "image",
          value: pVal,
          keyBits: kVal,
        });
        return;
      }

      // 🔵 TEXT / BITS DURUMU: XOR hesapla
      let computed;
      if (prevVal) {
        const t = xorBits(pVal, prevVal);
        computed = xorBits(t, kVal);
      } else {
        computed = xorBits ? xorBits(pVal, kVal) : { value: pVal };
      }

      if (computed.error) {
        n.data = { ...n.data, error: computed.error, preview: undefined };
      } else {
        const outBits = computed.value;
        const chunks = outBits.match(/.{1,8}/g) || [];
        const binaryMultiLine = chunks.join("\n");
        const ascii = binaryToText(outBits);
        const previewTxt = `out: ${ascii}\nbin:\n${binaryMultiLine}`;

        // BlockCipher node verisini güncelle
        n.data = {
          ...n.data,
          error: undefined,
          preview: previewTxt,
          fullBinary: outBits,
        };

        // Çıktı bits’i kaydet (CBC için)
        valueMap.set(n.id, { type: "bits", value: outBits });

        // Bağlı Ciphertext node'larını güncelle
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
    }
  });

  // --- Ciphertext nodes ---
  nodes.forEach((n) => {
    if (n.type === "ciphertext") {
      if (!n.data) n.data = {};

      const inc = incoming(n.id);
      const connectedBlockEdge = inc.find((e) => {
        const src = nodes.find((b) => b.id === e.source);
        // e.targetHandle boş (null) olsa bile kabul et
        return src?.type === "blockcipher" && (!e.targetHandle || e.targetHandle === "in");
      });


      const block = connectedBlockEdge
        ? nodes.find((b) => b.id === connectedBlockEdge.source)
        : null;

      if (!block || !block.data) {
        n.data = { ...n.data, result: "", fullBinary: undefined };
      } else {
        // 📸 IMAGE kontrolü
        const isImage =
          typeof block.data.preview === "string" &&
          (block.data.preview.startsWith("data:image") ||
            block.data.preview.startsWith("blob:"));

        if (isImage) {
          n.data = { ...n.data, result: block.data.preview };
          valueMap.set(n.id, { type: "image", value: block.data.preview });
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

  return nodes;
}
