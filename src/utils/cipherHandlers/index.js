import { runXorHandler } from "./xorHandler";
import { runAesImageHandler } from "./aesHandler";
import { bitsToHex } from "./bitsToHex";

export { bitsToHex, runXorHandler };

export function runCipherHandler({ blockId, edges, mode, setNodes, onRunXor }) {
  setNodes((currentNodes) => {
    const block = currentNodes.find((n) => n.id === blockId);
    if (!block) return currentNodes;

    const cipherType = block.data?.cipherType || "xor";

    let plaintextNode = null;
    let plaintextEdge = edges.find((e) => e.target === blockId && e.targetHandle === "plaintext");
    if (plaintextEdge) {
      plaintextNode = currentNodes.find((n) => n.id === plaintextEdge.source);
    }

    if (!plaintextNode) {
      const xorEdge = edges.find((e) => e.target === blockId && e.targetHandle === "xor");
      if (xorEdge) {
        const xorNode = currentNodes.find((n) => n.id === xorEdge.source);
        if (xorNode?.type === "xor") {
          const xorPtEdge = edges.find(
            (e) => e.target === xorNode.id && (e.targetHandle === "pt" || e.targetHandle === "ptLeft")
          );
          plaintextNode = xorPtEdge ? currentNodes.find((n) => n.id === xorPtEdge.source) : null;
        }
      }

      if (!plaintextNode && mode === "ctr") {
        const ctrXorEdge = edges.find(
          (e) =>
            e.source === blockId &&
            e.sourceHandle === "out" &&
            (e.targetHandle === "pc" || e.targetHandle === "pcTop")
        );
        const xorNode = ctrXorEdge ? currentNodes.find((n) => n.id === ctrXorEdge.target) : null;
        if (xorNode?.type === "xor") {
          const xorPtEdge = edges.find(
            (e) => e.target === xorNode.id && (e.targetHandle === "pt" || e.targetHandle === "ptLeft")
          );
          plaintextNode = xorPtEdge ? currentNodes.find((n) => n.id === xorPtEdge.source) : null;
        }
      }
    }

    const plaintextInputType = plaintextNode?.data?.inputType;
    const plaintextIsEncrypted = plaintextInputType === "encryptedFile";
    const isImageMode = plaintextInputType === "image" || plaintextInputType === "encryptedFile";
    const isEncryptedInput = plaintextIsEncrypted;

    if (cipherType === "xor") {
      onRunXor(blockId, currentNodes, edges, mode);
      return currentNodes;
    }

    if (cipherType === "aes" && isImageMode) {
      const plaintextFile = plaintextNode?.data?.value;
      const file = plaintextFile;

      if (!file) {
        alert("No file loaded in PlaintextNode");
        return currentNodes;
      }

      try {
        runAesImageHandler({
          blockId,
          block,
          file,
          isEncryptedInput,
          currentNodes,
          edges,
          mode,
          setNodes,
        });
      } catch (err) {
        console.error("Cipher error:", err);
        alert("Cipher error: " + err.message);
      }
    }

    return currentNodes;
  });
}
