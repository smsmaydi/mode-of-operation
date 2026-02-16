/** Convert binary string to hex */
export function bitsToHex(bits) {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = bits.substr(i, 4);
    hex += parseInt(nibble, 2).toString(16);
  }
  return hex;
}
