// Base validation rules for all modes
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

// Factory function to return mode-specific validation rules
export function makeIsValidConnection(mode) {
  return (params, nodes) => {
    const sourceNode = nodes.find((n) => n.id === params.source);
    const targetNode = nodes.find((n) => n.id === params.target);

    // BlockCipher -> Ciphertext (ECB mode)
    if (
      mode === "ecb" &&
      sourceNode?.type === "blockcipher" &&
      targetNode?.type === "ciphertext" &&
      params.sourceHandle === "out" &&
      params.targetHandle === "in"
    ) {
      return true;
    }

    // Ciphertext -> BlockCipher.prevCipher (CBC chaining for subsequent blocks)
    if (
      mode === "cbc" &&
      sourceNode?.type === "ciphertext" &&
      targetNode?.type === "blockcipher" &&
      params.sourceHandle === "out" &&
      params.targetHandle === "prevCipher"
    ) {
      return true;
    }

    // BlockCipher -> Ciphertext (CBC mode)
    if (
      mode === "cbc" &&
      sourceNode?.type === "blockcipher" &&
      targetNode?.type === "ciphertext" &&
      params.sourceHandle === "out" &&
      params.targetHandle === "in"
    ) {
      return true;
    }

    // IV -> BlockCipher.prevCipher (CBC initialization - first block uses IV instead of previous ciphertext)
    if (
      mode === "cbc" &&
      sourceNode?.type === "iv" &&
      targetNode?.type === "blockcipher" &&
      params.sourceHandle === "out" &&
      params.targetHandle === "prevCipher"
    ) {
      return true;
    }

    // --- XOR Node connections (CBC mode only) ---
    // Plaintext -> XOR.pt
    if (
      mode === "cbc" &&
      sourceNode?.type === "plaintext" &&
      targetNode?.type === "xor" &&
      params.sourceHandle === "out" &&
      (params.targetHandle === "pt" || params.targetHandle === "ptLeft")
    ) return true;

    // IV -> XOR.pc
    if (
      mode === "cbc" &&
      sourceNode?.type === "iv" &&
      targetNode?.type === "xor" &&
      params.sourceHandle === "out" &&
      params.targetHandle === "pc"
    ) return true;

    // Ciphertext -> XOR.pc (for chaining in CBC)
    if (
      mode === "cbc" &&
      sourceNode?.type === "ciphertext" &&
      targetNode?.type === "xor" &&
      params.sourceHandle === "out" &&
      params.targetHandle === "pc"
    ) return true;

    // XOR -> BlockCipher.xor
    if (
      mode === "cbc" &&
      sourceNode?.type === "xor" &&
      targetNode?.type === "blockcipher" &&
      params.sourceHandle === "out" &&
      params.targetHandle === "xor"
    ) return true;

    // CTR -> BlockCipher.ctr
    if (
      mode === "ctr" &&
      sourceNode?.type === "ctr" &&
      targetNode?.type === "blockcipher" &&
      params.sourceHandle === "out" &&
      params.targetHandle === "ctr"
    ) return true;

    // Plaintext -> XOR.pt (CTR)
    if (
      mode === "ctr" &&
      sourceNode?.type === "plaintext" &&
      targetNode?.type === "xor" &&
      (params.sourceHandle === "out" || params.sourceHandle === "outRight") &&
      (params.targetHandle === "pt" || params.targetHandle === "ptLeft")
    ) return true;

    // BlockCipher -> XOR.pc (CTR keystream)
    if (
      mode === "ctr" &&
      sourceNode?.type === "blockcipher" &&
      targetNode?.type === "xor" &&
      params.sourceHandle === "out" &&
      (params.targetHandle === "pc" || params.targetHandle === "pcTop")
    ) return true;

    // XOR -> Ciphertext (CTR)
    if (
      mode === "ctr" &&
      sourceNode?.type === "xor" &&
      targetNode?.type === "ciphertext" &&
      params.sourceHandle === "out" &&
      params.targetHandle === "in"
    ) return true;

    // Plaintext -> BlockCipher (all modes)
    if (
      sourceNode?.type === "plaintext" &&
      targetNode?.type === "blockcipher" &&
      params.targetHandle === "plaintext"
    ) return true;

    // Key -> BlockCipher (all modes)
    if (
      sourceNode?.type === "key" &&
      targetNode?.type === "blockcipher" &&
      params.targetHandle === "key"
    ) return true;

    // Free mode: allow any connection for testing
    if (mode === "free") {
      return true;
    }

    return false;
  };
}



