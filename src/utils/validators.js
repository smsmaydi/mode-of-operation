// base rules
function baseRules(params, nodes) {
  const src = nodes.find(n => n.id === params.source);
  const tgt = nodes.find(n => n.id === params.target);
  if (!src || !tgt) return false;

  // Plaintext(out) -> BlockCipher(plaintext)
  if (src.type === 'plaintext' && params.sourceHandle === 'out' &&
      tgt.type === 'blockcipher' && params.targetHandle === 'plaintext') {
    return true;
  }

  // Key(out) -> BlockCipher(key)
  if (src.type === 'key' && params.sourceHandle === 'out' &&
      tgt.type === 'blockcipher' && params.targetHandle === 'key') {
    return true;
  }

  // BlockCipher(out) -> Ciphertext(in)
  if (src.type === 'blockcipher' && params.sourceHandle === 'out' &&
      tgt.type === 'ciphertext' && params.targetHandle === 'in') {
    return true;
  }

  return false;
}

// Mode’a göre farklı kural seti döndürmek için factory
export function makeIsValidConnection(mode) {
  return function isValidConnection(params, nodes) {
    // Şimdilik mode’a bakmadan hep aynı kuralı dönüyoruz
    return baseRules(params, nodes);
  };
}
