// a = plain Value
// b = key Value
export function xorBits(a = '', b = '') {
  if (!/^[01]*$/.test(a) || !/^[01]*$/.test(b)) {
    return { error: 'Invalid bit string' };
  }
  if (a.length === 0 || b.length === 0) {
    return { error: 'Empty input' };
  }

  // 🔹 Repeat key to get the same length
  let A = a;
  let B = b;
  if (a.length !== b.length) {
    if (b.length < a.length) {
      // Repeat key
      B = b.repeat(Math.ceil(a.length / b.length)).slice(0, a.length);
    } else {
      // If key is short, pad with zeros
      A = a.padEnd(b.length, '0');
    }
  }

  let out = '';
  for (let i = 0; i < A.length; i++) {
    out += ((A[i] ^ B[i]) & 1).toString();
  }
  return { value: out };
}
