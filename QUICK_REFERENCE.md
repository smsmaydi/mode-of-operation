# 🎯 Quick Reference (EN)

## Project Layout
```
src/
├── App.js                # main state + handlers
├── components/nodes/     # ReactFlow nodes
└── utils/                # computeGraph, validators, crypto
```

---

## Core Functions

| Function | File | Purpose |
|---|---|---|
| `computeGraphValues()` | utils/computeGraph.js | propagate values |
| `onRunXor()` | App.js | image XOR execution |
| `onRunCipher()` | App.js | XOR/AES/DES routing |
| `applyMode()` | App.js | load preset & handlers |
| `makeIsValidConnection()` | utils/validators.js | connection rules |

---

## Modes

**ECB:** $C = P \oplus K$

**CBC:** $C_i = (P_i \oplus C_{i-1}) \oplus K$ (first uses IV)

**CTR:** $Keystream = (Nonce||Counter) \oplus K$, $C = P \oplus Keystream$

---

## Node Data (Essentials)

### PlaintextNode
```js
{ inputType: 'bits'|'text'|'image'|'encrypted', value: string|File }
```

### KeyNode
```js
{ bits: string }
```

### BlockCipherNode
```js
{ cipherType: 'xor'|'aes'|'des', preview?, fullBinary?, keyBits?, plaintextFile? }
```

### CiphertextNode
```js
{ result?, fullBinary?, xorBytes? }
```

---

## Data Flow (Short)

```
User input → onChange → computeGraphValues → nodes updated → UI
```

---

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| Missing inputs | No plaintext or key | Provide both |
| Invalid IV | Not 0/1 or not 8‑bit aligned | Fix IV bits |
| File read failed | Browser read error | Retry/replace file |
# 🎯 Quick Reference - Hızlı Referans Kartı

> **Bunu yadımda tut:** En sık kullanılan bilgiler tek sayfada

---

## 📊 Proje Yapısı

```
src/
├── App.js                    ⭐ Ana uygulama (state, handlers)
├── components/
│   ├── nodes/                ▪ ReactFlow node bileşenleri
│   │   ├── PlaintextNode.jsx ▪ Girdi (text/bits/image)
│   │   ├── KeyNode.jsx       ▪ Anahtar
│   │   ├── BlockCipherNode.jsx▪ Şifreleme işlemi
│   │   ├── CiphertextNode.jsx▪ Çıktı
│   │   ├── IVNode.jsx        ▪ Başlatma vektörü
│   │   ├── XorPreBlockNode.jsx▪ CBC ön XOR
│   │   └── CtrNode.jsx       ▪ CTR: nonce+counter
│   └── crypto/
│       └── imageToBytes.js   ▪ Resim → bytes
└── utils/
    ├── computeGraph.js       ⭐ State engine (main!)
    ├── validators.js         ▪ Bağlantı kuralları
    ├── imageXor.js           ▪ XOR şifreleme
    ├── presets.js            ▪ ECB/CBC/CTR layouts
    └── ...
```

---

## ⚙️ Main Functions - Temel Fonksiyonlar

| Fonksiyon | Dosya | Amaç | Giriş |
|-----------|-------|------|-------|
| **computeGraphValues()** | computeGraph.js | State hesapla | nodes, edges, mode |
| **onRunXor()** | App.js | Image XOR şifrele | blockId, nodes, edges, mode |
| **onRunCipher()** | App.js | Cipher yönlendir | blockId |
| **applyMode()** | App.js | Mod yükle | mode |
| **makeIsValidConnection()** | validators.js | Bağlantı kuralı | mode |
| **xorRgbaBytesWithKey()** | imageXor.js | Pixel XOR | rgbaBytes, keyBits |
| **fileToPixelBytes()** | imageToBytes.js | Resim → bytes | File, {w, h} |

---

## 🔄 Data Flow - Veri Akışı

```
User Input → PlaintextNode.onChange() → computeGraphValues()
                                              ↓
                                         valueMap {}
                                              ↓
                                    BlockCipherNode (XOR)
                                              ↓
                                    CiphertextNode.data
                                              ↓
                                         UI Display
```

**Image Mode:**
```
User uploads image → PlaintextNode.data.value = File
                                    ↓
                            computeGraphValues()
                                    ↓
                    BlockCipherNode.data = {
                        plaintextFile: File,
                        keyBits: string,
                        preview: "Ready for Run XOR"
                    }
                                    ↓
                            User clicks "Run XOR"
                                    ↓
                            onRunXor() {
                                fileToPixelBytes() → Uint8Array
                                xorRgbaBytesWithKey() → XOR
                                rgbaBytesToPngDataUrl() → PNG
                                setNodes() update
                            }
                                    ↓
                    CiphertextNode.data.result = PNG DataURL
```

---

## 🎛️ Modes & Formulas - Modlar ve Formüller

### ECB
```
Ciphertext = Plaintext ⊕ Key

Bağlantılar:
  Plaintext(out) → BlockCipher(plaintext)
  Key(out) → BlockCipher(key)
  BlockCipher(out) → Ciphertext(in)
```

### CBC
```
C₁ = Plaintext₁ ⊕ IV ⊕ Key
Cᵢ = Plaintextᵢ ⊕ Cᵢ₋₁ ⊕ Key

Bağlantılar:
  Plaintext(out) → XOR(pt)
  IV(out) → XOR(pc)
  XOR(out) → BlockCipher(plaintext)
  Key(out) → BlockCipher(key)
  Ciphertext(out) → BlockCipher(prevCipher) [sonraki blok]
```

### CTR
```
Keystream = Nonce||Counter ⊕ Key
Ciphertext = Plaintext ⊕ Keystream

Bağlantılar:
  CTR(out) → BlockCipher(ctr)
  Key(out) → BlockCipher(key)
```

---

## 📦 Node.data Structure - Node Veri Yapısı

### PlaintextNode
```javascript
{
  inputType: "text" | "bits" | "image" | "encrypted",
  value: string | File,
  onChange: (id, patch) => void
}
```

### KeyNode
```javascript
{
  bits: string,  // "01010101"
  onChange: (id, patch) => void
}
```

### BlockCipherNode (Text/Bits)
```javascript
{
  cipherType: "xor" | "aes" | "des",
  preview: string,        // Görüntü için
  fullBinary: string,     // Raw sonuç
  error: string | undefined
}
```

### BlockCipherNode (Image)
```javascript
{
  cipherType: "xor",
  preview: "Ready for Run XOR",
  plaintextFile: File,
  keyBits: string,
  inputType: "image",
  // After onRunXor():
  preview: "data:image/png;base64,...",
  xorBytes: Uint8Array
}
```

### CiphertextNode
```javascript
{
  result: string,        // Text veya DataURL
  fullBinary: string,    // Text mode'da
  xorBytes: Uint8Array   // Image mode'da
}
```

---

## 🎯 computeGraphValues() - Ana Engine

### Adımlar
1. **valueMap oluştur** → {nodeId: {type, value}}
2. **Plaintext node'ları** → input type'ını oku
3. **Key node'ları** → bits'i oku
4. **XOR node'ları** (CBC) → plaintext ⊕ prevCipher/IV
5. **BlockCipher node'ları** → cipher işlem uygula
6. **Ciphertext node'ları** → output doldur

### Mantık
```javascript
// ECB
computed = xorBits(plaintext, key);

// CBC
if (prevCiphertext) {
  const temp = xorBits(plaintext, prevCiphertext);
  computed = xorBits(temp, key);
} else {
  computed = xorBits(plaintext, key);
}

// Image Mode
if (inputType === "image") {
  // File'ı sakla, onRunXor()'de işle
  return;
}
```

---

## 🔌 Connection Validation Rules - Bağlantı Kuralları

### ECB Mode
```
✅ Plaintext(out) → BlockCipher(plaintext)
✅ Key(out) → BlockCipher(key)
✅ BlockCipher(out) → Ciphertext(in)
❌ Diğer bağlantılar
```

### CBC Mode
```
✅ Plaintext → BlockCipher(plaintext)
✅ Plaintext → XOR(pt)
✅ Key → BlockCipher(key)
✅ IV → BlockCipher(prevCipher)
✅ IV → XOR(pc)
✅ Ciphertext → BlockCipher(prevCipher) [zincir]
✅ Ciphertext → XOR(pc) [zincir]
✅ XOR → BlockCipher(plaintext)
```

---

## 📱 State Update Flow - State Güncelleme Akışı

```
1. User Input (text/bits/image)
        ↓
2. PlaintextNode.onChange(id, patch)
        ↓
3. setNodes((nds) => {
     const next = nds.map(...);
     return computeGraphValues(next, edges, mode);
   })
        ↓
4. BlockCipherNode.data güncellemeleri
        ↓
5. CiphertextNode.data güncellemeleri
        ↓
6. React Re-render
        ↓
7. UI Display
```

---

## 🖼️ Image Mode XOR Steps - Resim XOR Adımları

```
1. fileToPixelBytes(file, {256, 256})
   ├─ FileReader.readAsDataURL()
   ├─ Image.decode()
   ├─ Canvas.getImageData()
   └─ Uint8Array (262K bytes = 256×256×4)

2. bitStringToBytes(keyBits)
   ├─ "01010101" → [85]
   └─ Uint8Array

3. xorRgbaBytesWithKey(pixels, keyBits)
   ├─ for (i = 0; i < bytes.length; i += 4)
   ├─   R⊕key, G⊕key, B⊕key, A (unchanged)
   └─ Uint8Array (encrypted)

4. rgbaBytesToPngDataUrl(encrypted, 256, 256)
   ├─ Canvas.putImageData()
   └─ canvas.toDataURL("image/png")

5. setNodes() BlockCipher + Ciphertext güncelle
```

---

## 🛠️ Common Patterns - Yaygın Kalıplar

### Immutable Update
```javascript
// ✅ Doğru
setNodes((nds) => nds.map(n =>
  n.id === id
    ? { ...n, data: { ...n.data, preview: val } }
    : n
));

// ❌ Yanlış
nds[idx].data.preview = val;  // Mutation!
```

### Input Validation
```javascript
if (!pVal || !kVal) {
  n.data = { ...n.data, error: undefined, preview: "" };
  return;
}
```

### Mode-Specific Logic
```javascript
if (mode === 'cbc' && prevVal) {
  // CBC logic
} else {
  // ECB logic (or first block)
}
```

---

## 🐛 Debugging Tips - Debugging İpuçları

### Console Emojis
```
🎯 Process start
🔍 Value inspection
🔐 Encryption operation
✅ Success
❌ Error
📁 File operation
🖼️ Image mode
```

### State Inspection
```javascript
// App.js'de
console.log("valueMap:", valueMap);
console.log("blockcipher nodes:", 
  nodes.filter(n => n.type === "blockcipher")
       .map(n => n.data)
);
```

---

## 📝 Text to Bits Dönüşüm

```javascript
// "ABC" → binary
A = 65 = 01000001
B = 66 = 01000010
C = 67 = 01000011

Result = "010000010100001001000011"
```

---

## 🔢 Byte Formats - Byte Formatları

```javascript
// RGBA Pixel Array
[R1, G1, B1, A1, R2, G2, B2, A2, ...]

// 256×256 image
256 × 256 = 65,536 pixels
65,536 × 4 = 262,144 bytes
≈ 1 MB (uncompressed)

// After PNG compression
~350 KB (base64 data URL)
```

---

## 📋 Property Checklist - Özellik Kontrol Listesi

### PlaintextNode
- [ ] inputType: "text" | "bits" | "image" | "encrypted"
- [ ] value: string | File
- [ ] onChange: callback

### KeyNode
- [ ] bits: string
- [ ] onChange: callback

### BlockCipherNode
- [ ] cipherType: "xor" | "aes" | "des"
- [ ] preview: string (Text/Bits) | DataURL (Image)
- [ ] fullBinary: string (Text/Bits)
- [ ] plaintextFile: File (Image mode)
- [ ] keyBits: string
- [ ] onRunCipher: callback

### CiphertextNode
- [ ] result: string | DataURL
- [ ] fullBinary: string (Text)
- [ ] xorBytes: Uint8Array (Image)

---

## 🚨 Common Errors - Sık Hatalar

| Hata | Sebep | Çözüm |
|------|-------|-------|
| "Missing inputs" | Key veya plaintext yok | Değer gir |
| "keyBits is not string" | Key type invalid | Bitstring kullan |
| "Invalid IV format" | IV bits yanlış | 8'in katı ol |
| "File read failed" | File okuma hatası | Browser izin ver |
| "Image load failed" | Resim decode hatası | Geçerli PNG kul |
| "Connection invalid" | Bağlantı kurala uymuyor | Validator'ı kontrol et |

---

## 🎓 Learning Order - Öğrenme Sırası

1. **Modes** → ECB/CBC/CTR formülü
2. **Node Types** → Tüm node veri yapıları
3. **computeGraphValues()** → Ana state engine
4. **Image Mode** → onRunXor() akışı
5. **Validation** → Connection rules
6. **Debugging** → Console logging

---

## 🔗 Important Files - Önemli Dosyalar

- **App.js** → Main state container
- **computeGraph.js** → State calculation engine
- **validators.js** → Connection rules
- **imageXor.js** → XOR operations
- **presets.js** → Mode layouts

---

## 📚 Where to Find

| Soru | Dosya | Bölüm |
|------|-------|-------|
| Proje mimarisi? | COMPREHENSIVE | Proje Mimarisi |
| node.data detayı? | DATA_FLOW | Spesifik node section |
| Mode formülleri? | COMPREHENSIVE | Şifreleme Modları |
| Diagram görmek? | UML | Duyguya göre bölüm |
| computeGraph()? | COMPREHENSIVE | Tüm Fonksiyonlar |
| Debugging? | COMPREHENSIVE | Debugging Tıpları |

---

**Print this page for quick reference!**  
**Hızlı referans için bu sayfayı yazdır!**
