import { xorBits } from './bitwise';

/**
 * Bit string key'i Uint8Array'e dönüştürür.
 * Örn: "01010101" -> [0x55]
 */
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

/**
 * Text'i binary string'e çevirir.
 */
function textToBinary(str) {
  return Array.from(str)
    .map(ch => ch.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('');
}

/**
 * Binary string'i tekrar text'e çevirir.
 */
function binaryToText(binStr) {
  const chars = [];
  for (let i = 0; i < binStr.length; i += 8) {
    const byte = binStr.slice(i, i + 8);
    if (byte.length === 8) {
      chars.push(String.fromCharCode(parseInt(byte, 2)));
    }
  }
  return chars.join('');
}

/**
 * Image File'ı alır, canvas'a çizer, key ile XOR'lar, dataURL döner.
 */
async function xorImageFileWithKey(file, keyBits) {
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
          reject('Key geçersiz');
          return;
        }

        let ki = 0;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = data[i] ^ keyBytes[ki];     // R
          data[i + 1] = data[i + 1] ^ keyBytes[ki]; // G
          data[i + 2] = data[i + 2] ^ keyBytes[ki]; // B
          ki = (ki + 1) % keyBytes.length;
        }

        ctx.putImageData(imageData, 0, 0);
        const outUrl = canvas.toDataURL('image/png');
        resolve(outUrl);
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function computeGraphValues(nodes, edges) {
  const valueMap = new Map();
  const incoming = (id) => edges.filter(e => e.target === id);

  // 🔹 Plaintext & Key değerleri
  nodes.forEach(n => {
    if (n.type === 'plaintext') {
      let normVal = null;

      if (n.data.inputType === 'bits') {
        normVal = n.data.value || '';
      } else if (n.data.inputType === 'text') {
        normVal = textToBinary(n.data.value || '');
      } else if (n.data.inputType === 'image') {
        normVal = n.data.value; // File objesi
      }

      valueMap.set(n.id, { type: n.data.inputType, value: normVal });
    }

    if (n.type === 'key') {
      valueMap.set(n.id, { type: 'bits', value: n.data.bits || '' });
    }
  });

  // 🔹 BlockCipher
  nodes.forEach(n => {
    if (n.type === 'blockcipher') {
      const inc = incoming(n.id);
      const pEdge = inc.find(e => e.targetHandle === 'plaintext');
      const kEdge = inc.find(e => e.targetHandle === 'key');

      const pVal = pEdge ? valueMap.get(pEdge.source)?.value : undefined;
      const pType = pEdge ? valueMap.get(pEdge.source)?.type : undefined;
      const kVal = kEdge ? valueMap.get(kEdge.source)?.value : undefined;

      if (!pVal || !kVal) {
        n.data = { ...n.data, preview: 'Eksik giriş' };
      } else if (pType === 'bits' || pType === 'text') {
        // bit veya text için XOR
        const res = xorBits(pVal, kVal);
        if (res.error) {
          n.data = { ...n.data, error: res.error, preview: undefined };
        } else {
          let outVal = res.value;
          if (pType === 'text') {
            outVal = binaryToText(res.value); // tekrar text'e çevir
          }
          n.data = { ...n.data, error: undefined, preview: `out=${outVal}` };
          valueMap.set(n.id, { type: pType, value: outVal });
        }
      } else if (pType === 'image' && pVal instanceof File) {
        // image için async XOR
        xorImageFileWithKey(pVal, kVal).then((dataUrl) => {
          n.data = { ...n.data, error: undefined, preview: 'Image XOR ready', outUrl: dataUrl };
          valueMap.set(n.id, { type: 'image', value: dataUrl });
        }).catch((err) => {
          n.data = { ...n.data, error: String(err), preview: undefined };
        });
      }
    }
  });

  // 🔹 Ciphertext
  nodes.forEach(n => {
    if (n.type === 'ciphertext') {
      const inc = incoming(n.id);
      const eIn = inc.find(e => e.targetHandle === 'in');
      if (eIn) {
        const val = valueMap.get(eIn.source)?.value;
        n.data = { ...n.data, result: val || '—' };
      }
    }
  });

  return nodes;
}
