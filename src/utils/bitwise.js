export function xorBits(a = '', b = '') {
  if (!/^[01]*$/.test(a) || !/^[01]*$/.test(b)) {
    return { error: 'Geçersiz bit dizisi' };
  }
  if (a.length === 0 || b.length === 0) {
    return { error: 'Boş giriş' };
  }

  // 🔹 Key'i tekrar ederek uzunluk eşitle
  let A = a;
  let B = b;
  if (a.length !== b.length) {
    if (b.length < a.length) {
      // key'i tekrar et
      B = b.repeat(Math.ceil(a.length / b.length)).slice(0, a.length);
    } else {
      // plaintext kısa → plaintext'i pad'le
      A = a.padEnd(b.length, '0');
    }
  }

  let out = '';
  for (let i = 0; i < A.length; i++) {
    out += ((A[i] ^ B[i]) & 1).toString();
  }
  return { value: out };
}
