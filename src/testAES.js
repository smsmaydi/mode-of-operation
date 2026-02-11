// Test script to verify AES encryption works
import CryptoJS from 'crypto-js';

function textToBinary(text) {
  return Array.from(text)
    .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('');
}

function binaryToText(binStr) {
  const chars = [];
  for (let i = 0; i < binStr.length; i += 8) {
    const byte = binStr.slice(i, i + 8);
    if (byte.length === 8) {
      chars.push(String.fromCharCode(parseInt(byte, 2)));
    }
  }
  return chars.join("");
}

function encryptBitsWithAES(bits, keyPassphrase) {
  try {
    if (!bits || !keyPassphrase) {
      console.log("❌ Missing bits or key!");
      return null;
    }
    
    const plaintext = binaryToText(bits);
    console.log("✅ Binary to text:", plaintext);
    
    if (!plaintext) {
      console.log("❌ Binary to text conversion failed!");
      return null;
    }
    
    const key = CryptoJS.enc.Utf8.parse(keyPassphrase);
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
    console.log("✅ Encryption successful:", encryptedHex);
    return encryptedHex;
  } catch (err) {
    console.error("❌ AES Error:", err.message);
    return null;
  }
}

// Test
const text = "Hello";
const binary = textToBinary(text);
const key = "mySecretKey12345";

console.log("\n=== AES TEST ===");
console.log("Input text:", text);
console.log("Binary:", binary);
console.log("Key:", key);

const result = encryptBitsWithAES(binary, key);
console.log("Result:", result);
console.log("Result type:", typeof result);
console.log("Result length:", result?.length);
