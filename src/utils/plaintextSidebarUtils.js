/** Shared formatting for sidebar + legacy Plaintext node flows. */

export function textToHex(str) {
  if (typeof str !== "string") return "";
  return Array.from(str)
    .map((c) => (c.charCodeAt(0) & 0xff).toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

export function hexToText(hexStr) {
  if (typeof hexStr !== "string") return "";
  const cleaned = hexStr.replace(/\s/g, "").replace(/[^0-9a-fA-F]/g, "");
  const bytes = [];
  for (let i = 0; i + 2 <= cleaned.length; i += 2) {
    bytes.push(parseInt(cleaned.slice(i, i + 2), 16));
  }
  return String.fromCharCode(...bytes);
}

export function encryptedHexToBits(hexStr) {
  const cleaned = String(hexStr || "").replace(/\s/g, "").replace(/[^0-9a-fA-F]/g, "");
  let out = "";
  for (let i = 0; i + 2 <= cleaned.length; i += 2) {
    const byte = parseInt(cleaned.slice(i, i + 2), 16);
    out += byte.toString(2).padStart(8, "0");
  }
  return out;
}

export function encryptedBitsToHex(bitsStr) {
  const cleaned = String(bitsStr || "").replace(/\s/g, "").replace(/[^01]/g, "");
  const padded = cleaned.length % 8 ? cleaned.padEnd(cleaned.length + (8 - (cleaned.length % 8)), "0") : cleaned;
  const out = [];
  for (let i = 0; i < padded.length; i += 8) {
    const byte = padded.slice(i, i + 8);
    out.push(parseInt(byte || "0", 2).toString(16).toUpperCase().padStart(2, "0"));
  }
  return out.join("");
}

export function bitsValueToHexPreview(bits) {
  const b = String(bits || "").replace(/[^01]/g, "");
  if (!b) return "";
  const padded = b.length % 8 ? b + "0".repeat(8 - (b.length % 8)) : b;
  return (padded.match(/.{8}/g) || [])
    .map((byte) => parseInt(byte, 2).toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}
