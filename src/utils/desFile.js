import forge from "node-forge";

const te = new TextEncoder();
const td = new TextDecoder();

function normalizeDesKey(keyStr) {
  const s = (keyStr ?? "").toString();
  if (s.length !== 8) {
    throw new Error("DES key must be exactly 8 characters");
  }
  return s;
}

function u8ToBinaryString(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return s;
}

function binaryStringToU8(s) {
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i) & 0xff;
  return u8;
}

function concatUint8(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/*
    buildPayloadWithMime(bytes, mime):
    Prefixes the raw bytes with an ASCII header "MIME:<type>\n".
*/
function buildPayloadWithMime(bytes, mime) {
  const safeMime = (mime || "application/octet-stream").toString();
  const header = te.encode(`MIME:${safeMime}\n`);
  return concatUint8(header, bytes);
}

/*
    extractMimeAndBytes(bytes):
    Reads optional "MIME:<type>\n" header and returns { mime, dataBytes }.
*/
function extractMimeAndBytes(bytes) {
  const prefix = [77, 73, 77, 69, 58]; // "MIME:"
  const hasPrefix = bytes.length >= 6 && prefix.every((v, i) => bytes[i] === v);
  if (hasPrefix) {
    const max = Math.min(bytes.length, 200);
    let newlineIndex = -1;
    for (let i = 5; i < max; i++) {
      if (bytes[i] === 10) {
        newlineIndex = i;
        break;
      }
    }
    if (newlineIndex !== -1) {
      const mime = td.decode(bytes.slice(5, newlineIndex)) || "application/octet-stream";
      return { mime, dataBytes: bytes.slice(newlineIndex + 1) };
    }
  }
  return { mime: "application/octet-stream", dataBytes: bytes };
}

export async function desCbcEncryptBytes(bytes, keyStr) {
  const key = normalizeDesKey(keyStr);
  const iv = forge.random.getBytesSync(8);

  const cipher = forge.cipher.createCipher("DES-CBC", key);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(u8ToBinaryString(bytes)));
  cipher.finish();

  const ct = cipher.output.getBytes();
  const out = binaryStringToU8(iv + ct);
  return out;
}

export async function desCbcDecryptBytes(bytes, keyStr) {
  const key = normalizeDesKey(keyStr);
  if (!bytes || bytes.length < 9) {
    throw new Error("DES encrypted data is too short");
  }

  const ivBytes = bytes.slice(0, 8);
  const ctBytes = bytes.slice(8);
  const iv = u8ToBinaryString(ivBytes);

  const decipher = forge.cipher.createDecipher("DES-CBC", key);
  decipher.start({ iv });
  decipher.update(forge.util.createBuffer(u8ToBinaryString(ctBytes)));
  const ok = decipher.finish();
  if (!ok) {
    throw new Error("DES decryption failed");
  }
  const pt = decipher.output.getBytes();
  return binaryStringToU8(pt);
}

/*
    encryptedBytesToPngDataUrl(encryptedBytes):
    Takes encrypted bytes and visualizes them as a 256×256 PNG image
    by padding/repeating bytes as RGBA pixel data.
*/
function encryptedBytesToPngDataUrl(encryptedBytes) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.createImageData(256, 256);
  
  // Fill RGBA data: repeat encrypted bytes to fill 262,144 bytes (256*256*4)
  for (let i = 0; i < imageData.data.length; i++) {
    imageData.data[i] = encryptedBytes[i % encryptedBytes.length];
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export async function encryptFileDES(file, keyStr) {
  console.log("--------------------------------encryptFileDES called");
  const buf = await file.arrayBuffer();
  const payload = buildPayloadWithMime(new Uint8Array(buf), file?.type);
  const outBytes = await desCbcEncryptBytes(payload, keyStr);
  const pngDataUrl = encryptedBytesToPngDataUrl(outBytes);
  const blob = new Blob([outBytes], { type: "application/octet-stream" });
  return {
    previewUrl: pngDataUrl,
    encryptedBytes: outBytes,
    encryptedBlobUrl: URL.createObjectURL(blob),
  };
}

export async function decryptFileDES(file, keyStr) {
  console.log("--------------------------------decryptFileDES called");
  const buf = await file.arrayBuffer();
  const outBytes = await desCbcDecryptBytes(new Uint8Array(buf), keyStr);
  const { mime, dataBytes } = extractMimeAndBytes(outBytes);
  const blob = new Blob([dataBytes], { type: mime });
  return { url: URL.createObjectURL(blob), mime, bytes: dataBytes };
}
