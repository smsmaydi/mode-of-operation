const te = new TextEncoder();


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
    encryptFileAES(file, passphrase): Reads a File/Blob into bytes, 
    encrypts it with aesGcmEncryptBytes, 
    wraps the result in a blob, and returns an object URL for downloading 
    or previewing the encrypted file.
*/ 
export async function encryptFileAES(file, passphrase) {
  const buf = await file.arrayBuffer();
  const outBytes = await aesGcmEncryptBytes(new Uint8Array(buf), passphrase);
  const blob = new Blob([outBytes], { type: "application/octet-stream" });
  return URL.createObjectURL(blob);
}
