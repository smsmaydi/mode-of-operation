# 📖 Data Flow & `node.data` Reference (EN)

## 1. PlaintextNode

### Text input
```js
{
  inputType: 'text',
  value: 'Hello',
  text: 'Hello',
  bits: '',
  file: null
}
```
`textToBinary('Hello')` → stored as bits in `valueMap`.

### Bits input
```js
{
  inputType: 'bits',
  value: '10110010',
  bits: '10110010',
  text: '',
  file: null
}
```

### Image input
```js
{
  inputType: 'image',
  value: File,
  width: 256,
  height: 256,
  pixelBytes: Uint8Array
}
```

### Encrypted file input
```js
{
  inputType: 'encrypted',
  value: File
}
```

---

## 2. KeyNode
```js
{
  bits: '01010101',
  onChange
}
```

---

## 3. IVNode (CBC)
```js
{
  bits: '11110000',
  onChange
}
```

---

## 4. BlockCipherNode

### Text/Bits mode
```js
{
  cipherType: 'xor',
  preview: 'out: ...',
  fullBinary: '...',
  error: undefined
}
```

### Image mode (before Run)
```js
{
  cipherType: 'xor',
  preview: 'Ready for Run XOR',
  plaintextFile: File,
  keyBits: '...'
}
```

### Image mode (after Run)
```js
{
  preview: 'data:image/png;base64,...',
  xorBytes: Uint8Array
}
```

---

## 5. CiphertextNode
```js
{
  result: string,           // text or data URL
  fullBinary?: string,
  xorBytes?: Uint8Array
}
```

---

## 6. XORNode (CBC pre-XOR)
```js
{
  ptInput: '...',
  pcInput: '...',
  xorOutput: '...'
}
```

---

## 7. CTRNode
```js
{
  nonceBits: '...',
  counterBits: '...'
}
```

---

## 8. `valueMap` Structure
```js
valueMap.set(nodeId, { type, value, keyBits? })
```

Examples:
```js
valueMap.set('p1', { type: 'bits', value: '10110010' })
valueMap.set('k1', { type: 'bits', value: '01010101' })
valueMap.set('b1', { type: 'bits', value: '11100111' })
```

---

## 9. State Update Cycle

```
User input → onChange → setNodes
  → computeGraphValues → updated nodes → UI render
```
# 📖 Data Akışı & Node.data Referans Rehberi

## 1. PlaintextNode - node.data Özellikleri

### Girdi Türleri ve Data Yapısı

#### 1.1 Text Input Mode
```javascript
// User: "Hello" yazıyor
node.data = {
  inputType: "text",
  value: "Hello",                    // ← Girilen metin
  text: "Hello",
  bits: "",
  file: null,
  
  // Computed by computeGraphValues()
  // → "01001000 01100101 01101100 01101100 01101111"
}
```

**Dönüşüm:** `textToBinary("Hello")` → 5 char × 8 bit = 40 bit
```
H (72) → 01001000
e (101) → 01100101
l (108) → 01101100
l (108) → 01101100
o (111) → 01101111
```

**valueMap Sonucu:**
```javascript
valueMap.set('p1', {
  type: 'text',
  value: '0100100001100101011011000110110001101111'
})
```

---

#### 1.2 Bits Input Mode
```javascript
// User: "10110010" yazıyor
node.data = {
  inputType: "bits",
  value: "10110010",                 // ← Bitstring (hiç dönüşüm)
  bits: "10110010",
  text: "",
  file: null,
  
  // Computed by computeGraphValues()
  // → valueMap'e direkt pas
}
```

**valueMap Sonucu:**
```javascript
valueMap.set('p1', {
  type: 'bits',
  value: '10110010'
})
```

**Doğrulama Kuralları:**
```javascript
// ✅ Geçerli
"01010101"           // 8 bits
"0101010101010101"   // 16 bits
"01 01 01 01"        // Boşluk yoksayıldı

// ❌ Geçersiz
"101010102"          // '2' karakteri
"0101010"            // 7 bits (8'in katı değil)
"hello"              // String değil bit
```

---

#### 1.3 Image Input Mode
```javascript
// User: "cat.png" dosyasını yükledi
node.data = {
  inputType: "image",
  value: File {                      // ← File object
    name: "cat.png",
    size: 4096,
    type: "image/png",
    lastModified: 1708956234567
  },
  file: File { ... },
  
  // Computed by PlaintextNode.onFileChange()
  width: 256,
  height: 256,
  pixelBytes: Uint8Array [R,G,B,A,...],  // 262,144 bytes
  
  // NOT computed by computeGraphValues() - skipped for image mode
}
```

**İşlem Akışı:**
```
User selects image
    ↓
onFileChange() triggered
    ↓
FileReader.readAsDataURL(file)
    ↓
Image.onload() (browser decodes PNG)
    ↓
Canvas.getImageData(0, 0, 256, 256)
    ↓
Uint8ClampedArray [R,G,B,A, R,G,B,A, ...]
    ↓
node.data.pixelBytes = Uint8Array (copy)
    ↓
node.data.onChange() → computeGraphValues()
    ↓
BlockCipherNode.data.plaintextFile = File
            .data.preview = "Ready for Run XOR"
```

**valueMap Sonucu:**
```javascript
valueMap.set('p1', {
  type: 'image',
  value: File { name: 'cat.png', ... }
})

// BlockCipherNode'da
valueMap.set('b1', {
  type: 'image',
  value: File { ... },
  keyBits: '01010101...'
})
```

---

#### 1.4 Encrypted File Input Mode
```javascript
// User: "image.aes" şifreli dosya yükledi
node.data = {
  inputType: "encrypted",
  value: File {
    name: "image.aes",
    size: 4096,
    type: "application/octet-stream"
  },
  file: File { ... },
  
  // Same as image mode
  width: 256,
  height: 256
}
```

**valueMap Sonucu:**
```javascript
valueMap.set('p1', {
  type: 'encrypted',
  value: File { name: 'image.aes', ... }
})

// BlockCipherNode'da
valueMap.set('b1', {
  type: 'encrypted',
  value: File { ... },
  keyBits: 'passphrase_as_bits'
})
```

---

### Handlers & Callbacks

```javascript
// onChange callback (enjekte edilir App.js'den)
data.onChange = (id, patch) => {
  // Example:
  data.onChange('p1', {
    inputType: 'bits',
    value: '10110010',
    bits: '10110010',
    text: '',
    file: null
  })
  
  // → setNodes() başlatır
  // → computeGraphValues() çalışır
}

// showHandleLabels (UI for debugging)
data.showHandleLabels = true  // true/false
```

---

## 2. KeyNode - node.data Özellikleri

### Basic Structure
```javascript
node.data = {
  bits: "01010101",                  // ← Key bits
  
  // Handlers
  onChange: (id, patch) => void,
  
  // UI
  showHandleLabels: boolean,
  showDeleteButton: boolean,  // CBC/CTR modu'nda true
  
  // Meta
  mode: "ecb" | "cbc" | "ctr"
}
```

### Doğrulama
```javascript
// ✅ Geçerli
"01010101"                    // 8 bits
"01010101" "10101010"         // 16 bits (boşluk yoksayıldı)
"0" * 128                     // 128 bits

// ❌ Geçersiz
"101010102"                   // '2' karakteri
"10101010101"                 // 11 bits (8'in katı değil)
""                            // Boş
```

### valueMap Sonucu
```javascript
valueMap.set('k1', {
  type: 'bits',
  value: '01010101'
})
```

### Kullanım
```javascript
// BlockCipherNode'da
const kVal = valueMap.get('k1').value;  // '01010101'

// XOR İşlem
const result = xorBits(plaintextBits, keyBits);

// Image Mode
const keyBytes = bitStringToBytes(keyBits);  // [85]
const xorResult = xorRgbaBytesWithKey(pixels, keyBits);
```

---

## 3. IVNode (Initialization Vector) - node.data Özellikleri

### Basic Structure
```javascript
node.data = {
  bits: "11110000",                  // ← IV bits (same as Key)
  
  // Handlers
  onChange: (id, patch) => void,
  
  // UI
  showHandleLabels: boolean,
  showDeleteButton: boolean,         // ✅ Always true (delete'ye izin)
  
  // Meta
  mode: "cbc" | "ctr"               // ⚠️ ECB'de yok!
}
```

### Sadece CBC/CTR Modlarında
```javascript
// ECB Modu
// → IV Node yok, edges yok

// CBC Modu
// → IV Node var
// → IVNode(out) → BlockCipher(prevCipher)  [İlk blok]
// → IVNode(out) → XOR(pc)                  [XOR node var ise]

// CTR Modu
// → IV Node yok, CTR Node var
```

### valueMap Sonucu
```javascript
valueMap.set('iv1', {
  type: 'bits',
  value: '11110000'
})
```

### Zincir Mantığı (CBC)
```javascript
// Blok 1: plaintext ⊕ IV ⊕ key
// → IV Node(out) → BlockCipher(prevCipher)
// → xor: plaintext ⊕ IV

// Blok 2: plaintext ⊕ Ciphertext₁ ⊕ key
// → Ciphertext₁(out) → BlockCipher(prevCipher)
// → xor: plaintext ⊕ Ciphertext₁
```

---

## 4. BlockCipherNode - node.data Özellikleri

### 4.1 Text/Bits Mode (Computed)

#### ECB Mode Sonrası
```javascript
// Örnek: plaintext='10110010' ⊕ key='01010101'
node.data = {
  cipherType: "xor",
  
  // Computed by computeGraphValues()
  preview: "out: C\nbin:\n11100111  \u0367",
  fullBinary: "11100111",
  error: undefined,
  
  // Handlers
  onChange: (id, patch) => void,
  onRunCipher: (id) => void,
  
  // Meta
  mode: "ecb",
  showHandleLabels: boolean
}
```

**Preview Format:**
```
out: C                          ← ASCII karakter
bin:                            ← Binary header
11100111  C                     ← Bit byte + ASCII
```

---

#### CBC Mode Sonrası
```javascript
// plaintext='10110010' ⊕ IV='11110000' ⊕ key='01010101'
// Step 1: '10110010' ⊕ '11110000' = '01000010' (B)
// Step 2: '01000010' ⊕ '01010101' = '00010111' (ETB control)

node.data = {
  cipherType: "xor",
  
  // XOR Node'dan gelen input
  // (computeGraph'de otomatik hesaplanır)
  preview: "out: \u0017\nbin:\n00010111  .",
  fullBinary: "00010111",
  
  // Metadata
  ...
}
```

---

### 4.2 Image Mode (Before Run)

```javascript
// Henüz onRunXor() çalışmadı
node.data = {
  cipherType: "xor",
  
  // Computed by computeGraphValues()
  preview: "Ready for Run XOR",
  
  // File & Key Info
  plaintextFile: File { name: 'image.png' },
  keyBits: '01010101...',
  inputType: "image",
  
  // NOT computed yet
  xorBytes: undefined,
  
  // Handlers
  onChange: (id, patch) => void,
  onRunCipher: (id) => void,  // ← "Run XOR" button calls this
  
  // Meta
  mode: "ecb",
  showHandleLabels: boolean
}
```

---

### 4.3 Image Mode (After Run)

```javascript
// onRunXor() completed
node.data = {
  cipherType: "xor",
  
  preview: "data:image/png;base64,iVBORw0KG...",
  xorBytes: Uint8Array [R⊕k, G⊕k, B⊕k, A, ...],
  
  // Original info still here
  plaintextFile: File { ... },
  keyBits: '01010101...',
  inputType: "image",
  
  // Handler'lar
  ...
}
```

**xorBytes Format:**
```javascript
// 256 × 256 image = 262,144 pixels
// RGBA = 4 bytes per pixel
// Total = 1,048,576 bytes

[
  R1⊕key[0], G1⊕key[0], B1⊕key[0], A1(unchanged),
  R2⊕key[1], G2⊕key[1], B2⊕key[1], A2(unchanged),
  ...
]
```

---

### 4.4 AES Mode

```javascript
// AES şifreleme (text veya image)
node.data = {
  cipherType: "aes",
  
  // Key: passphrase as bits (or keyText)
  keyBits: '01010101...',
  keyText: "myPassphrase",  // optional
  
  // Image mode
  plaintextFile: File { ... },
  encryptedFile: File { ... },  // deşifrele ise
  inputType: "image" | "encrypted",
  
  // After encryptFileAES()
  preview: "data:image/png;base64,...",        // encrypted preview
  encryptedBlobUrl: "blob:http://localhost/...",
  
  // Handler'lar
  onChange: (id, patch) => void,
  onRunCipher: (id) => void,
  
  // Meta
  mode: "ecb" | "cbc" | "ctr",
  showHandleLabels: boolean
}
```

---

### 4.5 DES Mode

```javascript
// DES şifreleme (image modu)
node.data = {
  cipherType: "des",
  
  // Key: 8 karakter (64 bit)
  keyBits: '01010101' * 8,     // 64 bits
  keyText: "12345678",         // 8 chars
  
  // Image mode
  plaintextFile: File { ... },
  inputType: "image",
  
  // After encryptFileDES()
  preview: "data:image/png;base64,...",
  encryptedBlobUrl: "blob:...",
  
  // Handler'lar
  ...
}
```

**DES Key Dönüştürme:**
```javascript
// Bits → keyText dönüştür
const keyBits = '0100100001111001'; // 16 bits (2 chars)
let keyText = '';
for (let i = 0; i < 8; i++) {
  const byte = keyBits.slice(i * 8, i * 8 + 8);
  keyText += String.fromCharCode(parseInt(byte, 2));
}
// keyText = 'H' + 'y' = "Hy??????"

// ⚠️ Genellikle user passphrase olarak girer:
keyText = "password"  // 8 chars
```

---

## 5. CiphertextNode - node.data Özellikleri

### 5.1 Text/Bits Output

```javascript
// computeGraphValues() sonrası
node.data = {
  // From BlockCipherNode
  result: "out: C\nbin:\n11100111  C",
  fullBinary: "11100111",
  
  // Handler'lar
  onChange: (id, patch) => void,
  
  // Meta
  mode: "ecb",
  showHandleLabels: boolean
}
```

**Gösterim:**
```
┌─────────────────────┐
│   Ciphertext        │
├─────────────────────┤
│ out: C              │
│ bin:                │
│ 11100111  C         │
└─────────────────────┘
```

---

### 5.2 Image Output (XOR)

```javascript
// onRunXor() sonrası
node.data = {
  result: "data:image/png;base64,iVBORw0KG...",
  xorBytes: Uint8Array(262144),  // ← Raw encrypted bytes
  
  // NOT set for image mode
  fullBinary: undefined,
  
  // Handler'lar
  ...
}
```

**Gösterim:**
```
┌─────────────────┐
│   Ciphertext    │
├─────────────────┤
│ [PNG Image]     │
│ (256x256)       │
└─────────────────┘
```

---

### 5.3 Image Output (AES/DES)

```javascript
// encryptFileAES/DES() sonrası
node.data = {
  result: "data:image/png;base64,...",        // Preview
  encryptedBlobUrl: "blob:http://...",        // Download linki
  
  // Optional
  xorBytes: undefined,
  
  // Handler'lar
  ...
}
```

**Gösterim (Download)**
```
┌──────────────────────────────┐
│      Ciphertext              │
├──────────────────────────────┤
│ [PNG Preview]                │
│ <a href={encryptedBlobUrl}   │
│    download="encrypted.bin"> │
│   Download Encrypted         │
│ </a>                         │
└──────────────────────────────┘
```

---

## 6. XORNode - node.data Özellikleri

### CBC Mode'da Kullanılan Ön-İşlem Node'u

```javascript
// computeGraphValues() sonrası
node.data = {
  // Inputs
  ptInput: "10110010",        // plaintext ⊕ pc
  pcInput: "11110000",        // prevCipher (IV)
  
  // Computed
  preview: "XOR: 01000010",
  xorOutput: "01000010",      // plaintext ⊕ IV
  error: undefined,
  
  // Handler'lar
  onChange: (id, patch) => void,
  
  // Meta
  mode: "cbc",
  showHandleLabels: boolean,
  showDeleteButton: boolean
}
```

### Akış
```
PlaintextNode('10110010')
         ↓
    XORNode ← IVNode('11110000')
         ↓
  xorOutput = '10110010' ⊕ '11110000' = '01000010'
         ↓
  BlockCipherNode(plaintext='01000010', key='...')
         ↓
  result = '01000010' ⊕ key
```

---

## 7. CTRNode - node.data Özellikleri

### CTR Mode'da Nonce + Counter

```javascript
node.data = {
  // User input
  nonceBits: "1111000011110000",      // Nonce (128 bit tipik)
  counterBits: "0000000000000000",    // Counter (başlangıç = 0)
  
  // Computed
  // Not computed in node, passed to BlockCipherNode
  
  // Handler'lar
  onChange: (id, patch) => void,
  
  // Meta
  mode: "ctr",
  showHandleLabels: boolean,
  showDeleteButton: boolean
}
```

### Usage in BlockCipherNode

```javascript
// computeGraphValues() CTR Mode
const pVal = valueMap.get(ctr_node_id)?.value;  // {nonceBits, counterBits}

if (mode === "ctr" && pType === "ctr") {
  const nonceBits = pVal?.nonceBits || "";
  const counterBits = pVal?.counterBits || "";
  const nonceCounter = `${nonceBits}${counterBits}`;
  
  // Keystream = nonce||counter ⊕ key
  const keystream = xorBits(nonceCounter, kVal);
  
  // ciphertext = plaintext ⊕ keystream
  // (hesaplanır, kullanıcı pVal'i set eder)
}
```

---

## 8. valueMap - İç Veri Yapısı

### Genel Yapı
```javascript
const valueMap = new Map();

// valueMap.set(nodeId, { type, value, [keyBits] })

interface MapValue {
  type: 'bits' | 'text' | 'image' | 'encrypted' | 'ctr',
  value: string | File | {nonceBits, counterBits},
  keyBits?: string  // image mode'da
}
```

### ECB Mode Örneği
```javascript
// Nodes: Plaintext('10110010') → Key('01010101') → BlockCipher → Ciphertext

const valueMap = new Map([
  ['p1', { type: 'bits', value: '10110010' }],
  ['k1', { type: 'bits', value: '01010101' }],
  ['b1', { type: 'bits', value: '11100111' }],  // 10110010 ⊕ 01010101
  ['c1', { type: 'bits', value: '11100111' }]   // from BlockCipher
]);
```

---

### CBC Mode Örneği
```javascript
// Nodes: Plaintext → XOR + IV → BlockCipher → Ciphertext

const valueMap = new Map([
  ['p1', { type: 'bits', value: '10110010' }],
  ['iv1', { type: 'bits', value: '11110000' }],
  ['xor1', { type: 'bits', value: '01000010' }],  // 10110010 ⊕ 11110000
  ['k1', { type: 'bits', value: '01010101' }],
  ['b1', { type: 'bits', value: '00010111' }],    // 01000010 ⊕ 01010101
  ['c1', { type: 'bits', value: '00010111' }]     // from BlockCipher
]);
```

---

### Image Mode Örneği
```javascript
// Nodes: Plaintext(File) → BlockCipher + Key → Ciphertext

const valueMap = new Map([
  ['p1', { 
    type: 'image', 
    value: File { name: 'cat.png' } 
  }],
  ['k1', { 
    type: 'bits', 
    value: '01010101...' 
  }],
  ['b1', { 
    type: 'image', 
    value: File { name: 'cat.png' },
    keyBits: '01010101...'
  }],
  ['c1', { 
    type: 'image', 
    value: 'data:image/png;base64,...'  // After onRunXor()
  }]
]);
```

---

## 9. State Update Cycle

### Single State Update Akışı

```
1. User Action
   └─ PlaintextNode.onTextChange(e)
      └─ setText("ABC")
      └─ data.onChange('p1', {
           inputType: 'text',
           value: 'ABC'
         })

2. App.js Handler
   └─ setNodes((nds) => {
        const next = nds.map(n =>
          n.id === 'p1'
            ? { ...n, data: { ...n.data, value: 'ABC' } }
            : n
        );
        return computeGraphValues(next, edges, mode);
      })

3. computeGraphValues()
   ├─ valueMap['p1'] = { type: 'text', value: textToBinary('ABC') }
   ├─ valueMap['b1'] = { type: 'bits', value: result }  // XOR
   └─ return [...updated nodes...]

4. React Re-render
   ├─ BlockCipherNode.data.preview = "out: ...\nbin: ..."
   └─ CiphertextNode.data.result = "out: ...\nbin: ..."

5. UI Update
   └─ User görür yeni çıktı
```

---

## 10. Debugging: State Inspection

### Console Logging

```javascript
// App.js'de
React.useEffect(() => {
  const bcNodes = nodes.filter(n => n.type === "blockcipher");
  console.log("BlockCipher Nodes:");
  bcNodes.forEach(n => {
    console.log(`  ${n.id}:`, {
      cipherType: n.data?.cipherType,
      preview: n.data?.preview?.slice(0, 50),
      hasPlaintextFile: !!n.data?.plaintextFile,
      hasKeyBits: !!n.data?.keyBits,
      inputType: n.data?.inputType,
      xorBytes: n.data?.xorBytes?.length
    });
  });
}, [nodes]);
```

### Sample Output
```
BlockCipher Nodes:
  b1: {
    cipherType: 'xor',
    preview: 'out: C\nbin:\n11100111  C',
    hasPlaintextFile: false,
    hasKeyBits: true,
    inputType: undefined,
    xorBytes: undefined
  }
```

---

## 11. Common Patterns & Best Practices

### Pattern 1: Input Validation
```javascript
// computeGraphValues() başında
if (!pVal || !kVal) {
  n.data = { ...n.data, error: undefined, preview: "", fullBinary: undefined };
  return;
}
```

### Pattern 2: Image Mode Detection
```javascript
// computeGraphValues()
if (pType === "image" || pType === "encrypted") {
  // File mode: sadece BlockCipherNode'da data sakla
  // Image işlem onRunXor() sırasında yapılır
  n.data = {
    ...n.data,
    preview: "Ready for Run XOR",
    plaintextFile: pVal,
    keyBits: kVal
  };
  return;
}
```

### Pattern 3: Immutable Updates
```javascript
// Doğru ✅
const updated = nds.map(n =>
  n.id === targetId
    ? { ...n, data: { ...n.data, preview: newValue } }
    : n
);

// Yanlış ❌
nds[index].data.preview = newValue;  // Direct mutation
```

### Pattern 4: Mode-Specific Logic
```javascript
// computeGraphValues(nodes, edges, mode)
let computed;
if (mode === 'cbc' && prevVal) {
  // CBC: plaintext ⊕ prevCiphertext ⊕ key
  const t = xorBits(pVal, prevVal);
  computed = xorBits(t, kVal);
} else {
  // ECB: plaintext ⊕ key
  computed = xorBits(pVal, kVal);
}
```

---

## 12. Data Type Mappings

```javascript
// PlaintextNode.value → computeGraph
'text' input           → string
↓
textToBinary()
↓
'bits' → string in valueMap

// KeyNode.bits → computeGraph
'bits' input           → string
↓
(no conversion)
↓
string in valueMap

// Image File → computeGraph
File object            → File
↓
(stored as-is)
↓
File in valueMap
↓ (later in onRunXor)
fileToPixelBytes()
↓
Uint8Array

// Uint8Array → output
Uint8Array             → Uint8Array
↓
xorRgbaBytesWithKey()
↓
new Uint8Array
↓
rgbaBytesToPngDataUrl()
↓
string (DataURL)
↓
CiphertextNode.data.result
```

---

## 13. Complete Data Flow Example: "ABC" XOR "KEY"

```
┌────────────────────────────────────────────────────────────┐
│ START: User enters text="ABC", key="KEY"                   │
└────────────────────────────────────────────────────────────┘

┌─ PlaintextNode ─────────────────────────────────────────┐
│ value = "ABC"                                           │
│ inputType = "text"                                      │
└─────────────────────────────────────────────────────────┘
         │
         ▼ computeGraphValues()
┌─ textToBinary("ABC") ───────────────────────────────────┐
│ A = 65 = 01000001                                       │
│ B = 66 = 01000010                                       │
│ C = 67 = 01000011                                       │
│ Result = "010000010100001001000011" (24 bits)           │
└─────────────────────────────────────────────────────────┘
         │
         ▼ valueMap['p1']
┌─ { type: 'text', value: '010000010100001001000011' } ──┐
└─────────────────────────────────────────────────────────┘

┌─ KeyNode ───────────────────────────────────────────────┐
│ bits = "KEY"                                            │
│ (User entered ASCII string, should be bits!)            │
│ ⚠️ Invalid! User should enter bits like "01010101"      │
│                                                          │
│ Assume bits = "010001000101111101011001"               │
│              (24 bits = 3 bytes)                        │
└─────────────────────────────────────────────────────────┘
         │
         ▼ valueMap['k1']
┌─ { type: 'bits', value: '010001000101111101011001' } ──┐
└─────────────────────────────────────────────────────────┘

┌─ BlockCipherNode XOR Logic ─────────────────────────────┐
│ plaintext = '010000010100001001000011'                  │
│ key       = '010001000101111101011001'                  │
│                                                          │
│ XOR operation:                                          │
│  010000010100001001000011                              │
│  010001000101111101011001                              │
│  ────────────────────────                              │
│  000001010001110100011010                              │
│                                                          │
│ Result in 8-bit chunks:                                │
│  00000101 = 5   = SOH (Start of Heading)              │
│  00011101 = 29  = GS (Group Separator)                │
│  00011010 = 26  = SUB (Substitute)                     │
│                                                          │
│ As ASCII: (unprintable chars)                          │
│ Formatted for display: ". . ."                         │
└─────────────────────────────────────────────────────────┘
         │
         ▼ node.data.preview
┌─ BlockCipherNode ───────────────────────────────────────┐
│ preview: "out: ...\nbin:\n00000101  .\n00011101  .\n..." │
│ fullBinary: "000001010001110100011010"                  │
└─────────────────────────────────────────────────────────┘
         │
         ▼ computeGraphValues() → CiphertextNode
┌─ CiphertextNode ────────────────────────────────────────┐
│ result: "out: ...\nbin:\n00000101  .\n..."             │
│ fullBinary: "000001010001110100011010"                 │
└─────────────────────────────────────────────────────────┘
         │
         ▼ React Re-render
┌─ UI Display ────────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐                │
│ │ Ciphertext                          │                │
│ ├─────────────────────────────────────┤                │
│ │ out: ...                            │                │
│ │ bin:                                │                │
│ │ 00000101  .                         │                │
│ │ 00011101  .                         │                │
│ │ 00011010  .                         │                │
│ └─────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘

END: Encryption complete, output displayed
```

---

