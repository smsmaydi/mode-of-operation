import CryptoJS from "crypto-js";

/**
 * AES-ECB Image Encryption
 * Encrypts image pixel data block-by-block (16 bytes each)
 * Demonstrates ECB weakness: identical blocks produce identical ciphertexts
 * Result: Image patterns remain visible (educational demonstration)
 */

/**
 * Encrypts RGBA pixel bytes using AES-ECB
 * @param {Uint8Array} pixelBytes - Raw RGBA pixel data (width × height × 4 bytes)
 * @param {string} keyHex - Hex key (128/192/256 bit)
 * @returns {Uint8Array} Encrypted pixel bytes (same length)
 */
export function encryptImageAesEcb(pixelBytes, keyHex) {
  console.log("🔐 AES-ECB Image Encryption");
  console.log("  Input bytes:", pixelBytes.length);
  console.log("  Key (HEX):", keyHex);
  
  // Parse key from hex
  const key = CryptoJS.enc.Hex.parse(keyHex);
  console.log("  Key length (bytes):", key.sigBytes);
  
  const blockSize = 16; // AES block size
  const totalBlocks = Math.ceil(pixelBytes.length / blockSize);
  const paddedLength = totalBlocks * blockSize;
  
  // Pad to block size with PKCS7
  const paddedBytes = new Uint8Array(paddedLength);
  paddedBytes.set(pixelBytes);
  
  // PKCS7 padding
  const padValue = paddedLength - pixelBytes.length;
  for (let i = pixelBytes.length; i < paddedLength; i++) {
    paddedBytes[i] = padValue;
  }
  
  console.log("  Total blocks:", totalBlocks);
  console.log("  Padded length:", paddedLength);
  
  // Encrypt block by block
  const encryptedBytes = new Uint8Array(paddedLength);
  
  for (let i = 0; i < totalBlocks; i++) {
    const blockStart = i * blockSize;
    const blockEnd = blockStart + blockSize;
    const blockData = paddedBytes.slice(blockStart, blockEnd);
    
    // Convert block to hex string for CryptoJS
    const blockHex = Array.from(blockData)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Convert hex to WordArray
    const blockWords = CryptoJS.enc.Hex.parse(blockHex);
    
    // Encrypt single block (ECB = independent blocks)
    const encrypted = CryptoJS.AES.encrypt(blockWords, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.NoPadding // We already padded manually
    });
    
    // Extract ciphertext bytes
    const cipherHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
    const cipherBytes = hexToUint8Array(cipherHex);
    encryptedBytes.set(cipherBytes, blockStart);
  }
  
  console.log("  ✅ Encrypted:", encryptedBytes.length, "bytes");
  console.log("  ⚠️ ECB mode - identical blocks produce identical ciphertext!");
  
  return encryptedBytes;
}

/**
 * Decrypts RGBA pixel bytes using AES-ECB
 * @param {Uint8Array} encryptedBytes - Encrypted pixel data
 * @param {string} keyHex - Hex key (must match encryption key)
 * @returns {Uint8Array} Decrypted pixel bytes
 */
export function decryptImageAesEcb(encryptedBytes, keyHex) {
  console.log("🔓 AES-ECB Image Decryption");
  console.log("  Input bytes:", encryptedBytes.length);
  console.log("  Key (HEX):", keyHex);
  
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const blockSize = 16;
  const totalBlocks = encryptedBytes.length / blockSize;
  
  console.log("  Total blocks:", totalBlocks);
  
  const decryptedBytes = new Uint8Array(encryptedBytes.length);
  
  for (let i = 0; i < totalBlocks; i++) {
    const blockStart = i * blockSize;
    const blockEnd = blockStart + blockSize;
    const blockData = encryptedBytes.slice(blockStart, blockEnd);
    
    // Convert to hex for CryptoJS
    const blockHex = Array.from(blockData)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Create ciphertext object
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(blockHex)
    });
    
    // Decrypt single block
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.NoPadding
    });
    
    // Extract plaintext bytes
    const plainBytes = hexToUint8Array(decrypted.toString(CryptoJS.enc.Hex));
    decryptedBytes.set(plainBytes, blockStart);
  }
  
  // Remove PKCS7 padding
  const padValue = decryptedBytes[decryptedBytes.length - 1];
  const unpaddedLength = decryptedBytes.length - padValue;
  
  console.log("  ✅ Decrypted:", unpaddedLength, "bytes (after removing padding)");
  
  return decryptedBytes.slice(0, unpaddedLength);
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
