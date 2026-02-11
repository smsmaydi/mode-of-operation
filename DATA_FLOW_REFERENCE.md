# Data Flow Reference

Concise summary of `node.data` and how values move through the graph.

## Node data shapes

### Plaintext
```js
{ inputType: 'text'|'bits'|'image'|'encryptedFile', value, text, bits, file, pixelBytes }
```

### Key
```js
{ bits: '01010101', keyText?: '...' }
```

### IV (CBC)
```js
{ bits: '128-bit-binary-string' }
```

### BlockCipher
```js
{ cipherType: 'xor'|'aes'|'des', preview, fullBinary, keyBits, plaintextFile, error }
```

### Ciphertext
```js
{ result: string, fullBinary?: string, xorBytes?: Uint8Array }
```

### XOR (CBC preXOR)
```js
{ ptInput: '...', pcInput: '...', xorOutput: '...' }
```

### CTR
```js
{ nonceBits: '...', counterBits: '...' }
```

## valueMap
```js
valueMap.set(nodeId, { type, value, keyBits? })
```

## Update cycle
```
User input  onChange  setNodes
   computeGraphValues  updated nodes  UI render
```

## Image path (XOR/AES/DES)
```
File input  fileToPixelBytes()  Uint8Array RGBA
Run button  onRunCipher()  util encryption  data URL
```

## Validation highlights
- Bits must match /^[01]+$/ and be divisible by 8.
- CBC requires a previous cipher/IV edge; otherwise falls back to ECB behavior.
