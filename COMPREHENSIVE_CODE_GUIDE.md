# Comprehensive Code Guide

This guide summarizes the architecture, data flow, and key modules.

## Architecture

## Data Flow
1. User input updates node data.
2. `setNodes` triggers `computeGraphValues`.
3. BlockCipher prepares outputs.
4. Ciphertext renders result.

## Modes

## Key Functions

## Extending
# Mode of Operation Visualization — Code Guide

Concise guide to the project structure and core flow.

## Architecture

```
src/
  App.js
  components/
    nodes/ (Plaintext, Key, IV, BlockCipher, Ciphertext, CTR, XOR)
    layout/ (ModeMenu, edges)
    palette/ (NodePalette)
    crypto/ (imageToBytes)
  utils/
    computeGraph.js
    validators.js
    presets.js
    aesFile.js, desFile.js, imageXor.js, xorImageFile.js
    bytesToDataUrl.js, bitwise.js
```

## Data flow

1. User updates node input.
2. `computeGraphValues()` builds `valueMap` and computes node outputs.
3. UI re-renders with updated `node.data`.
4. For image input, user clicks Run → `onRunCipher()` executes and updates output.

## Core functions

- `computeGraphValues()` — main state propagation.
- `onRunCipher()` — routes to XOR/AES/DES handlers.
- `onRunXor()` — image XOR path (supports CBC chaining).
- `applyMode()` — loads ECB/CBC/CTR presets.

## Node data (summary)

- Plaintext: `inputType`, `value`, `bits`, `text`, `file`.
- Key: `bits`.
- IV: `bits`.
- BlockCipher: `cipherType`, `preview`, `fullBinary`, `plaintextFile`, `keyBits`.
- Ciphertext: `result`, `fullBinary`, `xorBytes`.

## Modes

- **ECB:** $C = P \oplus K$
- **CBC:** $C_i = (P_i \oplus C_{i-1}) \oplus K$ (IV for $C_0$)
- **CTR:** $C = P \oplus Keystream$ (nonce+counter)

## References

- Data flow details: [DATA_FLOW_REFERENCE.md](DATA_FLOW_REFERENCE.md)
- Diagram overview: [UML_DIAGRAMS.md](UML_DIAGRAMS.md)# 📚 Mode of Operation Visualization — Comprehensive Code Guide (EN)

## Table of Contents
1. [Project Architecture](#project-architecture)
2. [Data-Flow Model](#data-flow-model)
3. [Core Functions (Detailed)](#core-functions-detailed)
4. [Node Data Structures](#node-data-structures)
5. [Cipher Modes (ECB/CBC/CTR)](#cipher-modes-ecbcbcctr)
6. [UML Diagrams (Overview)](#uml-diagrams-overview)

---

## Project Architecture

### Folder Layout

```
src/
├── App.js                           # Main state container + ReactFlow
├── components/
│   ├── nodes/                       # ReactFlow node components
│   │   ├── PlaintextNode.jsx       # text/bits/image input
│   │   ├── KeyNode.jsx              # key input
│   │   ├── BlockCipherNode.jsx      # XOR/AES/DES switch
│   │   ├── CiphertextNode.jsx       # output display
│   │   ├── IVNode.jsx               # CBC IV input
│   │   ├── XorPreBlockNode.jsx      # CBC pre-XOR
# 📚 Mode of Operation Visualization — Comprehensive Code Guide (EN)

│   ├── crypto/
│   │   └── imageToBytes.js          # file → pixel bytes
│   ├── layout/
│   │   ├── ModeMenu.jsx             # mode selector
│   │   ├── StepEdge.jsx             # edge renderer
│   │   └── SineEdge.jsx             # edge renderer
│   └── palette/
│       └── NodePalette.jsx          # drag & drop palette

    ├── computeGraph.js              # ⭐ state propagation engine
    ├── validators.js                # connection rules
    ├── bitwise.js                   # bit XOR helpers
    ├── presets.js                   # ECB/CBC/CTR presets
    ├── imageXor.js                  # XOR image operations
    ├── xorImageFile.js              # file XOR helpers
    ├── aesFile.js                   # AES encrypt/decrypt
    ├── desFile.js                   # DES encrypt/decrypt
    ├── bytesToDataUrl.js            # bytes → PNG data URL
    ├── ecbTrace.js                  # block trace
    └── nodeHelpers.js               # utilities
```

---

## Data-Flow Model

### High-Level Flow

```
User Input (text/bits/image) → Plaintext/Key/IV nodes
                       ↓
             computeGraphValues()
    - build valueMap
    - XOR nodes (CBC)
    - BlockCipher nodes
    - Ciphertext nodes
                       ↓
             UI updated in ReactFlow
```

### Mode-Specific Logic

- **ECB:** $C = P \oplus K$
- **CBC:** $C_i = (P_i \oplus C_{i-1}) \oplus K$ (first block uses IV)
- **CTR:** $Keystream = (Nonce || Counter) \oplus K$, $C = P \oplus Keystream$

---

## Core Functions (Detailed)

### `onRunXor(blockId, currentNodes, currentEdges, currentMode)`

**Purpose:** Execute XOR encryption for image input.

**Steps:**
1. Read image file to RGBA bytes (256×256).
2. If CBC, resolve previous bytes from IV or previous ciphertext.
3. XOR plaintext bytes with previous bytes (CBC) and key bits.
4. Convert result to PNG data URL.
5. Update `BlockCipherNode.data.preview` and `CiphertextNode.data.result`.

---

### `onRunCipher(blockId)`

**Purpose:** Route execution based on cipher type.

- `xor` → `onRunXor()`
- `aes` → `encryptFileAES()` / `decryptFileAES()`
- `des` → `encryptFileDES()` / `decryptFileDES()`

---

### `applyMode(m)`

**Purpose:** Switch to ECB/CBC/CTR presets.

1. Load preset nodes/edges.
2. Inject handlers (`onChange`, `onRunCipher`).
3. Recompute graph values.
4. Update ReactFlow state.

---



**Purpose:** The main state engine.

**Algorithm:**
1. Build `valueMap` for plaintext/key/IV/CTR.
2. Process XOR nodes (CBC only).
3. Process BlockCipher nodes (text/bits immediate; images prepared).
4. Update Ciphertext nodes with results.


---

## Node Data Structures

### PlaintextNode
```js
{
  inputType: 'bits' | 'text' | 'image' | 'encrypted',

  onChange,
  showHandleLabels
}
```

### KeyNode
```js
{
  bits: string,
  onChange,
  showHandleLabels

```

### BlockCipherNode
```js
{
  cipherType: 'xor' | 'aes' | 'des',
  preview?: string,
  fullBinary?: string,
  plaintextFile?: File,
  encryptedFile?: File,
  keyBits?: string,
  onRunCipher,
  onChange
}
```

### CiphertextNode
```js
{
  result?: string,         // text or data URL
  fullBinary?: string,
  xorBytes?: Uint8Array
}
```

---

## Cipher Modes (ECB/CBC/CTR)

### ECB
```
Plaintext ─┐
           ├─ XOR → BlockCipher → Ciphertext
Key ───────┘
```

### CBC
```
Plaintext ─┐
           ├─ XOR(pre) → BlockCipher → Ciphertext
IV/Prev ───┘
```

### CTR

Nonce||Counter ─┐
               ├─ XOR → Keystream
Key ───────────┘
Plaintext ⊕ Keystream → Ciphertext
```

---

## UML Diagrams (Overview)

See [UML_DIAGRAMS.md](UML_DIAGRAMS.md) for detailed sequence, state, and activity diagrams.

### ECB vs CBC vs CTR Modunda Data Akışı

#### **ECB (Electronic Codebook)**
```
Plaintext ──┐
            ├─→ XOR ──→ BlockCipher ──→ Ciphertext
Key ────────┘
```
- Basit: Her blok bağımsız olarak şifrelenir
- `plaintext ⊕ key`

#### **CBC (Cipher Block Chaining)**
```
Plaintext ──┐
            ├─→ XOR ──→ BlockCipher ──→ Ciphertext₁
IV ─────────┘         │
                      └─────────┐
                                │
Plaintext₂ ──────┐              │
                 ├─→ XOR ──→ BlockCipher ──→ Ciphertext₂
Key ─────────────┘              │
Ciphertext₁ ────────────────────┘
```
- Zincir: Her bloğun girişi önceki çıktıya XOR'lanır
- İlk blok: `plaintext ⊕ IV ⊕ key`
- Sonraki: `plaintext ⊕ prevCiphertext ⊕ key`

#### **CTR (Counter Mode)**
```
Nonce||Counter ──┐
                 ├─→ BlockCipher ──→ Keystream
Key ─────────────┘         │
                           ▼
                      Plaintext ⊕ Keystream → Ciphertext
```
- Akış şifresi: Nonce + Counter → Keystream
- `plaintext ⊕ keystream`

---

## Tüm Fonksiyonlar Detayı

### 1. **App.js - Ana Uygulama**

#### `onRunXor(blockId, currentNodes, currentEdges, currentMode)`
```javascript
// Amaç: XOR şifrelemeyi çalıştır (metin veya resim)
// Giriş:
//  - blockId: BlockCipher node ID'si
//  - currentNodes: Tüm node'lar
//  - currentEdges: Tüm bağlantılar
//  - currentMode: "ecb" | "cbc" | "ctr"

// Çıkış: BlockCipher ve CiphertextNode'ları güncelle
//  - node.data.preview: PNG data URL
//  - node.data.xorBytes: Uint8Array (raw sonuç)
```

**İç Mantık:**
1. BlockCipher node'ı bul
2. Plaintext dosya ve key bits'i al
3. File → Pixel bytes (256×256 RGBA)
4. **CBC Modu**: Önceki ciphertext/IV'yi bul
5. XOR İşlem:
   - ECB: `plaintext ⊕ key`
   - CBC: `(plaintext ⊕ prevBytes) ⊕ key`
6. Sonucu PNG'ye dönüştür
7. BlockCipher + CiphertextNode'ları güncelle

**Key Kod Parçacığı:**
```javascript
const onRunXor = useCallback(async (blockId, currentNodes, currentEdges, currentMode) => {
  const block = currentNodes.find((n) => n.id === blockId);
  const fileInput = block.data.plaintextFile; 
  const keyBits = block.data.keyBits;
  
  // Resim → Pixel bytes
  const input = await fileToPixelBytes(fileInput, { width: 256, height: 256 });
  
  // CBC: Önceki ciphertext/IV
  let prevBytes = null;
  if (currentMode === 'cbc') {
    // ... IV veya previousCiphertext bul ...
  }
  
  // XOR
  let outBytes;
  if (currentMode === 'cbc' && prevBytes) {
    const withPrev = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
      withPrev[i] = input[i] ^ prevBytes[i % prevBytes.length];
    }
    outBytes = xorRgbaBytesWithKey(withPrev, keyBits);
  } else {
    outBytes = xorRgbaBytesWithKey(input, keyBits);
  }
  
  // Sonuç
  const outUrl = rgbaBytesToPngDataUrl(outBytes, 256, 256);
  setNodes((nds) => nds.map((n) => {
    if (n.id === blockId) return { ...n, data: { ...n.data, preview: outUrl, xorBytes: outBytes } };
    if (ctId && n.id === ctId) return { ...n, data: { ...n.data, result: outUrl, xorBytes: outBytes } };
    return n;
  }));
}, [setNodes]);
```

---

#### `onRunCipher(blockId)`
```javascript
// Amaç: XOR/AES/DES şifrelemeyi yönlendir ve çalıştır
// Giriş: blockId = BlockCipher node'un ID'si
// Çıkış: İlgili cipher fonksiyonunu çağır

// Akış:
// 1. BlockCipher node'ını bul
// 2. cipherType (xor|aes|des) kontrol et
// 3. İmage modu mu text modu mu?
// 4. Uygun cipher fonksiyonunu çağır
```

**Desteklenen Cipher'lar:**
- **XOR**: `onRunXor()` → Hızlı, öğretimsel
- **AES**: `encryptFileAES()` / `decryptFileAES()` → Web Crypto API
- **DES**: `encryptFileDES()` / `decryptFileDES()` → node-forge

---

#### `applyMode(m)` - Mod Değiştir
```javascript
// Amaç: ECB/CBC/CTR mod yükle ve başlat
// Giriş: m = "ecb" | "cbc" | "ctr"

// İşlemler:
// 1. setMode(m) ile state güncelle
// 2. buildPreset(m) ile başlangıç layout yükle
// 3. Tüm node'lara onChange/onRunCipher handler'ı ekle
// 4. setNodes() + setEdges() ile ReactFlow'a uygula
```

**Event Handler'ları Enjekte Eden Nodes:**
```javascript
// PlaintextNode/KeyNode/IV/CTR
data: {
  ...n.data,
  onChange: (id, patch) => {
    setNodes((nds) => {
      const next = nds.map((nn) =>
        nn.id === id ? { ...nn, data: { ...nn.data, ...patch } } : nn
      );
      return computeGraphValues(next, preset.edges, m);
    });
  }
}

// BlockCipherNode
data: {
  ...n.data,
  onRunCipher,  // ← Şifreleme fonksiyonu
  onChange: (id, patch) => { ... }
}
```

---

#### `isValidConnection(params)` - Bağlantı Doğrulama
```javascript
// Amaç: İki node arasında geçerli bir kenar kurulabilir mi?
// Giriş: params = { source, target, sourceHandle, targetHandle }
// Çıkış: boolean

// Çağırır: makeIsValidConnection(mode)(params, nodes)
// Kural dosyası: validators.js
```

---

#### `onConnect(params)` - Yeni Kenar Ekle
```javascript
// Amaç: Yeni bağlantı oluştur ve state'i güncelle
// Giriş: params = kenar tanımı
// Çıkış: Edge'i edges'e ekle, computeGraph() çalıştır

const onConnect = useCallback((params) => {
  if (!isValidConnection(params)) return;
  setEdges((eds) => {
    const next = addEdge(params, eds);
    setNodes((nds) => computeGraphValues(nds, next, mode));
    return next;
  });
}, [isValidConnection]);
```

---

#### `onDrop(event)` - Sürükle-Bırak Node Oluştur (Free Mode)
```javascript
// Amaç: Canvas'a yeni node ekle
// Giriş: Drag-drop event
// Çıkış: Yeni node ID'si oluştur, setNodes() ile ekle

// Sadece mode === "free" olduğunda çalışır
// Her yeni node'a onChange handler'ı ekle
```

---

#### `handleNodesChange(changes)` - Node Pozisyon/Seçim Değişim
```javascript
// Amaç: Node hareketi veya değişim yönet
// Giriş: ReactFlow changes array
// Çıkış: 
//   1. onNodesChange(changes) → ReactFlow state güncelle
//   2. computeGraphValues() → Dependent values yeniden hesapla

const handleNodesChange = useCallback((changes) => {
  onNodesChange(changes);
  setNodes((nds) => {
    const updated = computeGraphValues(nds, edges, mode);
    return updated.map(n => ({
      ...n,
      data: { ...n.data, mode, showHandleLabels }
    }));
  });
}, [onNodesChange, edges, mode]);
```

---

### 2. **computeGraph.js - ⭐ Ana State Engine**

#### `computeGraphValues(nodes, edges, mode)`
```javascript
// ⭐ En önemli fonksiyon!
// Amaç: Tüm node'ların data'sını hesapla ve güncelle
// Giriş: nodes array, edges array, mode string
// Çıkış: Güncellenen nodes array (yeni referans)

// Algoritma:
// 1. valueMap Map() oluştur → {nodeId → {type, value}}
// 2. PlaintextNode'ları process et → text/bits/image type
// 3. KeyNode'ları process et → bits
// 4. IVNode'ları process et → bits
// 5. XOR node'ları (CBC) → plaintext ⊕ prevCipher/IV
// 6. BlockCipher node'ları → cipher işlemi uygula
// 7. Ciphertext node'ları → output doldur
// 8. Tüm node'ları return (değişenleri yeni referans ile)
```

**Detaylı Akış:**

##### Step 1-3: Kaynak Node'lar (Plaintext, Key, IV)
```javascript
// PlaintextNode
nodes.forEach((n) => {
  if (n.type === "plaintext") {
    let normVal = null;
    
    if (n.data.inputType === "bits") {
      normVal = n.data.value || null;  // Bitstring
    } else if (n.data.inputType === "text") {
      normVal = textToBinary(n.data.value);  // Text → Binary
    } else if (n.data.inputType === "image") {
      normVal = n.data.value;  // File object
    }
    
    valueMap.set(n.id, { type: n.data.inputType, value: normVal });
  }
  
  // KeyNode
  if (n.type === "key") {
    const normVal = n.data.bits || null;
    valueMap.set(n.id, { type: "bits", value: normVal });
  }
  
  // IVNode
  if (n.type === "iv") {
    const normVal = n.data.bits || null;
    valueMap.set(n.id, { type: "bits", value: normVal });
  }
});
```

**valueMap Yapısı:**
```javascript
Map {
  'p1' → { type: 'bits', value: '10110010' },
  'k1' → { type: 'bits', value: '01010101' },
  'iv1' → { type: 'bits', value: '11110000' }
}
```

---

##### Step 5: XOR Node'ları (CBC Modu)
```javascript
// XOR node: plaintext ve previousCiphertext/IV'yi XOR'la
nodes.forEach((n) => {
  if (n.type === "xor") {
    const inc = incoming(n.id);  // n.id'ye gelen kenarlar
    const ptEdge = inc.find((e) => e.targetHandle === "pt");   // plaintext
    const pcEdge = inc.find((e) => e.targetHandle === "pc");   // prevCipher/IV
    
    const ptVal = ptEdge ? valueMap.get(ptEdge.source)?.value : null;
    const pcVal = pcEdge ? valueMap.get(pcEdge.source)?.value : null;
    
    // Image modu mu?
    if (ptType === "image" || ptType === "encrypted") {
      n.data = { ...n.data, preview: "File mode - click Run on BlockCipher" };
      return;
    }
    
    // XOR işlem
    if (ptVal && pcVal) {
      const xorResult = xorBits(ptVal, pcVal);
      n.data = { 
        ...n.data, 
        xorOutput: xorResult.value,
        ptInput: ptVal,
        pcInput: pcVal
      };
      valueMap.set(n.id, { type: "bits", value: xorResult.value });
    }
  }
});
```

---

##### Step 6: BlockCipher Node'ları
```javascript
// BlockCipher: plaintext, key, prevCipher (CBC) al → XOR veya AES/DES
nodes.forEach((n) => {
  if (n.type === "blockcipher") {
    const inc = incoming(n.id);
    const pEdge = inc.find((e) => e.targetHandle === "plaintext");
    const kEdge = inc.find((e) => e.targetHandle === "key");
    const prevEdge = inc.find((e) => e.targetHandle === "prevCipher");
    
    const pVal = pEdge ? valueMap.get(pEdge.source)?.value : null;
    const pType = pEdge ? valueMap.get(pEdge.source)?.type : null;
    const kVal = kEdge ? valueMap.get(kEdge.source)?.value : null;
    const prevVal = prevEdge ? valueMap.get(prevEdge.source)?.value : null;
    
    // Gerekli input'lar var mı?
    if (!pVal || !kVal) {
      n.data = { ...n.data, error: undefined, preview: "", fullBinary: undefined };
      return;
    }
    
    // Image modu → File object depola (onRunXor'da işlenecek)
    if (pType === "image") {
      n.data = {
        ...n.data,
        preview: "Ready for Run XOR",
        plaintextFile: pVal,
        keyBits: kVal,
        inputType: "image"
      };
      valueMap.set(n.id, { type: "image", value: pVal, keyBits: kVal });
      return;
    }
    
    // Text/Bits modu → Hemen hesapla
    let computed;
    if (mode === 'cbc' && prevVal) {
      // CBC: plaintext ⊕ prevCiphertext ⊕ key
      const t = xorBits(pVal, prevVal);
      computed = xorBits(t, kVal);
    } else {
      // ECB: plaintext ⊕ key
      computed = xorBits(pVal, kVal);
    }
    
    if (computed.error) {
      n.data = { ...n.data, error: computed.error, preview: undefined };
    } else {
      const outBits = computed.value;
      n.data = {
        ...n.data,
        error: undefined,
        preview: `out: ${binaryToText(outBits)}\nbin:\n${formatBinary}`,
        fullBinary: outBits
      };
      valueMap.set(n.id, { type: "bits", value: outBits });
    }
  }
});
```

**BlockCipher node.data Yapısı:**
```javascript
// Text/Bits modu
{
  cipherType: "xor",
  preview: "out: C\nbin:\n01000011  C",
  fullBinary: "01000011",
  error: undefined
}

// Image modu
{
  cipherType: "xor",
  preview: "Ready for Run XOR",
  plaintextFile: File { name: "image.png" },
  keyBits: "01010101",
  inputType: "image"
}

// AES modu
{
  cipherType: "aes",
  preview: "data:image/png;base64,...",
  encryptedBlobUrl: "blob:...",
  keyBits: "1010...1010"
}
```

---

##### Step 7: Ciphertext Node'ları
```javascript
// Ciphertext: BlockCipher'dan veri al ve göster
nodes.forEach((n) => {
  if (n.type === "ciphertext") {
    const inc = incoming(n.id);
    const connectedBlockEdge = inc.find((e) => {
      const src = nodes.find((b) => b.id === e.source);
      return src?.type === "blockcipher";
    });
    
    const block = connectedBlockEdge
      ? nodes.find((b) => b.id === connectedBlockEdge.source)
      : null;
    
    if (!block || !block.data) {
      n.data = { ...n.data, result: "", fullBinary: undefined };
    } else {
      // Resim mi text mi?
      const isImage = block.data.preview?.startsWith("data:image");
      
      if (isImage) {
        n.data = { ...n.data, result: block.data.preview };
        valueMap.set(n.id, { type: "image", value: block.data.preview });
      } else if (block.data.fullBinary) {
        n.data = {
          ...n.data,
          result: block.data.preview,
          fullBinary: block.data.fullBinary
        };
        valueMap.set(n.id, { type: "bits", value: block.data.fullBinary });
      }
    }
  }
});
```

**Ciphertext node.data Yapısı:**
```javascript
{
  result: "out: C\nbin:\n01000011  C",
  fullBinary: "01000011",
  xorBytes: Uint8Array [ 67 ],  // Image modu için
  image: null
}
```

---

#### Yardımcı Fonksiyonlar

##### `textToBinary(str)`
```javascript
// "A" → "01000001"
// Her karakteri 8-bit ASCII'ye dönüştür
function textToBinary(str) {
  return Array.from(str)
    .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("");
}
```

##### `binaryToText(binStr)`
```javascript
// "01000001" → "A"
// Her 8 bit'i karaktere dönüştür
function binaryToText(binStr) {
  const chars = [];
  for (let i = 0; i < binStr.length; i += 8) {
    const byte = binStr.slice(i, i + 8);
    if (byte.length === 8) {
      chars.push(String.fromCharCode(parseInt(byte, 2)));
    }
  }
  return chars.join("");
}
```

---

### 3. **validators.js - Bağlantı Kuralları**

#### `makeIsValidConnection(mode)`
```javascript
// Amaç: Mode-spesifik bağlantı kurallarını döndür
// Giriş: mode = "ecb" | "cbc" | "ctr"
// Çıkış: Doğrulama fonksiyonu

export function makeIsValidConnection(mode) {
  return (params, nodes) => {
    const sourceNode = nodes.find((n) => n.id === params.source);
    const targetNode = nodes.find((n) => n.id === params.target);
    
    // Temel kurallar (tüm modlar)
    if (baseRules(params, nodes)) return true;
    
    // Mode-spesifik kurallar
    if (mode === "ecb") {
      // BlockCipher → Ciphertext sadece
      if (sourceNode?.type === "blockcipher" &&
          targetNode?.type === "ciphertext" &&
          params.sourceHandle === "out" &&
          params.targetHandle === "in") {
        return true;
      }
    }
    
    if (mode === "cbc") {
      // IV/Ciphertext → BlockCipher.prevCipher
      if ((sourceNode?.type === "iv" || sourceNode?.type === "ciphertext") &&
          targetNode?.type === "blockcipher" &&
          params.targetHandle === "prevCipher") {
        return true;
      }
      
      // XOR node bağlantıları
      if (sourceNode?.type === "plaintext" &&
          targetNode?.type === "xor" &&
          params.targetHandle === "pt") {
        return true;
      }
      
      if ((sourceNode?.type === "iv" || sourceNode?.type === "ciphertext") &&
          targetNode?.type === "xor" &&
          params.targetHandle === "pc") {
        return true;
      }
    }
    
    return false;
  };
}
```

**ECB Bağlantı Kuralları:**
```
✅ Plaintext(out) → BlockCipher(plaintext)
✅ Key(out) → BlockCipher(key)
✅ BlockCipher(out) → Ciphertext(in)
❌ Ciphertext bağlantıları
❌ IV bağlantıları
```

**CBC Bağlantı Kuralları:**
```
✅ Plaintext(out) → BlockCipher(plaintext)
✅ Plaintext(out) → XOR(pt)
✅ Key(out) → BlockCipher(key)
✅ IV(out) → BlockCipher(prevCipher)
✅ IV(out) → XOR(pc)
✅ Ciphertext(out) → BlockCipher(prevCipher)  [İkinci+ bloklar]
✅ Ciphertext(out) → XOR(pc)
✅ BlockCipher(out) → Ciphertext(in)
✅ XOR(out) → BlockCipher(plaintext)
```

---

### 4. **imageXor.js - Resim XOR Şifreleme**

#### `bitStringToBytes(bits)`
```javascript
// "01010101" → [85]
// Bitstring'i Uint8Array'e dönüştür

function bitStringToBytes(bits) {
  const cleaned = (bits || '').replace(/[^01]/g, '');  // Sadece 0-1
  if (!cleaned) return new Uint8Array(0);
  
  // Padding: 8'in katına tamamla
  const rem = cleaned.length % 8;
  const padded = rem === 0 ? cleaned : cleaned + '0'.repeat(8 - rem);
  
  // Her 8 bit'i byte'a çevir
  const out = new Uint8Array(padded.length / 8);
  for (let i = 0; i < out.length; i++) {
    const chunk = padded.slice(i * 8, i * 8 + 8);
    out[i] = parseInt(chunk, 2);
  }
  return out;
}
```

**Örnek:**
```javascript
bitStringToBytes("01010101")
// Adım 1: cleaned = "01010101"
// Adım 2: padded = "01010101" (zaten 8 bit)
// Adım 3: out = Uint8Array [85]
```

---

#### `xorRgbaBytesWithKey(rgbaBytes, keyBits)`
```javascript
// RGBA pixel array'ini key bits'i ile XOR'la
// Resim pixel'lerini şifrele/deşifrele

function xorRgbaBytesWithKey(rgbaBytes, keyBits) {
  const keyBytes = bitStringToBytes(keyBits);
  if (keyBytes.length === 0) throw new Error("Key is not valid.");
  
  const out = new Uint8Array(rgbaBytes);
  let ki = 0;  // Key index
  
  for (let i = 0; i < out.length; i += 4) {  // Her pixel = 4 byte (RGBA)
    const kb = keyBytes[ki];
    out[i] ^= kb;       // Red
    out[i + 1] ^= kb;   // Green
    out[i + 2] ^= kb;   // Blue
    // out[i + 3] α (sabit) ← alpha kanalı değişme
    ki = (ki + 1) % keyBytes.length;  // Döngü
  }
  
  return out;
}
```

**Pixel Formatı:**
```javascript
// RGBA pixels: [R1, G1, B1, A1, R2, G2, B2, A2, ...]
// XOR işlem:
// R1 ^= key[0]
// G1 ^= key[0]
// B1 ^= key[0]
// A1 (değişme yok)
// R2 ^= key[1]
// ...
```

---

#### `xorImageFileWithKey(file, keyBits)`
```javascript
// Amaç: File (resim) al → XOR → PNG data URL döndür
// Giriş: File object, key bits string
// Çıkış: Promise<data URL>

function xorImageFileWithKey(file, keyBits) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Canvas oluştur ve resmi çiz
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        
        // ImageData al
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;  // Uint8ClampedArray (RGBA)
        
        // XOR
        const keyBytes = bitStringToBytes(keyBits);
        let ki = 0;
        for (let i = 0; i < data.length; i += 4) {
          const kb = keyBytes[ki];
          data[i] ^= kb;      // R
          data[i + 1] ^= kb;  // G
          data[i + 2] ^= kb;  // B
          ki = (ki + 1) % keyBytes.length;
        }
        
        // Geri koy
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}
```

**Adımlar:**
1. File → Data URL
2. Data URL → Image object
3. Image → Canvas
4. Canvas → ImageData (Uint8ClampedArray)
5. Pixel'ler üzerinde XOR loop
6. putImageData() → Canvas'a geri koy
7. canvas.toDataURL() → PNG data URL

---

### 5. **presets.js - Başlangıç Layoutları**

#### `buildEcbPreset()`
```javascript
// ECB modu başlangıç graph'ı

export function buildEcbPreset() {
  const nodes = [
    {
      id: 'p1',
      type: 'plaintext',
      position: { x: 220, y: -260 },
      data: { inputType: 'bits', value: '10110010' }
    },
    {
      id: 'k1',
      type: 'key',
      position: { x: -260, y: 80 },
      data: { bits: '01010101' }
    },
    { id: 'b1', type: 'blockcipher', position: { x: 220, y: 120 }, data: {} },
    { id: 'c1', type: 'ciphertext', position: { x: 220, y: 360 }, data: {} }
  ];
  
  const edges = [
    { id: 'e-p-b', source: 'p1', sourceHandle: 'out', 
      target: 'b1', targetHandle: 'plaintext', animated: true },
    { id: 'e-k-b', source: 'k1', sourceHandle: 'out', 
      target: 'b1', targetHandle: 'key', animated: true },
    { id: 'e-b-c', source: 'b1', sourceHandle: 'out', 
      target: 'c1', targetHandle: 'in', animated: true }
  ];
  
  return { nodes, edges };
}
```

**ECB Layoutı:**
```
         Plaintext(10110010)
                ▼
         BlockCipher(XOR)
         ▲             ▼
       Key          Ciphertext
     (01010101)
```

---

#### `buildCbcPreset()`
```javascript
// CBC modu başlangıç graph'ı
// IV + XOR node'u eklenir

export function buildCbcPreset() {
  const nodes = [
    { id: 'p1', type: 'plaintext', position: { x: 260, y: -400 }, 
      data: { inputType: 'bits', value: '00011100' } },
    { id: 'k1', type: 'key', position: { x: -100, y: 160 }, 
      data: { bits: '01010101' } },
    { id: 'iv1', type: 'iv', position: { x: -100, y: 300 },
      data: { bits: '11110000' } },
    { id: 'xor1', type: 'xor', position: { x: 260, y: -100 },
      data: {} },
    { id: 'b1', type: 'blockcipher', position: { x: 260, y: 160 }, data: {} },
    { id: 'c1', type: 'ciphertext', position: { x: 260, y: 350 }, data: {} }
  ];
  
  const edges = [
    { id: 'e-p-xor', source: 'p1', sourceHandle: 'out',
      target: 'xor1', targetHandle: 'pt' },
    { id: 'e-iv-xor', source: 'iv1', sourceHandle: 'out',
      target: 'xor1', targetHandle: 'pc' },
    { id: 'e-xor-b', source: 'xor1', sourceHandle: 'out',
      target: 'b1', targetHandle: 'plaintext' },
    { id: 'e-k-b', source: 'k1', sourceHandle: 'out',
      target: 'b1', targetHandle: 'key' },
    { id: 'e-b-c', source: 'b1', sourceHandle: 'out',
      target: 'c1', targetHandle: 'in' }
  ];
  
  return { nodes, edges };
}
```

**CBC Layoutı:**
```
Plaintext(00011100)     IV(11110000)
          ▼                ▼
          └─→ XOR Node ←─┘
                 ▼
         BlockCipher(XOR)
         ▲             ▼
       Key          Ciphertext
     (01010101)
```

---

### 6. **PlaintextNode.jsx - Giriş Node'u**

#### Node Veri Yapısı
```javascript
// node.data
{
  inputType: "bits" | "text" | "image" | "encrypted",
  value: string | File,
  onChange: (id, patch) => void,
  showHandleLabels: boolean,
  mode: string,
  
  // Image modu ekstra
  width: 256,
  height: 256,
  pixelBytes: Uint8Array,
  
  // Computed (computeGraph tarafından)
  preview: string
}
```

#### İnput Çeşitleri

| Type | `value` | Kullanım | Hesaplama |
|------|---------|----------|----------|
| **bits** | `"10110010"` | Doğrudan bit girdisi | Hiç değişme |
| **text** | `"ABC"` | ASCII text | textToBinary() |
| **image** | `File object` | Resim dosyası | fileToPixelBytes() |
| **encrypted** | `File object` | Şifreli dosya | desFile() / aesFile() |

#### onChange Handler
```javascript
const onTextChange = (e) => {
  const rawValue = e.target.value;
  setInputType("text");
  setText(rawValue);
  setBits("");
  setFile(null);
  
  data.onChange?.(id, {
    inputType: "text",
    value: rawValue,
    bits: "",
    file: null
  });
  // → computeGraphValues() çalışır
};
```

---

### 7. **BlockCipherNode.jsx - Şifreleme Node'u**

#### Node Veri Yapısı
```javascript
// node.data
{
  cipherType: "xor" | "aes" | "des",
  onChange: (id, patch) => void,
  onRunCipher: (id) => void,
  mode: string,
  showHandleLabels: boolean,
  
  // Text/Bits modu (computeGraph tarafından set)
  preview: string,
  fullBinary: string,
  error: string,
  
  // Image modu (computeGraph tarafından set)
  plaintextFile: File,
  encryptedFile: File,
  keyBits: string,
  inputType: "image" | "encrypted",
  preview: "Ready for Run XOR",
  
  // AES/DES modu (onRunCipher tarafından)
  encryptedBlobUrl: string,
  keyText: string
}
```

#### Handles (Bağlantı Noktaları)
```javascript
// Target handles (girdi)
<Handle type="target" position={Position.Top} id="plaintext" />
<Handle type="target" position={Position.Left} id="key" />
<Handle type="target" position={Position.Top} id="xor" />
<Handle type="target" position={Position.Top} id="ctr" />
<Handle type="target" position={Position.Left} id="prevCipher" />

// Source handle (çıktı)
<Handle type="source" position={Position.Bottom} id="out" />
```

**Handle Semantiği:**
```
      plaintext (top, 70%)     xor (top, 30%)    ctr (top, 50%)
                 ▼                  ▼                  ▼
        ┌─────────────────────────────────────────────┐
        │                                             │
        │        BlockCipher Node                     │ out (bottom)
        │                                             │
        └─────────────────────────────────────────────┘
         ▲      ▲
       key  prevCipher
      (left, 30%)   (left, 70%)
```

---

### 8. **CiphertextNode.jsx - Çıktı Node'u**

#### Node Veri Yapısı
```javascript
// node.data
{
  // Text/Bits modu (computeGraph tarafından)
  result: string,
  fullBinary: string,
  
  // Image modu (computeGraph + onRunXor tarafından)
  result: "data:image/png;base64,...",
  xorBytes: Uint8Array,
  
  // AES/DES modu
  encryptedBlobUrl: "blob:...",
  
  // Handler'lar
  onChange: (id, patch) => void,
  mode: string,
  showHandleLabels: boolean
}
```

#### Görselleştirme
```javascript
// Text/Bits case
<div>
  <strong>Ciphertext</strong>
  <pre>{data.result}</pre>
  <pre>{data.fullBinary}</pre>
</div>

// Image case
<div>
  <img src={data.result} alt="ciphertext" />
</div>

// Download şifreli resim (AES/DES)
if (data.encryptedBlobUrl) {
  <a href={data.encryptedBlobUrl} download="encrypted.bin">
    Download Encrypted
  </a>
}
```

---

### 9. **IVNode.jsx - Başlatma Vektörü**

#### Node Veri Yapısı
```javascript
// node.data (KeyNode ile aynı)
{
  bits: string,  // "11110000" vb
  onChange: (id, patch) => void,
  mode: string,
  showHandleLabels: boolean,
  showDeleteButton: boolean
}
```

#### Handles
```javascript
<Handle type="source" position={Position.Right} id="out" />
// Bağlanabileceği yerleri: CBC mode
// - BlockCipher.prevCipher
// - XOR.pc
```

---

### 10. **XorPreBlockNode.jsx - CBC Öncesi XOR**

#### Node Veri Yapısı
```javascript
// node.data (computeGraph tarafından set)
{
  preview: string,
  ptInput: string,
  pcInput: string,
  xorOutput: string,
  error: string,
  
  // Handler'lar
  onChange: (id, patch) => void,
  mode: string,
  showHandleLabels: boolean
}
```

#### Handles
```javascript
<Handle type="target" position={Position.Top} id="pt" />    // plaintext
<Handle type="target" position={Position.Left} id="pc" />   // prevCipher/IV
<Handle type="source" position={Position.Bottom} id="out" />
```

#### Hesaplama (computeGraph.js)
```javascript
// CBC modu: plaintext ⊕ prevCiphertext (veya IV)
if (ptVal && pcVal) {
  const xorResult = xorBits(ptVal, pcVal);
  n.data = { 
    ...n.data, 
    xorOutput: xorResult.value,
    ptInput: ptVal,
    pcInput: pcVal
  };
  valueMap.set(n.id, { type: "bits", value: xorResult.value });
}
```

---

### 11. **CtrNode.jsx - Counter Mode**

#### Node Veri Yapısı
```javascript
// node.data
{
  nonceBits: string,      // "1010101010101010"
  counterBits: string,    // "0000000000000000"
  onChange: (id, patch) => void,
  mode: string,
  showHandleLabels: boolean
}
```

#### Handles
```javascript
<Handle type="source" position={Position.Right} id="out" />
// CTR node → BlockCipher(ctr)
```

#### Hesaplama
```javascript
// CTR BlockCipher'da
if (mode === "ctr" && pType === "ctr") {
  const nonceBits = pVal?.nonceBits || "";
  const counterBits = pVal?.counterBits || "";
  const nonceCounter = `${nonceBits}${counterBits}`;
  
  // Keystream oluştur
  const computedCtr = xorBits(nonceCounter, kVal);
  // keystream = nonce||counter ⊕ key
}
```

---

## Node Veri Yapıları

### Tüm Node Tipleri Özeti

```javascript
// 1. PLAINTEXT NODE
{
  id: string,
  type: 'plaintext',
  position: { x: number, y: number },
  data: {
    inputType: 'bits' | 'text' | 'image' | 'encrypted',
    value: string | File,
    onChange: (id, patch) => void,
    mode: string,
    showHandleLabels: boolean,
    // Image modu
    width?: number,
    height?: number,
    pixelBytes?: Uint8Array
  }
}

// 2. KEY NODE
{
  id: string,
  type: 'key',
  position: { x: number, y: number },
  data: {
    bits: string,  // "01010101"
    onChange: (id, patch) => void,
    mode: string,
    showHandleLabels: boolean,
    showDeleteButton?: boolean
  }
}

// 3. IV NODE
{
  id: string,
  type: 'iv',
  position: { x: number, y: number },
  data: {
    bits: string,  // "11110000"
    onChange: (id, patch) => void,
    mode: string,
    showHandleLabels: boolean,
    showDeleteButton?: boolean
  }
}

// 4. BLOCKCIPHER NODE
{
  id: string,
  type: 'blockcipher',
  position: { x: number, y: number },
  data: {
    cipherType: 'xor' | 'aes' | 'des',
    onChange: (id, patch) => void,
    onRunCipher: (id) => void,
    mode: string,
    showHandleLabels: boolean,
    // Text/Bits modu
    preview?: string,
    fullBinary?: string,
    error?: string,
    // Image modu
    plaintextFile?: File,
    encryptedFile?: File,
    keyBits?: string,
    inputType?: 'image' | 'encrypted',
    // AES/DES modu
    encryptedBlobUrl?: string,
    keyText?: string
  }
}

// 5. CIPHERTEXT NODE
{
  id: string,
  type: 'ciphertext',
  position: { x: number, y: number },
  data: {
    // Text/Bits modu
    result?: string,
    fullBinary?: string,
    // Image modu
    xorBytes?: Uint8Array,
    // AES/DES modu
    encryptedBlobUrl?: string,
    onChange?: (id, patch) => void,
    mode?: string,
    showHandleLabels?: boolean
  }
}

// 6. XOR NODE
{
  id: string,
  type: 'xor',
  position: { x: number, y: number },
  data: {
    preview?: string,
    ptInput?: string,
    pcInput?: string,
    xorOutput?: string,
    error?: string,
    onChange?: (id, patch) => void,
    mode?: string,
    showHandleLabels?: boolean
  }
}

// 7. CTR NODE
{
  id: string,
  type: 'ctr',
  position: { x: number, y: number },
  data: {
    nonceBits: string,
    counterBits: string,
    onChange: (id, patch) => void,
    mode: string,
    showHandleLabels: boolean
  }
}
```

### valueMap Yapısı (computeGraphValues içi)

```javascript
const valueMap = new Map();

// Her node'dan:
// valueMap.set(nodeId, { type, value })

// Örnekler:
valueMap.set('p1', { type: 'bits', value: '10110010' });
valueMap.set('p2', { type: 'text', value: 'ABC' });
valueMap.set('p3', { type: 'image', value: File });
valueMap.set('k1', { type: 'bits', value: '01010101' });
valueMap.set('iv1', { type: 'bits', value: '11110000' });
valueMap.set('xor1', { type: 'bits', value: '11100010' });
valueMap.set('b1', { type: 'bits', value: '10110111' });
valueMap.set('c1', { type: 'bits', value: '10110111' });
```

---

## Şifreleme Modları

### 1️⃣ ECB (Electronic Codebook) Modu

#### Formül
```
Ciphertext = Plaintext ⊕ Key
```

#### Akış
```
┌──────────────┐
│  Plaintext   │
│   10110010   │
└──────┬───────┘
       │
       ▼
   ┌────────┐
   │  XOR   │
   │  Gate  │
   └────────┘
       ▲
       │
┌──────┴───────┐
│     Key      │
│   01010101   │
└──────────────┘
       │
       ▼
┌──────────────┐
│ Ciphertext   │
│   11100111   │
└──────────────┘
```

#### Node Bağlantıları
```
Plaintext(out) → BlockCipher(plaintext)
Key(out) → BlockCipher(key)
BlockCipher(out) → Ciphertext(in)
```

#### Kod
```javascript
// computeGraphValues() içinde
let computed = xorBits(pVal, kVal);  // plaintext ⊕ key

// App.js içinde (image modu)
const outBytes = xorRgbaBytesWithKey(input, keyBits);
```

#### Özellikleri
- ✅ Basit ve hızlı
- ❌ Zayıf güvenlik (pattern repeating)
- ✅ Parallelizable
- 📚 Eğitimsel amaçlar için ideal

---

### 2️⃣ CBC (Cipher Block Chaining) Modu

#### Formül
```
C₁ = Plaintext₁ ⊕ IV ⊕ Key
Cᵢ = Plaintextᵢ ⊕ Cᵢ₋₁ ⊕ Key  (i > 1)
```

#### Akış (İlk Blok)
```
        Plaintext
         ↓
    ┌──────────┐
    │  XOR 1   │
    └──────────┘
    ▲    ▲
    │    │
   IV    │
        XOR 2
        ▲
        │
       Key
```

#### Akış (Sonraki Bloklar)
```
    Plaintext₂
         ↓
    ┌──────────┐
    │  XOR 1   │
    └──────────┘
    ▲    ▲
    │    │
  C₁     │
        XOR 2
        ▲
        │
       Key
```

#### Node Bağlantıları
```
Plaintext(out) → XOR(pt)
IV(out) → XOR(pc)
XOR(out) → BlockCipher(plaintext)
Key(out) → BlockCipher(key)
BlockCipher(out) → Ciphertext(in)

[Zincir] Ciphertext(out) → XOR(pc)  [Sonraki blok için]
```

#### Kod
```javascript
// computeGraphValues() içinde
if (mode === 'cbc' && prevVal) {
  const t = xorBits(pVal, prevVal);    // plaintext ⊕ prevCiphertext
  computed = xorBits(t, kVal);          // sonuç ⊕ key
} else {
  computed = xorBits(pVal, kVal);       // plaintext ⊕ key
}

// App.js içinde (image modu)
if (currentMode === 'cbc' && prevBytes) {
  const withPrev = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    withPrev[i] = input[i] ^ prevBytes[i % prevBytes.length];
  }
  outBytes = xorRgbaBytesWithKey(withPrev, keyBits);
}
```

#### Özellikleri
- ✅ Zayıf desenleri gizler
- ✅ Deterministic
- ❌ Sequential (parallelizable değil)
- ⚠️ IV yönetimi gerekli
- 📚 Gerçekçi şifreleme

---

### 3️⃣ CTR (Counter) Modu

#### Formül
```
Keystream = Nonce||Counter ⊕ Key
Ciphertext = Plaintext ⊕ Keystream
```

#### Akış
```
Nonce||Counter      Key
         ▼            ▼
         └────XOR─────┘
             │
             ▼
        Keystream
             │
        Plaintext ⊕ Keystream → Ciphertext
```

#### Node Bağlantıları
```
CTR(out) → BlockCipher(ctr)
Key(out) → BlockCipher(key)
BlockCipher(out) → Ciphertext(in)
```

#### Kod
```javascript
// computeGraphValues() içinde
if (mode === "ctr" && pType === "ctr") {
  const nonceBits = pVal?.nonceBits || "";
  const counterBits = pVal?.counterBits || "";
  const nonceCounter = `${nonceBits}${counterBits}`;
  
  const computedCtr = xorBits(nonceCounter, kVal);
  // Keystream oluştur
}
```

#### Özellikleri
- ✅ Akış şifresi (stream cipher)
- ✅ Parallelizable
- ✅ Rastgelelik sağlar
- ⚠️ Nonce tekrarlama = güvenlik kaybı
- 📚 Modern şifreleme pratiği

---

## UML Diyagramları

### 1. Component Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                          App.js                             │
│  - mode state                                               │
│  - nodes/edges state (ReactFlow)                            │
│  - onRunXor(), onRunCipher()                               │
│  - applyMode(), onConnect()                                │
│  - event handler'ları enjekte et                           │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Nodes    │  │ Edges    │  │ Handlers │
        │ Array    │  │ Array    │  │          │
        └──────────┘  └──────────┘  └──────────┘
              │             │              │
              └─────────────┼──────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │    computeGraphValues(nodes,         │
        │            edges, mode)               │
        │  - valueMap oluştur                   │
        │  - Her node'un data'sını hesapla      │
        │  - Updated nodes dön                  │
        └───────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Plaintext│  │BlockCipher│ │ Ciphertext
        │  Node    │  │   Node    │  │  Node
        └──────────┘  └──────────┘  └──────────┘
```

### 2. State Flow (ECB Modu)

```
┌─────────────────────────────────────────────────────────────┐
│                   User Input                                │
│  (Text: "A", Bits: "01010101", Image: file.png)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  PlaintextNode.onChange()    │
        │  setNodes()                  │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  computeGraphValues()        │
        │  1. valueMap = {             │
        │       p1: {bits, "01010101"} │
        │       k1: {bits, "10101010"} │
        │     }                        │
        │  2. XOR bits ⊕ key          │
        │  3. Output → blockcipher     │
        │  4. Output → ciphertext      │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Updated nodes array         │
        │  {                           │
        │    ...                       │
        │    {id:'b1', data:{          │
        │      preview: "binary...",   │
        │      fullBinary: "....",     │
        │    }}                        │
        │    {id:'c1', data:{          │
        │      result: "binary...",    │
        │      fullBinary: "..."       │
        │    }}                        │
        │  }                           │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   ReactFlow render            │
        │   Nodes UI updated            │
        └──────────────────────────────┘
```

### 3. Image Mode Flow

```
┌──────────────────────────────────────────────────────────────┐
│              User Selects Image + Key                        │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │  PlaintextNode.onFileChange()│
        │  fileToPixelBytes()          │
        │  setNodes({                  │
        │    inputType: "image",       │
        │    value: File object        │
        │  })                          │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  computeGraphValues()        │
        │  valueMap: {                 │
        │    p1: {image, File}         │
        │    k1: {bits, "..."}         │
        │  }                           │
        │  BlockCipher.data = {        │
        │    plaintextFile: File,      │
        │    keyBits: "...",           │
        │    preview: "Ready for Run"  │
        │  }                           │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  User Clicks "Run XOR"       │
        │  onRunCipher()               │
        │  → onRunXor()                │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  fileToPixelBytes()          │
        │  → Uint8Array (RGBA)         │
        │                              │
        │  xorRgbaBytesWithKey()       │
        │  → XOR loop                  │
        │  → new Uint8Array            │
        │                              │
        │  rgbaBytesToPngDataUrl()     │
        │  → data:image/png;base64     │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  setNodes() update           │
        │  BlockCipher.data = {        │
        │    preview: "data:image...", │
        │    xorBytes: Uint8Array      │
        │  }                           │
        │  Ciphertext.data = {         │
        │    result: "data:image...",  │
        │    xorBytes: Uint8Array      │
        │  }                           │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Ciphertext Node göster     │
        │   <img src={result} />       │
        └──────────────────────────────┘
```

### 4. CBC Mode Zincir

```
Block 1:
┌─────────────┐
│  Plaintext1 │  ┌────────┐
└──────┬──────┘  │  XOR1  │
       │        ┌┴────────┤
       │        │         │
       ▼        ▼         ▼
    ┌──────────────────┐
    │   BlockCipher1   │  ⊕ Key
    └──────┬───────────┘
           │
           ▼
    ┌──────────────┐
    │ Ciphertext1  │
    └──────┬───────┘
           │
           │ Zincir
           ▼
Block 2:
       ┌─────────────┐
       │  Plaintext2 │  ┌────────┐
       └──────┬──────┘  │  XOR2  │
              │        ┌┴────────┤
              │        │         │
              ▼        ▼         ▼
           ┌──────────────────┐
           │  BlockCipher2    │  ⊕ Key
           └──────┬───────────┘
                  │
                  ▼
           ┌──────────────┐
           │ Ciphertext2  │
           └──────────────┘

Input to XOR1: IV (başlangıç)
Input to XOR2: Ciphertext1 (zincir)
```

### 5. Sınıf/Interface İlişkileri

```
┌────────────────────────────────────┐
│  ReactFlowNodeData (Base Interface)│
├────────────────────────────────────┤
│ - id: string                       │
│ - type: NodeType                   │
│ - onChange?: callback              │
│ - mode?: 'ecb'|'cbc'|'ctr'        │
│ - showHandleLabels?: boolean       │
└────────┬───────────────────────────┘
         │
    ┌────┴────┬─────────┬─────────┬──────────┐
    │          │         │         │          │
    ▼          ▼         ▼         ▼          ▼
┌─────┐   ┌──────┐  ┌───────┐ ┌────────┐ ┌────────┐
│Input│   │Cipher│  │Output │ │Utility │ │Metadata│
├─────┤   ├──────┤  ├───────┤ ├────────┤ ├────────┤
│type:│   │type: │  │type:  │ │type:   │ │type:   │
│Plain│   │Block-│  │Cipher-│ │XOR/IV/ │ │CTR     │
│text │   │text  │  │text   │ │PreBlock│ │        │
├─────┤   ├──────┤  ├───────┤ ├────────┤ ├────────┤
│value│   │cipher│  │result │ │bits    │ │nonce/  │
│bits │   │Type  │  │preview│ │handle  │ │counter │
└─────┘   └──────┘  └───────┘ └────────┘ └────────┘
```

### 6. Event Handler Chain

```
User Action
    │
    ├─→ PlaintextNode.onTextChange()
    │   → data.onChange(id, {inputType, value})
    │   → setNodes()
    │   → computeGraphValues()
    │   → Updated nodes
    │   → React re-render
    │
    ├─→ BlockCipherNode onRunCipher Button
    │   → data.onRunCipher(id)
    │   → onRunXor() / encryptFileAES() / encryptFileDES()
    │   → setNodes() with result
    │   → React re-render
    │
    └─→ Edge Connection (drag-drop)
        → onConnect(params)
        → isValidConnection(params)?
        → addEdge()
        → setEdges()
        → computeGraphValues()
        → Updated nodes
```

### 7. Data Transformation Pipeline

```
┌─────────────────────────────────────┐
│     Raw Input (User/File)           │
│  "ABC" / "01010101" / image.png     │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Normalization Layer               │
│  textToBinary()                     │
│  fileToPixelBytes()                 │
│  bitStringToBytes()                 │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Crypto Processing                 │
│  xorBits()                          │
│  xorRgbaBytesWithKey()              │
│  encryptFileAES()                   │
│  encryptFileDES()                   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Output Formatting                 │
│  rgbaBytesToPngDataUrl()            │
│  binaryToText()                     │
│  formatBinary()                     │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Display Output                    │
│  result: string / DataURL / Bytes   │
└─────────────────────────────────────┘
```

---

## Fonksiyon Çağrı Ağacı (Call Tree)

### XOR Şifreleme (Text/Bits Modu)

```
App.js:applyMode(mode)
└─→ buildPreset(mode)
    ├─→ Nodes + Edges oluştur
    └─→ computeGraphValues()
        ├─→ PlaintextNode'dan value al
        ├─→ KeyNode'dan key al
        └─→ BlockCipherNode'da
            └─→ xorBits(plaintext, key)
                ├─→ XOR operation (bitwise)
                └─→ { value, error }
            └─→ n.data.preview güncelle
            └─→ CiphertextNode.data güncelle
```

### XOR Şifreleme (Image Modu)

```
App.js:onRunCipher(blockId)
└─→ onRunXor(blockId, nodes, edges, mode)
    ├─→ fileToPixelBytes(plaintextFile)
    │   ├─→ FileReader.readAsArrayBuffer()
    │   ├─→ Image.decode()
    │   └─→ Canvas.getImageData()
    │       └─→ Uint8Array (RGBA)
    │
    ├─→ (CBC Mode?) Önceki ciphertext/IV bul
    │
    ├─→ xorRgbaBytesWithKey(pixels, keyBits)
    │   ├─→ bitStringToBytes(keyBits)
    │   │   └─→ Uint8Array
    │   └─→ XOR loop (pixel by pixel)
    │       └─→ new Uint8Array
    │
    └─→ rgbaBytesToPngDataUrl(outputBytes)
        ├─→ Canvas oluştur
        ├─→ putImageData()
        └─→ canvas.toDataURL("image/png")
            └─→ "data:image/png;base64,..."
    
    └─→ setNodes() BlockCipher + Ciphertext güncelle
```

### AES Şifreleme (Image Modu)

```
App.js:onRunCipher(blockId)
└─→ encryptFileAES(file, passphrase)
    ├─→ FileReader.readAsArrayBuffer()
    │   └─→ Uint8Array
    │
    ├─→ crypto.subtle.generateKey("AES-GCM", ...)
    │   └─→ CryptoKey
    │
    ├─→ crypto.subtle.encrypt("AES-GCM", key, data)
    │   └─→ encrypted ArrayBuffer
    │
    ├─→ Encrypted bytes → PNG (preview)
    │   └─→ rgbaBytesToPngDataUrl()
    │
    └─→ { previewUrl, encryptedBlobUrl }
```

---

## Önemli Konstantes

```javascript
// Image dimensions (hardcoded)
const WIDTH = 256;
const HEIGHT = 256;

// Pixel formatı
// RGBA = 4 bytes per pixel
// Total = 256 × 256 × 4 = 262,144 bytes

// Mode'lar
const MODES = ['ecb', 'cbc', 'ctr'];

// Input Tipleri
const INPUT_TYPES = ['bits', 'text', 'image', 'encrypted'];

// Cipher Tipleri
const CIPHER_TYPES = ['xor', 'aes', 'des'];

// Handle Renkleri (visual)
const HANDLE_COLORS = {
  plaintext: 'green',
  key: 'blue',
  xor: 'purple',
  ctr: '#5a4ecb',
  output: '#000'
};
```

---

## Debugging Tıpları

### Konsol Logging Emojileri
```javascript
🎯 onRunXor start
🔍 Değer arama/inspection
🔐 Şifreleme işlemi
✅ Başarı
❌ Hata
📁 File/Image işlemi
🖼️ Image mode
ℹ️ Bilgi
🔧 İşlem başında
```

### State Debugging
```javascript
// App.js
console.log("BLOCKCIPHER state:", 
  nodes.filter(n => n.type === "blockcipher")
       .map(n => ({ id: n.id, cipherType: n.data?.cipherType, data: n.data }))
);

// Öğrenme
// 1. Nodes array'ini logla
// 2. Edges array'ini logla
// 3. valueMap'i kontrol et (computeGraph içinde)
// 4. preview/fullBinary değerlerini kontrol et
```

---

## Özetleyen Tablo

| Fonksiyon | Dosya | Giriş | Çıkış | Amaç |
|-----------|-------|-------|-------|------|
| `computeGraphValues()` | computeGraph.js | nodes, edges, mode | Updated nodes | State hesaplaması |
| `onRunXor()` | App.js | blockId, nodes, edges, mode | setNodes() | Image XOR şifreleme |
| `onRunCipher()` | App.js | blockId | setNodes() | Cipher routing |
| `applyMode()` | App.js | mode | setNodes(), setEdges() | Mod yükleme |
| `xorRgbaBytesWithKey()` | imageXor.js | rgba, keyBits | Uint8Array | Pixel XOR |
| `xorImageFileWithKey()` | imageXor.js | File, keyBits | Promise<DataURL> | File XOR |
| `buildEcbPreset()` | presets.js | - | {nodes, edges} | ECB layout |
| `buildCbcPreset()` | presets.js | - | {nodes, edges} | CBC layout |
| `makeIsValidConnection()` | validators.js | mode | Validator fn | Kurallar |
| `fileToPixelBytes()` | imageToBytes.js | File, {w, h} | Uint8Array | Resim → Bytes |
| `rgbaBytesToPngDataUrl()` | bytesToDataUrl.js | Uint8Array, w, h | DataURL | Bytes → PNG |
| `encryptFileAES()` | aesFile.js | File, passphrase | Promise<{urls}> | AES şifreleme |
| `encryptFileDES()` | desFile.js | File, key8chars | Promise<{urls}> | DES şifreleme |

