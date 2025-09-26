export function xorBits(a = '', b = '') {
  if (a.length !== b.length) {
    return { error: `Uzunluklar eşit olmalı (${a.length} ≠ ${b.length})` };
  }
  let out = '';
  for (let i = 0; i < a.length; i++) {
    if ((a[i] !== '0' && a[i] !== '1') || (b[i] !== '0' && b[i] !== '1')) {
      return { error: 'Not valid' };
    }
    // xor operation
    out += (a[i] ^ b[i]).toString();
  }
  return { value: out };
}
