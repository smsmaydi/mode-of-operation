import { encryptFileAES, decryptFileAES } from "../aesFile";
import { encryptImageAesEcb, decryptImageAesEcb } from "../aesEcbImage";
import { encryptImageAesCbc, decryptImageAesCbc } from "../aesCbcImage";
import { fileToPixelBytes } from "../../components/crypto/imageToBytes";
import { rgbaBytesToPngDataUrl } from "../bytesToDataUrl";
import { bitsToHex } from "./bitsToHex";

function runAesEcbMode({ blockId, block, file, isEncryptedInput, edges, setNodes }) {
  const keyBits = block.data.keyBits || "";
  const isHexKey = /^[0-9a-f]+$/i.test(keyBits) && (keyBits.length === 32 || keyBits.length === 64);
  const isBinaryKey = /^[01]+$/.test(keyBits) && keyBits.length >= 8;
  const isValidKey = isHexKey || isBinaryKey;
  const keyHex = isHexKey ? keyBits : isBinaryKey ? bitsToHex(keyBits) : null;

  if (!isValidKey || !keyHex) return false;

  const outEdge = edges.find((e) => e.source === blockId && e.sourceHandle === "out");
  const ctId = outEdge?.target;

  if (isEncryptedInput) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const encryptedBytes = new Uint8Array(e.target.result);
        const decryptedPixels = decryptImageAesEcb(encryptedBytes, keyHex);
        const url = rgbaBytesToPngDataUrl(decryptedPixels, 256, 256);
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === blockId) return { ...n, data: { ...n.data, preview: url, encryptedBlobUrl: undefined } };
            if (ctId && n.id === ctId) return { ...n, data: { ...n.data, result: url, encryptedBlobUrl: undefined } };
            return n;
          })
        );
      } catch (err) {
        alert("AES-ECB decryption error: " + err.message);
      }
    };
    reader.onerror = () => alert("Error reading encrypted file");
    reader.readAsArrayBuffer(file);
  } else {
    fileToPixelBytes(file, { width: 256, height: 256 })
      .then((pixelBytes) => {
        const encryptedPixels = encryptImageAesEcb(pixelBytes, keyHex);
        const encBlob = new Blob([encryptedPixels], { type: "application/octet-stream" });
        const encryptedBlobUrl = URL.createObjectURL(encBlob);
        const previewUrl = rgbaBytesToPngDataUrl(encryptedPixels, 256, 256);
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === blockId) return { ...n, data: { ...n.data, preview: previewUrl, encryptedBlobUrl } };
            if (ctId && n.id === ctId) return { ...n, data: { ...n.data, result: previewUrl, encryptedBlobUrl } };
            return n;
          })
        );
      })
      .catch((err) => alert("AES-ECB encryption error: " + err.message));
  }
  return true;
}

function runAesCbcMode({ blockId, block, file, isEncryptedInput, currentNodes, edges, setNodes }) {
  const keyBits = block.data.keyBits || "";
  const isHexKey = /^[0-9a-f]+$/i.test(keyBits) && (keyBits.length === 32 || keyBits.length === 64);
  const isBinaryKey = /^[01]+$/.test(keyBits) && keyBits.length >= 8;
  const isValidKey = isHexKey || isBinaryKey;
  const keyHex = isHexKey ? keyBits : isBinaryKey ? bitsToHex(keyBits) : null;

  if (!isValidKey || !keyHex) return false;

  const ivNode = currentNodes.find((n) => n.type === "iv");
  const ivBits = ivNode?.data?.bits || "";
  if (!ivBits || ivBits.length !== 128) {
    alert("CBC mode requires 128-bit IV (128 binary digits). Please add an IV node and generate 128-bit value.");
    return false;
  }

  const ivHex = bitsToHex(ivBits);
  const outEdge = edges.find((e) => e.source === blockId && e.sourceHandle === "out");
  const ctId = outEdge?.target;

  if (isEncryptedInput) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const encryptedBytes = new Uint8Array(e.target.result);
        const decryptedPixels = decryptImageAesCbc(encryptedBytes, keyHex, ivHex);
        const url = rgbaBytesToPngDataUrl(decryptedPixels, 256, 256);
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === blockId) return { ...n, data: { ...n.data, preview: url, encryptedBlobUrl: undefined } };
            if (ctId && n.id === ctId) return { ...n, data: { ...n.data, result: url, encryptedBlobUrl: undefined } };
            return n;
          })
        );
      } catch (err) {
        alert("AES-CBC decryption error: " + err.message);
      }
    };
    reader.onerror = () => alert("Error reading encrypted file");
    reader.readAsArrayBuffer(file);
  } else {
    fileToPixelBytes(file, { width: 256, height: 256 })
      .then((pixelBytes) => {
        const encryptedPixels = encryptImageAesCbc(pixelBytes, keyHex, ivHex);
        const encBlob = new Blob([encryptedPixels], { type: "application/octet-stream" });
        const encryptedBlobUrl = URL.createObjectURL(encBlob);
        const previewUrl = rgbaBytesToPngDataUrl(encryptedPixels, 256, 256);
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === blockId) return { ...n, data: { ...n.data, preview: previewUrl, encryptedBlobUrl } };
            if (ctId && n.id === ctId) return { ...n, data: { ...n.data, result: previewUrl, encryptedBlobUrl } };
            return n;
          })
        );
      })
      .catch((err) => alert("AES-CBC encryption error: " + err.message));
  }
  return true;
}

function runAesGcmFallback({ blockId, block, file, isEncryptedInput, edges, setNodes }) {
  const keyBits = block.data.keyBits || "";
  const keyText = block.data.keyText || "";
  const passphrase = keyText || keyBits;
  if (!passphrase) return false;

  const outEdge = edges.find((e) => e.source === blockId && e.sourceHandle === "out");
  const ctId = outEdge?.target;

  if (isEncryptedInput) {
    decryptFileAES(file, passphrase)
      .then(({ url }) => {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === blockId) return { ...n, data: { ...n.data, preview: url, encryptedBlobUrl: undefined } };
            if (ctId && n.id === ctId) return { ...n, data: { ...n.data, result: url, encryptedBlobUrl: undefined } };
            return n;
          })
        );
      })
      .catch(() => {
        alert("AES decryption error: The key may be incorrect or the file may be corrupted.");
      });
  } else {
    encryptFileAES(file, passphrase)
      .then(({ previewUrl, encryptedBlobUrl }) => {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === blockId) return { ...n, data: { ...n.data, preview: previewUrl, encryptedBlobUrl } };
            if (ctId && n.id === ctId) return { ...n, data: { ...n.data, result: previewUrl, encryptedBlobUrl } };
            return n;
          })
        );
      })
      .catch((err) => alert("AES encryption error: " + err.message));
  }
  return true;
}

export function runAesImageHandler({
  blockId,
  block,
  file,
  isEncryptedInput,
  currentNodes,
  edges,
  mode,
  setNodes,
}) {
  const keyBits = block.data.keyBits || "";
  const isHexKey = /^[0-9a-f]+$/i.test(keyBits) && (keyBits.length === 32 || keyBits.length === 64);
  const isBinaryKey = /^[01]+$/.test(keyBits) && keyBits.length >= 8;
  const isValidKey = isHexKey || isBinaryKey;
  const keyHexForEncryption = isHexKey ? keyBits : isBinaryKey ? bitsToHex(keyBits) : null;

  if (!isValidKey || !keyHexForEncryption) return;

  if (mode === "ecb") {
    runAesEcbMode({ blockId, block, file, isEncryptedInput, edges, setNodes });
    return;
  }

  if (mode === "cbc") {
    runAesCbcMode({ blockId, block, file, isEncryptedInput, currentNodes, edges, setNodes });
    return;
  }

  runAesGcmFallback({ blockId, block, file, isEncryptedInput, edges, setNodes });
}
