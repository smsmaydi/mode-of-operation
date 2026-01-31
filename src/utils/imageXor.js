

// src/utils/imageXor.js

// bit string → Uint8Array (ör. "01010101" → [85])
export function bitStringToBytes(bits) {
  const cleaned = (bits || '').replace(/[^01]/g, '');
  if (!cleaned) return new Uint8Array(0);

  const rem = cleaned.length % 8;
  const padded = rem === 0 ? cleaned : cleaned + '0'.repeat(8 - rem);

  const out = new Uint8Array(padded.length / 8);
  for (let i = 0; i < out.length; i++) {
    const chunk = padded.slice(i * 8, i * 8 + 8);
    out[i] = parseInt(chunk, 2);
  }
  return out;
}


export function xorBytesWithKey(bytes, keyBits) {
  const keyBytes = bitStringToBytes(keyBits);
  if (keyBytes.length === 0) throw new Error("Key is not valid.");

  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
}

export function xorRgbaBytesWithKey(rgbaBytes, keyBits) {
  const keyBytes = bitStringToBytes(keyBits);
  if (keyBytes.length === 0) throw new Error("Key is not valid.");

  const out = new Uint8Array(rgbaBytes); // kopya
  let ki = 0;

  for (let i = 0; i < out.length; i += 4) {
    const kb = keyBytes[ki];
    out[i] ^= kb;       // R
    out[i + 1] ^= kb;   // G
    out[i + 2] ^= kb;   // B
    // out[i + 3] alpha sabit
    ki = (ki + 1) % keyBytes.length;
  }
  return out;
}



// File → XOR → dataURL 
export function xorImageFileWithKey(file, keyBits) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      reject(new TypeError("xorImageFileWithKey expects a File/Blob."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        const keyBytes = bitStringToBytes(keyBits);
        if (keyBytes.length === 0) {
          reject("Key is not valid.");
          return;
        }

        let ki = 0;
        for (let i = 0; i < data.length; i += 4) {
          const kb = keyBytes[ki];
          data[i] ^= kb;
          data[i + 1] ^= kb;
          data[i + 2] ^= kb;
          ki = (ki + 1) % keyBytes.length;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject("Image load failed");
      img.src = ev.target.result;
    };
    reader.onerror = () => reject("File read failed");
    reader.readAsDataURL(file);
  });
}
