// utils/ecbTrace.js


/**
 * Converts a Uint8Array to a hex string. 
 * If hex value is less than 0x10, it is padded with a leading zero.
 */
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

/**
 * Strict bitstring -> bytes conversion.
 * - Accepts only '0' and '1' (whitespace is ignored).
 * - Requires length to be a multiple of 8 (full bytes).
 * - Returns { ok: false } when invalid, so we don't silently fall back to text mode.
 */
function bitsToBytesStrict(bitStr) {
  const clean = String(bitStr || "").replace(/\s+/g, "");
  if (!clean) return { ok: false, reason: "empty" };
  if (!/^[01]+$/.test(clean)) return { ok: false, reason: "non-binary" };
  if (clean.length % 8 !== 0) return { ok: false, reason: "not-multiple-of-8" };

  const out = new Uint8Array(clean.length / 8);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
  }
  return { ok: true, bytes: out };
}

export function ecbFirstNTrace(nodes, _edges, n = 8, blockSize = 16) {
  const pt = nodes.find((x) => x.type === "plaintext");
  const keyN = nodes.find((x) => x.type === "key");

  // Debug: inspect node data to confirm which fields are being used
  // console.log("[ecbTrace] plaintext node:", pt?.data);
  // console.log("[ecbTrace] key node:", keyN?.data);

  if (!pt || !keyN) return [];

  // Plaintext sources:
  // - Prefer bits if present and valid
  // - Otherwise fall back to text
  const text = pickFirstDefined(pt.data, ["value", "text", "plaintext", "input", "message"]);
  const bits = pickFirstDefined(pt.data, ["bits", "bitString", "bin"]);

  // Key sources:
  // - Prefer keyBits if present and valid
  // - Otherwise fall back to key text
  const keyText = pickFirstDefined(keyN.data, ["value", "keyText", "text", "key"]);
  const keyBits = pickFirstDefined(keyN.data, ["keyBits", "bits", "bitString", "bin"]);

  // Build plaintext bytes
  let bytes;
  if (bits) {
    const r = bitsToBytesStrict(bits);
    if (!r.ok) {
      console.warn("[ecbTrace] invalid plaintext bits:", r.reason);
      return [];
    }
    bytes = r.bytes;
  } else {
    bytes = new TextEncoder().encode(String(text || ""));
  }

  // Build key bytes
  let keyBytes;
  if (keyBits) {
    const r = bitsToBytesStrict(keyBits);
    if (!r.ok) {
      console.warn("[ecbTrace] invalid key bits:", r.reason);
      return [];
    }
    keyBytes = r.bytes;
  } else {
    keyBytes = new TextEncoder().encode(String(keyText || ""));
  }

  // console.log("[ecbTrace] bytes len:", bytes.length);
  // console.log("[ecbTrace] keyBytes len:", keyBytes.length);

  if (!bytes || bytes.length === 0) return [];
  if (!keyBytes || keyBytes.length === 0) return [];

  const rows = [];
  for (let i = 0; i < n; i++) {
    const start = i * blockSize;
    const m = bytes.slice(start, start + blockSize);
    if (m.length === 0) break;

    // ECB demo cipher: XOR-with-key (independent blocks)
    const c = xorWithRepeatingKey(m, keyBytes);

    rows.push({
      i,
      mHex: toHex(m),
      cHex: toHex(c),
    });
  }

  return rows;
}

export function ecbFirstNTraceFromBytes(bytes, keyBytes, n = 8, blockSize = 16) {
  if (!bytes?.length || !keyBytes?.length) return [];

  const rows = [];
  for (let i = 0; i < n; i++) {
    const start = i * blockSize;
    const m = bytes.slice(start, start + blockSize);
    if (m.length === 0) break;

    const c = xorWithRepeatingKey(m, keyBytes);

    rows.push({
      i,
      mHex: toHex(m),
      cHex: toHex(c),
    });
  }
  return rows;
}

