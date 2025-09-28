function bitStringToBytes(bits) {
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

export function xorImageFileWithKey(file, keyBits) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        const keyBytes = bitStringToBytes(keyBits);
        if (keyBytes.length === 0) {
          reject('Invalid or empty key');
          return;
        }

        let ki = 0;
        for (let i = 0; i < data.length; i += 4) {
          data[i] ^= keyBytes[ki];
          data[i + 1] ^= keyBytes[ki];
          data[i + 2] ^= keyBytes[ki];
          ki = (ki + 1) % keyBytes.length;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject('Image load failed');
      img.src = ev.target.result;
    };
    reader.onerror = () => reject('File read failed');
    reader.readAsDataURL(file);
  });
}
