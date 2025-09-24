import { xorBits } from './bitwise';

export function computeGraphValues(nodes, edges) {
  const valueMap = new Map();
  const incoming = (id) => edges.filter(e => e.target === id);

  // Plaintext & Key node değerleri
  nodes.forEach(n => {
    if (n.type === 'plaintext' || n.type === 'key') {
      valueMap.set(n.id, { value: n.data.bits || '' });
    }
  });

  // BlockCipher
  nodes.forEach(n => {
    if (n.type === 'blockcipher') {
      const inc = incoming(n.id);
      const pEdge = inc.find(e => e.targetHandle === 'plaintext');
      const kEdge = inc.find(e => e.targetHandle === 'key');

      const pVal = pEdge ? valueMap.get(pEdge.source)?.value : undefined;
      const kVal = kEdge ? valueMap.get(kEdge.source)?.value : undefined;

      if (!pVal || !kVal) {
        n.data = { ...n.data, preview: 'Eksik giriş' };
      } else {
        const res = xorBits(pVal, kVal);
        if (res.error) {
          n.data = { ...n.data, error: res.error, preview: undefined };
        } else {
          n.data = { ...n.data, error: undefined, preview: `out=${res.value}` };
          valueMap.set(n.id, { value: res.value });
        }
      }
    }
  });

  // Ciphertext
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
