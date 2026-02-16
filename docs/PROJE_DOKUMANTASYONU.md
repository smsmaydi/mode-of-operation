# 🔐 Şifreleme Simülasyonu Projesi – Dokümantasyon

Bu dosya projenin mevcut yapısını, dünden beri yapılan değişiklikleri ve veri akışını açıklar.

---

## 📋 İçindekiler

1. [Proje Özeti](#1-proje-özeti)
2. [Dünden Beri Yapılan Değişiklikler](#2-dünden-beri-yapılan-değişiklikler)
3. [Proje Yapısı](#3-proje-yapısı)
4. [UML – Bileşen Diyagramı](#4-uml--bileşen-diyagramı)
5. [UML – Node Tipleri ve Bağlantılar](#5-uml--node-tipleri-ve-bağlantılar)
6. [Veri Akışı](#6-veri-akışı)
7. [Modlar (ECB, CBC, CTR)](#7-modlar-ecb-cbc-ctr)

---

## 1. Proje Özeti

**Amaç:** ECB, CBC ve CTR blok şifre modlarını görsel bir grafik arayüzünde simüle eden bir React uygulaması.

**Teknolojiler:**
- React 19 + ReactFlow (grafik canvas)
- CryptoJS (AES şifreleme)
- crypto-js, node-forge

**Ana Özellikler:**
- XOR ve AES algoritmaları ile bit/metin/resim şifreleme
- ECB, CBC, CTR modları
- Sürükle-bırak ile node bağlama
- AES SubBytes görselleştirmesi

---

## 2. Dünden Beri Yapılan Değişiklikler

### 2.1 cipherHandlers.js Parçalanması

**Önce:** Tek dosya, ~634 satır

**Sonra:** `cipherHandlers/` klasörü altında modüler yapı:

```
cipherHandlers/
├── bitsToHex.js    → Binary → Hex dönüşümü
├── xorHandler.js   → XOR şifreleme (resim + ECB/CBC)
├── aesHandler.js   → AES ECB, CBC, GCM (resim modu)
└── index.js        → runCipherHandler (router)
```

| Dosya | Satır | Sorumluluk |
|-------|-------|------------|
| `bitsToHex.js` | ~12 | `bitsToHex(bits)` yardımcı fonksiyonu |
| `xorHandler.js` | ~131 | `runXorHandler` – XOR ile resim şifreleme |
| `aesHandler.js` | ~190 | `runAesImageHandler` – AES ECB/CBC/GCM resim |
| `index.js` | ~88 | `runCipherHandler`, `runXorHandler`, `bitsToHex` export |

### 2.2 DES Algoritmasının Kaldırılması

Kullanılmayan DES kodu kaldırıldı:

| Kaldırılan | Açıklama |
|------------|----------|
| `desFile.js` | Dosya tamamen silindi |
| `cipherHandlers` | DES import ve handler kaldırıldı |
| `computeGraph.js` | `encryptBitsWithDES`, `decryptBitsWithDES` ve tüm DES dalları |
| `BlockCipherNode.jsx` | DES fallback mantığı |
| `CiphertextNode.jsx` | `cipherType === "des"` kontrolleri |
| `DecryptNode.jsx` | DES seçeneği dropdown'dan kaldırıldı |

### 2.3 Özet

```
Önce:  cipherHandlers.js (634 satır) + desFile.js + DES kodu her yerde
Sonra: cipherHandlers/ (4 modül, ~420 satır) + DES yok
```

---

## 3. Proje Yapısı

```
src/
├── App.js                    # Ana uygulama, state, event handler'lar
├── index.js
├── index.css
│
├── components/
│   ├── nodes/                # ReactFlow node bileşenleri
│   │   ├── PlaintextNode.jsx # Girdi (bits/text/image)
│   │   ├── KeyNode.jsx       # Anahtar
│   │   ├── BlockCipherNode.jsx # XOR veya AES seçimi + Run
│   │   ├── CiphertextNode.jsx  # Şifrelenmiş çıktı
│   │   ├── IVNode.jsx        # CBC için IV
│   │   ├── XorPreBlockNode.jsx# CBC: PT ⊕ IV
│   │   ├── CtrNode.jsx       # CTR: nonce + counter
│   │   └── DecryptNode.jsx   # Şifre çözme (AES)
│   │
│   ├── aes/
│   │   └── SubBytesView.jsx  # AES SubBytes görselleştirme
│   │
│   ├── crypto/
│   │   └── imageToBytes.js   # Resim → pixel byte dizisi
│   │
│   ├── layout/
│   │   ├── ModeMenu.jsx      # ECB/CBC/CTR/Free seçimi
│   │   ├── StepEdge.jsx
│   │   └── SineEdge.jsx
│   │
│   └── palette/
│       └── NodePalette.jsx   # Sürükle-bırak node paleti
│
└── utils/
    ├── cipherHandlers/       # Görsel şifreleme (resim modu)
    │   ├── index.js
    │   ├── bitsToHex.js
    │   ├── xorHandler.js
    │   └── aesHandler.js
    │
    ├── computeGraph.js       # Bit/metin şifreleme + graph hesaplama (~1000 satır)
    ├── presets.js            # ECB/CBC/CTR/Free preset node + edge
    ├── validators.js         # Bağlantı kuralları (hangi node nereye)
    │
    ├── aesFile.js            # AES-GCM dosya şifreleme
    ├── aesEcbImage.js        # AES-ECB resim (blok blok)
    ├── aesCbcImage.js        # AES-CBC resim (IV + zincir)
    ├── aesSBox.js            # AES S-Box tablosu
    ├── aesViewData.js        # SubBytes view için veri hazırlama
    │
    ├── imageXor.js           # RGBA ⊕ key bits
    ├── xorImageFile.js       # Resim XOR yardımcı
    ├── bitwise.js            # xorBits(bit1, bit2)
    ├── bytesToDataUrl.js     # Byte[] → PNG data URL
    │
    ├── ecbTrace.js           # ECB ilk N blok trace
    └── nodeHelpers.js        # checkModeForDeleteButton vb.
```

---

## 4. UML – Bileşen Diyagramı

```mermaid
flowchart TB
    subgraph App["App.js (Ana Uygulama)"]
        State["State: nodes, edges, mode"]
        Handlers["Handlers: onRunCipher, onRunXor"]
    end

    subgraph ReactFlow["ReactFlow Canvas"]
        Canvas["nodes + edges + nodeTypes"]
    end

    subgraph CipherHandlers["utils/cipherHandlers"]
        CH_index["index.js - runCipherHandler"]
        CH_xor["xorHandler.js"]
        CH_aes["aesHandler.js"]
        CH_index --> CH_xor
        CH_index --> CH_aes
    end

    subgraph ComputeGraph["utils/computeGraph.js"]
        CG["computeGraphValues(nodes, edges, mode)"]
    end

    subgraph Presets["utils/presets.js"]
        Preset["buildPreset(mode)"]
    end

    subgraph Validators["utils/validators.js"]
        Valid["makeIsValidConnection(mode)"]
    end

    subgraph AES_Utils["AES Yardımcılar"]
        aesFile["aesFile.js (GCM)"]
        aesEcb["aesEcbImage.js"]
        aesCbc["aesCbcImage.js"]
    end

    App --> Canvas
    App --> CipherHandlers
    App --> ComputeGraph
    App --> Presets
    App --> Validators
    CH_aes --> aesFile
    CH_aes --> aesEcb
    CH_aes --> aesCbc
```

---

## 5. UML – Node Tipleri ve Bağlantılar

```mermaid
flowchart LR
    subgraph ECB["ECB Modu"]
        P1[Plaintext]
        K1[Key]
        B1[BlockCipher]
        C1[Ciphertext]
        P1 -->|plaintext| B1
        K1 -->|key| B1
        B1 -->|out| C1
    end

    subgraph CBC["CBC Modu"]
        P2[Plaintext]
        IV[IV]
        XOR[XOR]
        K2[Key]
        B2[BlockCipher]
        C2[Ciphertext]
        P2 -->|pt| XOR
        IV -->|pc| XOR
        XOR -->|xor| B2
        K2 -->|key| B2
        B2 -->|out| C2
    end

    subgraph CTR["CTR Modu"]
        P3[Plaintext]
        CTR_N[CtrNode]
        B3[BlockCipher]
        XOR2[XOR]
        C3[Ciphertext]
        CTR_N -->|ctr| B3
        B3 -->|keystream| XOR2
        P3 -->|pt| XOR2
        XOR2 --> C3
    end
```

### Node Tipleri Tablosu

| Node | Tip | Girdi | Çıktı | Kullanım |
|------|-----|-------|-------|----------|
| **PlaintextNode** | plaintext | bits/text/image/encryptedFile | value | Açık metin veya şifreli dosya |
| **KeyNode** | key | bits / keyText | bits, keyText | Anahtar (binary veya hex) |
| **BlockCipherNode** | blockcipher | plaintext/xor, key | out | XOR veya AES, "Run" ile tetiklenir |
| **CiphertextNode** | ciphertext | in (BlockCipher/XOR) | - | Şifrelenmiş sonuç |
| **IVNode** | iv | bits (128 bit) | bits | CBC için başlangıç vektörü |
| **XorPreBlockNode** | xor | pt, pc (IV/prevCipher) | out | PT ⊕ IV veya PT ⊕ prevCT |
| **CtrNode** | ctr | nonceBits, counterBits | ctr | CTR modu için nonce + sayaç |
| **DecryptNode** | decrypt | encrypted, key | out | AES ile şifre çözme |

---

## 6. Veri Akışı

### 6.1 Yüksek Seviye Veri Akışı

```mermaid
flowchart TD
    User[Kullanıcı]
    
    subgraph Input["Girdiler"]
        PT[PlaintextNode: bits/text/image]
        Key[KeyNode: key bits]
        IV[IVNode: 128 bit]
    end

    subgraph Processing["İşleme"]
        ComputeGraph["computeGraphValues()"]
        CipherHandlers["cipherHandlers"]
        
        ComputeGraph -->|bits/text| Direct[Doğrudan hesaplama]
        CipherHandlers -->|image| RunButton["Run butonu tetiklenir"]
    end

    subgraph Output["Çıktı"]
        CT[CiphertextNode]
    end

    User --> Input
    Input --> ComputeGraph
    Input --> CipherHandlers
    Direct --> CT
    RunButton --> CT
```

### 6.2 computeGraphValues Veri Akışı

```mermaid
flowchart LR
    subgraph Step1["1. valueMap doldurma"]
        PT[Plaintext] --> VM[valueMap]
        Key[Key] --> VM
        IV[IV] --> VM
        CTR[CTR] --> VM
    end

    subgraph Step2["2. Node işleme (sıra önemli)"]
        VM --> XOR1[XOR pre-block]
        XOR1 --> BC[BlockCipher]
        BC --> Dec[Decrypt]
        Dec --> XOR2[XOR post-block CTR]
        XOR2 --> CT[Ciphertext]
    end

    subgraph Step3["3. Sonuç"]
        CT --> Result[Güncellenmiş nodes]
    end
```

### 6.3 Run Butonu (Resim Modu) Akışı

```mermaid
sequenceDiagram
    participant User
    participant BlockCipher
    participant runCipherHandler
    participant xorHandler
    participant aesHandler

    User->>BlockCipher: Run tıkla
    BlockCipher->>runCipherHandler: onRunCipher(blockId)
    
    alt cipherType === "xor"
        runCipherHandler->>xorHandler: runXorHandler()
        xorHandler->>xorHandler: fileToPixelBytes → xorRgbaBytesWithKey
        xorHandler->>BlockCipher: setNodes (preview, xorBytes)
    else cipherType === "aes"
        runCipherHandler->>aesHandler: runAesImageHandler()
        aesHandler->>aesHandler: ECB / CBC / GCM
        aesHandler->>BlockCipher: setNodes (preview, encryptedBlobUrl)
    end
```

### 6.4 computeGraph İç Akışı (BlockCipher)

```mermaid
flowchart TD
    BC[BlockCipher node]
    
    BC --> Check{input type?}
    
    Check -->|image| Image[plaintextFile, keyBits setle]
    Check -->|encryptedFile| DecryptFile[encryptedImageFile setle]
    Check -->|ctr| CTR[Keystream hesapla]
    Check -->|bits/text| Cipher{Cipher?}
    
    Cipher -->|xor| XOR[xorBits]
    Cipher -->|aes| AES[encryptBitsWithAES]
    
    Image --> Wait[Run beklenir]
    DecryptFile --> Wait
    CTR --> Val[valueMap.set]
    XOR --> Val
    AES --> Val
    
    Val --> Out[Outgoing edges → Ciphertext güncelle]
```

---

## 7. Modlar (ECB, CBC, CTR)

### ECB (Electronic Codebook)

```
Plaintext ──┬──► BlockCipher ──► Ciphertext
            │        ▲
Key ────────┴────────┘

Her blok bağımsız şifrelenir. Aynı plaintext = aynı ciphertext.
```

### CBC (Cipher Block Chaining)

```
Plaintext ──► XOR ◄── IV (veya prevCipher)
              │
              ▼
         BlockCipher ──► Ciphertext ──► (sonraki blok için prevCipher)
              ▲
Key ──────────┘

PT ⊕ IV (veya prevCT) → BlockCipher → CT. Pattern gizlenir.
```

### CTR (Counter)

```
CtrNode(nonce+counter) ──► BlockCipher ──► Keystream
                                              │
Plaintext ────────────────────────────────────► XOR ──► Ciphertext

Keystream = E(nonce||counter, key)
CT = PT ⊕ Keystream
```

---

## 8. Dosya Bağımlılıkları (Özet)

```
App.js
├── cipherHandlers (runCipherHandler, runXorHandler)
├── computeGraph (computeGraphValues)
├── presets (buildPreset)
├── validators (makeIsValidConnection)
├── ecbTrace
└── node components

cipherHandlers/index.js
├── xorHandler
├── aesHandler
└── bitsToHex

cipherHandlers/aesHandler.js
├── aesFile
├── aesEcbImage
├── aesCbcImage
├── imageToBytes
├── bytesToDataUrl
└── bitsToHex

computeGraph.js
├── bitwise (xorBits)
├── crypto-js
└── (kendi helpers: bitsToHex, textToBinary, encryptBitsWithAES, decryptBitsWithAES)
```

---

## 9. Önemli Notlar

- **Resim modu:** PlaintextNode'da image/encryptedFile seçildiğinde işlem `cipherHandlers` ile yapılır; **Run** butonuna basılması gerekir.
- **Bit/metin modu:** `computeGraphValues` edge değişimlerinde ve node değişimlerinde otomatik çalışır.
- **computeGraph.js** hâlâ ~1000 satır; ileride `cipherHandlers` benzeri şekilde parçalanabilir.
