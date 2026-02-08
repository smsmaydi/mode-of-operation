const te = new TextEncoder();
const td = new TextDecoder();


/* 
    sha256Bytes(input): Accepts a string or Uint8Array, 
    encodes strings as UTF-8, 
    hashes the bytes with SHA-256 via the Web Crypto API, 
    and returns the 32-byte digest as a Uint8Array.
*/ 
async function sha256Bytes(input) {
  const buf = typeof input === "string" ? te.encode(input) : input;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return new Uint8Array(hash);
}

/* 
    importAesKeyFromPassphrase(passphrase): 
    Derives key material by hashing the passphrase with sha256Bytes,
    then imports it as a raw AES-GCM key usable for encryption and decryption.
*/
async function importAesKeyFromPassphrase(passphrase) {
  const keyMaterial = await sha256Bytes(passphrase);
  return crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}


/* 
    concatUint8(a, b): 
    Utility to concatenate two Uint8Array instances into a new array ([a || b]).
*/
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


/*
    aesGcmEncryptBytes(bytes, passphrase): 
    Derives an AES-GCM key from the passphrase, 
    generates a 12-byte random IV, encrypts the provided bytes, 
    and returns a Uint8Array containing IV || ciphertext (IV prefixed).
*/
export async function aesGcmEncryptBytes(bytes, passphrase) {
  const key = await importAesKeyFromPassphrase(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
  const out = concatUint8(iv, new Uint8Array(ct));
  return out;
}


/*
    aesGcmDecryptBytes(bytes, passphrase): 
    Splits the first 12 bytes as IV and the rest as ciphertext, 
    re-derives the AES-GCM key from the passphrase, decrypts, 
    and returns the plaintext as a Uint8Array.
*/
export async function aesGcmDecryptBytes(bytes, passphrase) {
  const key = await importAesKeyFromPassphrase(passphrase);
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new Uint8Array(pt);
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

/*
    encryptFileAES(file, passphrase): Reads a File/Blob into bytes, 
    encrypts it with aesGcmEncryptBytes, 
    visualizes the encrypted bytes as a 256×256 PNG image,
    and returns a data URL for preview.
*/ 
export async function encryptFileAES(file, passphrase) {
  console.log("++++++++++++++++++++++++++++++++++encryptFileAES called");
  const buf = await file.arrayBuffer();
  const payload = buildPayloadWithMime(new Uint8Array(buf), file?.type);
  const outBytes = await aesGcmEncryptBytes(payload, passphrase);
  const pngDataUrl = encryptedBytesToPngDataUrl(outBytes);
  const blob = new Blob([outBytes], { type: "application/octet-stream" });
  return {
    previewUrl: pngDataUrl,
    encryptedBytes: outBytes,
    encryptedBlobUrl: URL.createObjectURL(blob),
  };
}

/*
    decryptFileAES(file, passphrase): Reads encrypted bytes,
    decrypts with AES-GCM, restores original bytes and mime,
    and returns an object URL for preview.
*/
export async function decryptFileAES(file, passphrase) {
  console.log("++++++++++++++++++++++++++++++++++decryptFileAES called");
  const buf = await file.arrayBuffer();
  const outBytes = await aesGcmDecryptBytes(new Uint8Array(buf), passphrase);
  const { mime, dataBytes } = extractMimeAndBytes(outBytes);
  const blob = new Blob([dataBytes], { type: mime });
  return { url: URL.createObjectURL(blob), mime, bytes: dataBytes };
}
