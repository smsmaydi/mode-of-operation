export function isValidConnection(params, nodes) {
  const src = nodes.find(n => n.id === params.source);
  const tgt = nodes.find(n => n.id === params.target);

  if (!src || !tgt) return false;

  // Plaintext -> BlockCipher (plaintext)
  if (src.type === 'plaintext' && params.sourceHandle === 'out' && tgt.type === 'blockcipher') {
    return params.targetHandle === 'plaintext';
  }

  // Key -> BlockCipher (key)
  if (src.type === 'key' && params.sourceHandle === 'out' && tgt.type === 'blockcipher') {
    return params.targetHandle === 'key';
  }

  // BlockCipher -> Ciphertext
  if (src.type === 'blockcipher' && params.sourceHandle === 'out' && tgt.type === 'ciphertext') {
    return params.targetHandle === 'in';
  }

  return false;
}
