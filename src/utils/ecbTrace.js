// utils/ecbTrace.js

function toHex(u8) {
  return Array.from(u8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function xorWithRepeatingKey(block, key) {
  const out = new Uint8Array(block.length);
  for (let i = 0; i < block.length; i++) {
    out[i] = block[i] ^ key[i % key.length];
  }
  return out;
}

function pickFirstDefined(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

export function ecbFirstNTrace(nodes, _edges, n = 8, blockSize = 16) {
  const pt = nodes.find((x) => x.type === "plaintext");
  const keyN = nodes.find((x) => x.type === "key");

  // Debug: ne var ne yok görelim
  console.log("[ecbTrace] plaintext node:", pt?.data);
  console.log("[ecbTrace] key node:", keyN?.data);

  if (!pt || !keyN) return [];

  // TEXT MODE: plaintext
  const text = pickFirstDefined(pt.data, ["value", "text", "plaintext", "input", "message"]);
  // BITS MODE (opsiyonel): bits
  const bits = pickFirstDefined(pt.data, ["bits", "bitString", "bin"]);

  // KEY: text veya bits
  const keyText = pickFirstDefined(keyN.data, ["value", "keyText", "text", "key"]);
  const keyBits = pickFirstDefined(keyN.data, ["bits", "keyBits", "bitString", "bin"]);

  // plaintext bytes
  let bytes;
  if (bits) {
    const clean = String(bits).replace(/\s+/g, "");
    const byteLen = Math.floor(clean.length / 8);
    const out = new Uint8Array(byteLen);
    for (let i = 0; i < byteLen; i++) {
      out[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
    }
    bytes = out;
  } else {
    bytes = new TextEncoder().encode(String(text || ""));
  }

  // key bytes
  let keyBytes;
  if (keyBits) {
    const clean = String(keyBits).replace(/\s+/g, "");
    const byteLen = Math.floor(clean.length / 8);
    const out = new Uint8Array(byteLen);
    for (let i = 0; i < byteLen; i++) {
      out[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
    }
    keyBytes = out;
  } else {
    keyBytes = new TextEncoder().encode(String(keyText || ""));
  }

  console.log("[ecbTrace] bytes len:", bytes.length);
  console.log("[ecbTrace] keyBytes len:", keyBytes.length);

  if (!bytes || bytes.length === 0) return [];
  if (!keyBytes || keyBytes.length === 0) return [];

  const rows = [];
  for (let i = 0; i < n; i++) {
    const start = i * blockSize;
    const m = bytes.slice(start, start + blockSize);
    if (m.length === 0) break;

    // ECB demo cipher: XOR-with-key (blok bağımsız)
    const c = xorWithRepeatingKey(m, keyBytes);

    rows.push({
      i,
      mHex: toHex(m),
      cHex: toHex(c),
    });
  }

  return rows;
}
