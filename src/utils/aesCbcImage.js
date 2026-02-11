import CryptoJS from "crypto-js";

/**
 * AES-CBC Image Encryption
 * Encrypts image pixel data with block chaining
 * Each block XORed with previous ciphertext (or IV for first block)
 * Result: Patterns completely hidden (secure mode)
 */

/**
 * Encrypts RGBA pixel bytes using AES-CBC
 * @param {Uint8Array} pixelBytes - Raw RGBA pixel data
 * @param {string} keyHex - Hex key (128/192/256 bit)
 * @param {string} ivHex - Hex IV (128 bit = 16 bytes)
 * @returns {Uint8Array} Encrypted pixel bytes
 */
export function encryptImageAesCbc(pixelBytes, keyHex, ivHex) {
  console.log("🔐 AES-CBC Image Encryption");
  console.log("  Input bytes:", pixelBytes.length);
  console.log("  Key (HEX):", keyHex);
  console.log("  IV (HEX):", ivHex);
  
  // Parse key and IV from hex
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  
  console.log("  Key length (bytes):", key.sigBytes);
  console.log("  IV length (bytes):", iv.sigBytes);
  
  if (iv.sigBytes !== 16) {
    throw new Error("IV must be 128 bits (32 hex characters)");
  }
  
  // For 256×256 image, we need to handle potential padding overflow
  // PKCS7 padding could add up to 16 bytes, but ImageData expects exactly pixelBytes.length
  // Solution: Encrypt to next block boundary, then truncate back to original size
  const blockSize = 16;
  const originalLength = pixelBytes.length;
  const paddedLength = Math.ceil(originalLength / blockSize) * blockSize;
  
  // Pad manually to exact block boundary
  const paddedBytes = new Uint8Array(paddedLength);
  paddedBytes.set(pixelBytes);
  
  // Add PKCS7 padding
  const padValue = paddedLength - originalLength;
  for (let i = originalLength; i < paddedLength; i++) {
    paddedBytes[i] = padValue;
  }
  
  // Convert padded bytes to hex
  const dataHex = Array.from(paddedBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Convert to WordArray
  const dataWords = CryptoJS.enc.Hex.parse(dataHex);
  
  console.log("  Encrypting with CBC mode...");
  
  // Encrypt with AES-CBC (NoPadding since we padded manually)
  const encrypted = CryptoJS.AES.encrypt(dataWords, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.NoPadding
  });
  
  // Extract ciphertext as bytes
  const cipherHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  const encryptedBytes = hexToUint8Array(cipherHex);
  
  console.log("  ✅ Encrypted:", encryptedBytes.length, "bytes");
  console.log("  🔒 CBC mode - blocks are chained, patterns hidden!");
  
  // Truncate to original size for PNG display (remove padding bytes)
  return encryptedBytes.slice(0, originalLength);
}

/**
 * Decrypts RGBA pixel bytes using AES-CBC
 * @param {Uint8Array} encryptedBytes - Encrypted pixel data
 * @param {string} keyHex - Hex key (must match encryption key)
 * @param {string} ivHex - Hex IV (must match encryption IV)
 * @returns {Uint8Array} Decrypted pixel bytes
 */
export function decryptImageAesCbc(encryptedBytes, keyHex, ivHex) {
  console.log("🔓 AES-CBC Image Decryption");
  console.log("  Input bytes:", encryptedBytes.length);
  console.log("  Key (HEX):", keyHex);
  console.log("  IV (HEX):", ivHex);
  
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  
  if (iv.sigBytes !== 16) {
    throw new Error("IV must be 128 bits (32 hex characters)");
  }
  
  // Pad encrypted bytes to block boundary (encrypted data must be multiple of 16)
  const blockSize = 16;
  const paddedLength = Math.ceil(encryptedBytes.length / blockSize) * blockSize;
  const paddedEncrypted = new Uint8Array(paddedLength);
  paddedEncrypted.set(encryptedBytes);
  
  // Convert encrypted bytes to hex
  const cipherHex = Array.from(paddedEncrypted)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Create ciphertext object
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Hex.parse(cipherHex)
  });
  
  console.log("  Decrypting with CBC mode...");
  
  // Decrypt with AES-CBC (NoPadding to match encryption)
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.NoPadding
  });
  
  // Extract plaintext bytes
  const plainHex = decrypted.toString(CryptoJS.enc.Hex);
  const decryptedBytes = hexToUint8Array(plainHex);
  
  console.log("  ✅ Decrypted:", decryptedBytes.length, "bytes");
  
  // Return only the original image size (remove padding)
  return decryptedBytes.slice(0, encryptedBytes.length);
}

/**
 * Helper: Convert hex string to Uint8Array
 */
function hexToUint8Array(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return new Uint8Array(bytes);
}
