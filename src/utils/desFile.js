import forge from "node-forge";

function normalizeDesKey(keyStr) {
  const s = (keyStr ?? "").toString();
  if (s.length !== 8) {
    throw new Error("DES key must be exactly 8 characters");
  }
  return s;
}

function u8ToBinaryString(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return s;
}

function binaryStringToU8(s) {
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i) & 0xff;
  return u8;
}

export async function desCbcEncryptBytes(bytes, keyStr) {
  const key = normalizeDesKey(keyStr);
  const iv = forge.random.getBytesSync(8);

  const cipher = forge.cipher.createCipher("DES-CBC", key);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(u8ToBinaryString(bytes)));
  cipher.finish();

  const ct = cipher.output.getBytes();
  const out = binaryStringToU8(iv + ct);
  return out;
}

export async function encryptFileDES(file, keyStr) {
  const buf = await file.arrayBuffer();
  const outBytes = await desCbcEncryptBytes(new Uint8Array(buf), keyStr);
  const blob = new Blob([outBytes], { type: "application/octet-stream" });
  return URL.createObjectURL(blob);
}
