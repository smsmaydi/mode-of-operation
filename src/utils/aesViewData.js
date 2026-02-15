/**
 * From graph (nodes, edges): find plaintext and key connected to the ciphertext node,
 * then produce 16-byte state and 16-byte round key for AddRoundKey/SubBytes.
 */

function textToBinary(str) {
  if (typeof str !== "string") return "";
  return Array.from(str)
    .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("");
}

/** First 128 bits of bit string → 16-byte array. Pads with zeros if shorter. */
function bitsTo16Bytes(bits) {
  const cleaned = String(bits || "").replace(/\s/g, "").replace(/[^01]/g, "");
  const padded = cleaned.slice(0, 128).padEnd(128, "0");
  const out = [];
  for (let i = 0; i < 16; i++) {
    const byte = padded.slice(i * 8, i * 8 + 8);
    out.push(byte ? parseInt(byte, 2) : 0);
  }
  return out;
}

/** String to UTF-8 bytes (same encoding CryptoJS uses). First 16 bytes = first AES block. Zero-padded if shorter. */
function stringToUtf8First16Bytes(str) {
  if (typeof str !== "string") return [];
  const encoded = new TextEncoder().encode(str);
  const out = Array.from(encoded.slice(0, 16));
  while (out.length < 16) out.push(0);
  return out.slice(0, 16);
}

/** First 16 bytes of plaintext as CryptoJS would use for CBC: UTF-8 + PKCS7 padding. Same as first block input before XOR with IV. */
function stringToUtf8Pkcs7FirstBlock(str) {
  if (typeof str !== "string") return [];
  const encoded = Array.from(new TextEncoder().encode(str));
  const padLen = encoded.length % 16 === 0 ? 16 : 16 - (encoded.length % 16);
  const padded = encoded.concat(Array(padLen).fill(padLen));
  return padded.slice(0, 16);
}

/** Build 16-byte state from plaintext node data (text or bits). Text uses UTF-8 so it matches CryptoJS. */
export function plaintextTo16Bytes(data) {
  if (!data) {
    console.log("[aesViewData] plaintextTo16Bytes: no data");
    return null;
  }
  const inputType = data.inputType || "text";
  const value = data.value ?? data.text ?? "";
  console.log("[aesViewData] plaintextTo16Bytes", { inputType, valueLen: String(value).length, valuePreview: String(value).slice(0, 20) });

  if (inputType === "text") {
    return stringToUtf8First16Bytes(value);
  }
  if (inputType === "bits") {
    return bitsTo16Bytes(value);
  }
  console.log("[aesViewData] plaintextTo16Bytes: unknown inputType", inputType);
  return null;
}

/** First 16 bytes from hex string (2 hex chars = 1 byte). */
function hexStringTo16Bytes(hexStr) {
  const cleaned = String(hexStr || "").replace(/\s/g, "").replace(/[^0-9a-fA-F]/g, "");
  const out = [];
  for (let i = 0; i < 32 && i + 2 <= cleaned.length; i += 2) {
    out.push(parseInt(cleaned.slice(i, i + 2), 16));
  }
  while (out.length < 16) out.push(0);
  return out.slice(0, 16);
}

/** Build 16-byte round key from key node data (keyText hex, bits, or passphrase). */
export function keyTo16Bytes(data) {
  if (!data) return null;

  const keyText = data.keyText;
  if (keyText != null && typeof keyText === "string") {
    const trimmed = keyText.trim();
    const hexOnly = trimmed.replace(/\s/g, "").replace(/[^0-9a-fA-F]/g, "");
    const isHex = hexOnly.length >= 2 && /^[0-9a-fA-F]+$/.test(hexOnly);
    if (isHex) {
      return hexStringTo16Bytes(trimmed);
    }
    if (trimmed.length > 0) {
      const bytes = [];
      for (let i = 0; i < 16; i++) {
        bytes.push(i < keyText.length ? keyText.charCodeAt(i) & 0xff : 0);
      }
      return bytes;
    }
  }

  const bits = data.bits;
  if (bits != null && String(bits).replace(/\s/g, "").length > 0) {
    return bitsTo16Bytes(bits);
  }

  return null;
}

/**
 * Find block connected to ciphertextId, then plaintext and key nodes connected to that block.
 * Returns { stateBytes, keyBytes } or null.
 * Fallback: if key from key node is missing, use block.data.keyBits / keyText (from computeGraph).
 */
export function getAesViewDataFromGraph(nodes, edges, ciphertextId) {
  console.log("[aesViewData] getAesViewDataFromGraph ENTER", { nodesCount: nodes?.length, edgesCount: edges?.length, ciphertextId });

  if (!nodes?.length || !edges?.length || !ciphertextId) {
    console.log("[aesViewData] EXIT null: missing nodes/edges/ciphertextId");
    return null;
  }

  const edgeToCipher = edges.find((e) => e.target === ciphertextId);
  console.log("[aesViewData] edgeToCipher", edgeToCipher ? { source: edgeToCipher.source, target: edgeToCipher.target } : null);
  if (!edgeToCipher) {
    console.log("[aesViewData] EXIT null: no edge to ciphertext");
    return null;
  }
  const blockId = edgeToCipher.source;
  const blockNode = nodes.find((n) => n.id === blockId);
  console.log("[aesViewData] blockNode", blockId, blockNode ? { type: blockNode.type, hasData: !!blockNode.data, keyBits: blockNode.data?.keyBits?.slice?.(0, 32), keyText: blockNode.data?.keyText?.slice?.(0, 32) } : null);
  if (!blockNode || blockNode.type !== "blockcipher") {
    console.log("[aesViewData] EXIT null: block not found or not blockcipher");
    return null;
  }

  let plaintextNode = null;
  let keyNode = null;
  let isCbc = false;
  let xorNodeId = null;

  for (const e of edges) {
    if (e.target !== blockId) continue;
    if (e.targetHandle === "plaintext") {
      plaintextNode = nodes.find((n) => n.id === e.source);
      console.log("[aesViewData] plaintext from handle 'plaintext'", e.source, plaintextNode?.id);
      break;
    }
    if (e.targetHandle === "xor") {
      xorNodeId = e.source;
      const edgePt = edges.find((e2) => e2.target === xorNodeId && (e2.targetHandle === "pt" || e2.targetHandle === "plaintext"));
      if (edgePt) plaintextNode = nodes.find((n) => n.id === edgePt.source);
      isCbc = true;
      console.log("[aesViewData] plaintext via xor (CBC)", xorNodeId, edgePt?.source, plaintextNode?.id);
      break;
    }
  }
  const keyEdge = edges.find((e) => e.target === blockId && e.targetHandle === "key");
  if (keyEdge) keyNode = nodes.find((n) => n.id === keyEdge.source);
  console.log("[aesViewData] keyEdge", keyEdge ? keyEdge.source : null, "keyNode", keyNode?.id, keyNode?.data ? { hasBits: !!keyNode.data.bits, hasKeyText: !!keyNode.data.keyText, keyTextLen: keyNode.data.keyText?.length } : null);

  const plaintextString = plaintextNode && (plaintextNode.data?.inputType === "text") ? (plaintextNode.data.value ?? plaintextNode.data.text ?? "") : null;

  let ivBytes = null;
  if (isCbc && xorNodeId) {
    const edgePc = edges.find((e2) => e2.target === xorNodeId && (e2.targetHandle === "pc" || e2.targetHandle === "pcTop"));
    if (edgePc) {
      const ivNode = nodes.find((n) => n.id === edgePc.source);
      if (ivNode && ivNode.type === "iv" && ivNode.data?.bits) {
        ivBytes = bitsTo16Bytes(ivNode.data.bits);
        console.log("[aesViewData] CBC IV from iv node", ivBytes?.slice(0, 4));
      }
    }
  }

  // First block input to AES: for CBC with text plaintext use same as CryptoJS (UTF-8 + PKCS7 first 16 bytes then XOR IV)
  let firstBlockBytes;
  if (isCbc && ivBytes && ivBytes.length === 16 && typeof plaintextString === "string") {
    firstBlockBytes = stringToUtf8Pkcs7FirstBlock(plaintextString);
    console.log("[aesViewData] CBC text: first block (PKCS7)", firstBlockBytes.slice(0, 6));
  } else {
    firstBlockBytes = plaintextNode ? plaintextTo16Bytes(plaintextNode.data) : null;
  }
  if (!firstBlockBytes || firstBlockBytes.length !== 16) {
    console.log("[aesViewData] EXIT null: firstBlockBytes missing or not 16");
    return null;
  }
  console.log("[aesViewData] plaintextNode.data", plaintextNode?.data ? { inputType: plaintextNode.data.inputType, valuePreview: String(plaintextNode.data.value ?? "").slice(0, 30) } : null, "firstBlockBytes", firstBlockBytes.slice(0, 4));

  const stateBytes = isCbc && ivBytes && ivBytes.length === 16
    ? firstBlockBytes.map((b, i) => (b ^ ivBytes[i]) & 0xff)
    : firstBlockBytes;
  if (isCbc && (!ivBytes || ivBytes.length !== 16)) {
    console.log("[aesViewData] CBC but IV missing or not 16 bytes, using plaintext as state");
  }
  console.log("[aesViewData] stateBytes (first block input to AES)", stateBytes ? stateBytes.slice(0, 4) : null);

  let keyBytes = keyNode ? keyTo16Bytes(keyNode.data) : null;
  console.log("[aesViewData] keyBytes from keyNode", keyBytes ? keyBytes.slice(0, 4) : null);
  if (!keyBytes && blockNode.data && (blockNode.data.keyBits || blockNode.data.keyText)) {
    keyBytes = keyTo16Bytes({
      keyText: blockNode.data.keyBits || blockNode.data.keyText,
    });
    console.log("[aesViewData] keyBytes from block fallback", keyBytes ? keyBytes.slice(0, 4) : null);
  }
  if (!keyBytes) {
    console.log("[aesViewData] EXIT null: keyBytes missing");
    return null;
  }

  console.log("[aesViewData] EXIT OK", { stateBytesLen: stateBytes.length, keyBytesLen: keyBytes.length, isCbc: !!isCbc, ivBytes: !!ivBytes });
  return { stateBytes, keyBytes, plaintextString, isCbc: isCbc && !!ivBytes, ivBytes: ivBytes || undefined };
}
