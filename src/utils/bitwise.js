// a = plain Value
// b = key Value
export function xorBits(a = '', b = '') {
  if (!/^[01]*$/.test(a) || !/^[01]*$/.test(b)) {
    return { error: 'Invalid bit string' };
  }
  if (a.length === 0 || b.length === 0) {
    return { error: 'Empty input' };
  }

  // 🔹 Align key to plaintext length
  let A = a;
  let B = b;
  
  if (a.length !== b.length) {
    if (b.length < a.length) {
      // Key is shorter: repeat key to match plaintext length
      B = b.repeat(Math.ceil(a.length / b.length)).slice(0, a.length);
    } else {
      // Key is longer: use only needed key bits (don't pad plaintext)
      B = b.slice(0, a.length);
    }
  }

  let out = '';
  for (let i = 0; i < A.length; i++) {
    out += ((A[i] ^ B[i]) & 1).toString();
  }
  return { value: out };
}
