/**
 * Stroke color for step edges from connection + node types (free / manual connect).
 */
export function resolveStepEdgeStroke(params, nodes) {
  const src = nodes.find((n) => n.id === params.source);
  const tgt = nodes.find((n) => n.id === params.target);

  if (src?.type === "blockcipher" && params.sourceHandle === "out") {
    return "var(--edge-block-out)";
  }
  if (
    (src?.type === "plaintextchunk" || src?.type === "plaintext") &&
    tgt?.type === "blockcipher" &&
    params.targetHandle === "plaintext"
  ) {
    return "var(--edge-chunk-to-block)";
  }
  if (src?.type === "keysnap" && tgt?.type === "blockcipher" && params.targetHandle === "key") {
    return "var(--edge-key)";
  }
  if (src?.type === "key" && tgt?.type === "blockcipher" && params.targetHandle === "key") {
    return "var(--edge-key)";
  }
  if (tgt?.type === "blockcipher" && params.targetHandle === "ctr") {
    return "var(--edge-ctr-input)";
  }
  if (tgt?.type === "blockcipher" && params.targetHandle === "xor") {
    return "var(--edge-xor)";
  }
  if (src?.type === "xor" && tgt?.type === "ciphertext" && params.targetHandle === "in") {
    return "var(--edge-xor-out)";
  }
  return "var(--edge-plaintext)";
}
