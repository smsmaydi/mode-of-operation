import { fileToPixelBytes } from "../../components/crypto/imageToBytes";
import { xorRgbaBytesWithKey } from "../imageXor";
import { rgbaBytesToPngDataUrl } from "../bytesToDataUrl";

export async function runXorHandler({
  blockId,
  currentNodes,
  currentEdges,
  currentMode,
  setNodes,
}) {
  const block = currentNodes.find((n) => n.id === blockId);

  if (!block) return;

  const isDecrypt = block.data.isDecryptMode;
  let fileInput = isDecrypt ? block.data.encryptedImageFile : block.data.plaintextFile;
  let keyBits = block.data.keyBits;

  // CTR mode: locate plaintext file via XOR node and use keystream bits
  if (currentMode === "ctr") {
    keyBits = block.data.fullBinary || "";

    if (!fileInput) {
      const xorEdge = currentEdges.find(
        (e) => e.source === blockId && e.sourceHandle === "out" && (e.targetHandle === "pc" || e.targetHandle === "pcTop")
      );
      const xorNode = xorEdge ? currentNodes.find((n) => n.id === xorEdge.target) : null;
      const ptEdge = xorNode
        ? currentEdges.find(
            (e) => e.target === xorNode.id && (e.targetHandle === "pt" || e.targetHandle === "ptLeft")
          )
        : null;
      const ptNode = ptEdge ? currentNodes.find((n) => n.id === ptEdge.source) : null;
      fileInput = ptNode?.data?.value || fileInput;
    }
  }

  if (!fileInput || !keyBits) {
    alert("Missing image or key/keystream!");
    return;
  }

  if (typeof keyBits !== "string") {
    alert("Key bits format is invalid!");
    return;
  }

  const input = await fileToPixelBytes(fileInput, { width: 256, height: 256 });

  const outEdge = currentEdges.find((e) => e.source === blockId && e.sourceHandle === "out");
  const ctId = outEdge?.target;

  let prevBytes = null;
  if (currentMode === "cbc") {
    const xorEdge = currentEdges.find((e) => e.target === blockId && e.targetHandle === "xor");

    if (xorEdge) {
      const xorNode = currentNodes.find((n) => n.id === xorEdge.source);

      if (xorNode) {
        const ivEdge = currentEdges.find((e) => e.target === xorNode.id && e.targetHandle === "pc");
        if (ivEdge) {
          const ivNode = currentNodes.find((n) => n.id === ivEdge.source);

          if (ivNode) {
            if (ivNode.type === "iv") {
              const ivBits = ivNode.data.bits || "";
              const clean = ivBits.replace(/\s+/g, "");
              if (/^[01]+$/.test(clean) && clean.length % 8 === 0) {
                prevBytes = new Uint8Array(clean.length / 8);
                for (let i = 0; i < prevBytes.length; i++) {
                  prevBytes[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
                }
              }
            } else if (ivNode.type === "ciphertext" && ivNode.data.xorBytes) {
              prevBytes = ivNode.data.xorBytes;
            }
          }
        }
      }
    } else {
      const prevEdge = currentEdges.find((e) => e.target === blockId && e.targetHandle === "prevCipher");

      if (prevEdge) {
        const prevNode = currentNodes.find((n) => n.id === prevEdge.source);

        if (prevNode) {
          if (prevNode.type === "iv") {
            const ivBits = prevNode.data.bits || "";
            const clean = ivBits.replace(/\s+/g, "");
            if (/^[01]+$/.test(clean) && clean.length % 8 === 0) {
              prevBytes = new Uint8Array(clean.length / 8);
              for (let i = 0; i < prevBytes.length; i++) {
                prevBytes[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
              }
            }
          } else if (prevNode.type === "ciphertext" && prevNode.data.xorBytes) {
            prevBytes = prevNode.data.xorBytes;
          }
        }
      }
    }
  }

  let outBytes;
  if (currentMode === "cbc" && prevBytes) {
    const withPrev = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
      withPrev[i] = input[i] ^ prevBytes[i % prevBytes.length];
    }
    outBytes = xorRgbaBytesWithKey(withPrev, keyBits);
  } else {
    outBytes = xorRgbaBytesWithKey(input, keyBits);
  }

  const outUrl = rgbaBytesToPngDataUrl(outBytes, 256, 256);

  setNodes((nds) =>
    nds.map((n) => {
      if (n.id === blockId) {
        return { ...n, data: { ...n.data, preview: outUrl, xorBytes: outBytes } };
      }
      if (ctId && n.id === ctId) {
        return { ...n, data: { ...n.data, result: outUrl, xorBytes: outBytes } };
      }
      return n;
    })
  );
}
