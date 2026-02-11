# Mode of Operation Visualization

A React + ReactFlow educational tool that visualizes block cipher modes (ECB, CBC, CTR) and encryption operations (XOR, AES, DES). Users build data‑flow graphs to see how plaintext, keys, and IVs combine to produce ciphertext.

## Key Features
- Drag‑and‑drop nodes with ReactFlow
- ECB/CBC/CTR presets
- XOR/AES/DES routing
- Image mode encryption/decryption
- Download encrypted `.enc` files

## Tech Stack
- React 19 + ReactFlow 11
- crypto-js / Web Crypto API
- Bootstrap 5
- Create React App

## Quick Start
```bash
npm install
npm start
```
Open http://localhost:3000.

## Scripts
- `npm start` — dev server
- `npm test` — tests
- `npm run build` — production build
- `npm run deploy` — GitHub Pages

## Documentation
- [GETTING_STARTED.md](GETTING_STARTED.md)
- [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- [COMPREHENSIVE_CODE_GUIDE.md](COMPREHENSIVE_CODE_GUIDE.md)
- [DATA_FLOW_REFERENCE.md](DATA_FLOW_REFERENCE.md)
- [UML_DIAGRAMS.md](UML_DIAGRAMS.md)
