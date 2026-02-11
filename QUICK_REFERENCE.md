# Quick Reference

## Project Layout
```
src/
├── App.js                  # main state + handlers
├── components/nodes/       # ReactFlow nodes
└── utils/                  # computeGraph, validators, crypto
```

## Core Functions
| Function | File | Purpose |
|---|---|---|
| `computeGraphValues()` | utils/computeGraph.js | propagate graph state |
| `runXorHandler()` | utils/cipherHandlers.js | image XOR execution |
| `runCipherHandler()` | utils/cipherHandlers.js | XOR/AES/DES routing |
| `applyMode()` | App.js | load preset & handlers |

## Data Flow (Short)
```
User input → onChange → computeGraphValues → nodes updated → UI
```

## Node Data (Essentials)
```js
PlaintextNode: { inputType: 'bits'|'text'|'image'|'encryptedFile', value: string|File }
KeyNode: { bits: string, keyText?: string }
BlockCipherNode: { cipherType: 'xor'|'aes'|'des', preview?, fullBinary?, keyBits?, plaintextFile? }
CiphertextNode: { result?, fullBinary?, xorBytes? }
```

## Common Errors
| Error | Cause | Fix |
|---|---|---|
| Missing inputs | Plaintext or key missing | Provide both |
| Invalid IV | Not 0/1 or not 8‑bit aligned | Fix IV bits |
| File read failed | Browser read error | Retry or replace file |
| Connection invalid | Connection rules | Check validators |

## Debugging
```js
console.log("valueMap:", valueMap);
console.log("blockcipher nodes:", nodes.filter(n => n.type === "blockcipher").map(n => n.data));
```

**Print this page for quick reference.**
