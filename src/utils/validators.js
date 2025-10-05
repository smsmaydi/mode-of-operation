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
  return (params, nodes) => {
    const sourceNode = nodes.find((n) => n.id === params.source);
    const targetNode = nodes.find((n) => n.id === params.target);

    // BlockCipher -> Ciphertext (ECB / Free)
    if (
      (mode === "ecb" || mode === "free") &&
      sourceNode?.type === "blockcipher" &&
      targetNode?.type === "ciphertext" &&
      params.sourceHandle === "out" &&
      params.targetHandle === "in"
    ) {
      return true;
    }

    // Ciphertext -> BlockCipher.prevCipher (CBC chaining)
    if (
      (mode === "cbc" || mode === "free") &&
      sourceNode?.type === "ciphertext" &&
      targetNode?.type === "blockcipher" &&
      params.sourceHandle === "out" &&
      params.targetHandle === "prevCipher"
    ) {
      return true;
    }

    // Plaintext -> BlockCipher
    if (
      sourceNode?.type === "plaintext" &&
      targetNode?.type === "blockcipher" &&
      params.targetHandle === "plaintext"
    ) return true;

    // Key -> BlockCipher
    if (
      sourceNode?.type === "key" &&
      targetNode?.type === "blockcipher" &&
      params.targetHandle === "key"
    ) return true;

    // IV -> BlockCipher (map to prevCipher)
    if (
      sourceNode?.type === "iv" &&
      targetNode?.type === "blockcipher" &&
      params.targetHandle === "prevCipher"
    ) return true;

    return false;
  };
}



