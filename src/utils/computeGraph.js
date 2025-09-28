import { xorBits } from "./bitwise"; // varsa korunur, yoksa ignore

function textToBinary(str) {
  return Array.from(str)
    .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("");
}

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

  // Plaintext & Key
  nodes.forEach((n) => {
    if (n.type === "plaintext") {
      let normVal = null;
      if (n.data.inputType === "bits") {
        normVal = n.data.value || "";
      } else if (n.data.inputType === "text") {
        normVal = textToBinary(n.data.value || "");
      } else if (n.data.inputType === "image") {
        normVal = n.data.value; // File object or empty string
      }
      valueMap.set(n.id, { type: n.data.inputType, value: normVal });
    }

    if (n.type === "key") {
      valueMap.set(n.id, { type: "bits", value: n.data.bits || "" });
    }
  });

  // BlockCipher
  nodes.forEach((n) => {
    if (n.type === "blockcipher") {
      const inc = incoming(n.id);
      const pEdge = inc.find((e) => e.targetHandle === "plaintext");
      const kEdge = inc.find((e) => e.targetHandle === "key");

      const pVal = pEdge ? valueMap.get(pEdge.source)?.value : undefined;
      const pType = pEdge ? valueMap.get(pEdge.source)?.type : undefined;
      const kVal = kEdge ? valueMap.get(kEdge.source)?.value : undefined;

      if (!pVal || !kVal) {
        n.data = { ...n.data, preview: "Missing input" };
      } else if (pType === "bits" || pType === "text") {
        const res = xorBits ? xorBits(pVal, kVal) : { value: pVal };
        if (res.error) {
          n.data = { ...n.data, error: res.error, preview: undefined };
        } else {
          let outVal = res.value;
          let previewTxt = outVal;
          if (pType === "text") {
            previewTxt = `${binaryToText(res.value)} (bin=${res.value})`;
          }
          n.data = { ...n.data, error: undefined, preview: `out=${previewTxt}` };
          valueMap.set(n.id, { type: pType, value: outVal });
        }
      } else if (pType === "image") {
        // kritik: plaintext File ve keyBits'i blockcipher.data'ya taşır
        n.data = {
          ...n.data,
          preview: "Ready for Run XOR",
          plaintextFile: pVal, // File object
          keyBits: kVal,
        };
        // Ayrıca valueMap'e de yazalım (gerektiğinde kullanılabilir)
        valueMap.set(n.id, { type: "image", value: pVal, keyBits: kVal });
      }
    }
  });

  // Ciphertext: sadece default mesaj eğer yoksa
  nodes.forEach((n) => {
    if (n.type === "ciphertext") {
      if (!n.data) n.data = {};
      if (!n.data.result || n.data.result.startsWith("Image selected")) {
        n.data = { ...n.data, result: "Image selected (waiting for Run XOR)" };
      }
    }
  });


  return nodes;
}
