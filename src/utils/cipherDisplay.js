/**
 * Parse computeGraph `fullBinary`: XOR bit string or AES hex → uppercase byte pairs.
 */
export function cipherFullBinaryToHexBytes(fullBinary) {
  if (fullBinary == null || fullBinary === "") return [];
  const s = String(fullBinary).replace(/\s/g, "");
  if (!s) return [];

  if (/^[01]+$/.test(s)) {
    const out = [];
    for (let i = 0; i < s.length; i += 8) {
      const chunk = s.slice(i, i + 8);
      if (!chunk) break;
      const padded = chunk.length < 8 ? chunk.padEnd(8, "0") : chunk;
      out.push(parseInt(padded.slice(0, 8), 2).toString(16).toUpperCase().padStart(2, "0"));
    }
    return out;
  }

  if (/^[0-9a-fA-F]+$/.test(s)) {
    const hex = s.length % 2 === 1 ? `0${s}` : s;
    const pairs = hex.match(/.{2}/g);
    return pairs ? pairs.map((p) => p.toUpperCase()) : [];
  }

  return [];
}

/** Each ciphertext byte as { hex: "48", bits8: "01001000" } for stacked display. */
export function cipherOutputToByteRows(fullBinary) {
  const hexBytes = cipherFullBinaryToHexBytes(fullBinary);
  return hexBytes.map((h) => ({
    hex: h,
    bits8: parseInt(h, 16).toString(2).padStart(8, "0"),
  }));
}
