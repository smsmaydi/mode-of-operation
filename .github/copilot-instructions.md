
## Project Overview
**Mode of Operation Visualization** - A React-based educational tool built with ReactFlow that visualizes cryptographic block cipher modes (ECB, CBC, CTR) and encryption operations (XOR, AES, DES). Users construct visual data flow graphs to understand how plaintext, keys, and IVs interact through cipher blocks to produce ciphertext.

## Architecture

### Core Technology Stack
- **React 19** with ReactFlow 11 for graph visualization
- **Create React App** tooling with `npm start/build/test`
- **Cryptography**: crypto-js (AES/DES), node-forge, Web Crypto API
- **Styling**: Bootstrap 5 + CSS modules
- **Deployment**: GitHub Pages (`npm run deploy`)

### Component Structure
```
src/
├── App.js (main state container with ReactFlow graph)
├── components/
│   ├── nodes/ (ReactFlow node components)
│   │   ├── PlaintextNode.jsx (text/bits/image input)
│   │   ├── KeyNode.jsx (128/256-bit keys)
│   │   ├── BlockCipherNode.jsx (router for XOR/AES/DES)
│   │   ├── CiphertextNode.jsx (output display)
│   │   └── IVNode.jsx (initialization vector for CBC)
│   ├── palette/ (NodePalette.jsx - drag-drop node creation)
│   ├── layout/ (ModeMenu.jsx - mode selector)
│   └── crypto/ (imageToBytes.js - image processing)
└── utils/
    ├── computeGraph.js (state propagation engine)
    ├── presets.js (ECB/CBC/CTR initial layouts)
    ├── validators.js (connection rules engine)
    ├── aesFile.js, desFile.js (AES-GCM/DES encryption)
    ├── imageXor.js, xorImageFile.js (XOR pixel operations)
    └── bytesToDataUrl.js (output rendering)
```

### Data Flow Model
**Graph Execution Pattern** - Mode-dependent computation:

1. **Node Input** → Plaintext/Key/IV values stored in `node.data`
2. **Graph Traversal** → `computeGraph()` walks edges from sources to BlockCipher nodes
3. **Mode-Specific Logic**:
   - **ECB**: `plaintext ⊕ key` (direct XOR on each block)
   - **CBC**: `plaintext ⊕ prevCiphertext ⊕ key` (chaining via prevCipher edge)
   - **CTR**: Currently uses ECB preset
4. **Output Update** → CiphertextNode receives `data.result` (PNG URL) and `data.xorBytes` (raw bytes)

### Critical Edge Cases
- **File vs Text Input**: PlaintextNode accepts bits/text/image; image path differs from `computeGraph` text/bits paths
- **CBC Chaining**: Requires prevCipher edge; falls back to ECB if missing
- **Bitstring Validation**: Must be string type and divisible by 8; see `validators.js` baseRules()
- **Image Dimensions**: Hardcoded 256×256; resize-observer-polyfill included for compatibility

## Development Workflows

### Start Development
```bash
npm start
# Opens http://localhost:3000, watches for changes
```

### Build for Deployment
```bash
npm run build          # Optimized production bundle to build/
npm run deploy         # Pushes to GitHub Pages
```

### Testing
```bash
npm test               # Jest in watch mode (CRA default)
# No existing test files; uses @testing-library/react
```

### Debugging Cryptography
- XOR operations log with emoji prefixes: 🎯, 🔍, 🔐, ✅, ❌
- Search `console.log` in App.js (lines 59-200) for encryption traces
- Image byte conversions logged in `onRunXor()` callback
- Key validation occurs in BlockCipherNode before encryption

## Project Patterns & Conventions

### Node Data Structure
```javascript
// Plaintext node
{ type: 'plaintext', data: { inputType: 'bits'|'text'|'image', value: string|File } }

// BlockCipher node (stores computed results)
{ type: 'blockcipher', data: { cipherType: 'xor'|'aes'|'des', preview: dataUrl, xorBytes: Uint8Array } }

// Ciphertext output node
{ type: 'ciphertext', data: { result: dataUrl, xorBytes: Uint8Array } }
```

### Connection Validation
Defined in `makeIsValidConnection(mode)` → returns validator function:
- Base rules: Plaintext→BlockCipher, Key→BlockCipher, BlockCipher→Ciphertext
- ECB rules: No chaining allowed
- CBC rules: Ciphertext.prevCipher or IV.prevCipher edges permitted

### State Management Pattern
- `useNodesState()` / `useEdgesState()` from ReactFlow manage graph state
- `computeGraph()` called on every state change to recompute values
- `setNodes()` callback spreads updated node data (immutable updates only)

### Input Type Conversion
- **Text** → Binary: `textToBinary()` converts each char to 8-bit ASCII
- **Bits** → Validation: Must match `/^[01]+$/` and be divisible by 8
- **Image** → Bytes: `fileToPixelBytes()` reads File object, extracts RGBA pixels

## Integration Points

### External Libraries
- **reactflow**: graph rendering, node/edge management, handles, positioning
- **crypto-js**: AES/DES fallback implementations (node-forge primary)
- **node-forge**: Primary cryptography for DES when crypto-js unavailable
- **Web Crypto API**: AES-GCM in `aesFile.js` (via `crypto.subtle`)
- **Bootstrap 5**: Button/select/layout components
- **gh-pages**: Deployment automation

### File I/O & Images
- Images accepted via file input → converted to Uint8Array of RGBA values
- Output as PNG DataURL → embedded directly in CiphertextNode
- Pixel dimensions fixed at 256×256; consider parameterizing if needed

## Common Tasks

### Adding a New Cipher Algorithm
1. Create handler in `App.js` onRunCipher (e.g., `onRunNewCipher()`)
2. Add preset in `presets.js` if it requires IV or special node layout
3. Update `BlockCipherNode.jsx` select options and labels
4. Implement encryption in new util file (e.g., `utils/newCipherFile.js`)
5. Test with `makeIsValidConnection()` rules for your mode

### Debugging Graph State
- Log `nodes` and `edges` in `onNodesChange`/`onEdgesChange` callbacks
- Use `computeGraph()` console output (look for ✅ success markers)
- Verify edge IDs match: `source`, `sourceHandle`, `target`, `targetHandle` must align with node definitions

### Modifying Image Processing
- Pixel byte format: Each pixel is 4 bytes (RGBA)
- Scaling happens in `fileToPixelBytes()` (256×256 hardcoded)
- Output via `rgbaBytesToPngDataUrl()` → requires canvas API

## Deployment
- Push to main branch → GitHub Actions (if configured) or manual:
- Run `npm run deploy` to publish to `gh-pages` branch
- Site URL: `https://smsmaydi.github.io/mode-of-operation` (from package.json homepage)
