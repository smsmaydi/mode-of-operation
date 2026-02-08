# 📚 Documentation Index (EN)

## Documents

1. [GETTING_STARTED.md](GETTING_STARTED.md) — where to start
2. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) — one‑page cheat sheet
3. [COMPREHENSIVE_CODE_GUIDE.md](COMPREHENSIVE_CODE_GUIDE.md) — full guide
4. [UML_DIAGRAMS.md](UML_DIAGRAMS.md) — diagrams
5. [DATA_FLOW_REFERENCE.md](DATA_FLOW_REFERENCE.md) — `node.data` reference

---

## Fast Paths

### “I need a quick overview” (5 min)
Read [QUICK_REFERENCE.md](QUICK_REFERENCE.md).

### “I want the architecture” (20 min)
Read:
1. [GETTING_STARTED.md](GETTING_STARTED.md)
2. [COMPREHENSIVE_CODE_GUIDE.md](COMPREHENSIVE_CODE_GUIDE.md)
3. [UML_DIAGRAMS.md](UML_DIAGRAMS.md)

### “I need node/data details” (20–30 min)
Read [DATA_FLOW_REFERENCE.md](DATA_FLOW_REFERENCE.md).

---

## Key Cross‑References

- `computeGraphValues()` → [COMPREHENSIVE_CODE_GUIDE.md](COMPREHENSIVE_CODE_GUIDE.md) + [UML_DIAGRAMS.md](UML_DIAGRAMS.md)
- `node.data` fields → [DATA_FLOW_REFERENCE.md](DATA_FLOW_REFERENCE.md)
- Connection rules → [COMPREHENSIVE_CODE_GUIDE.md](COMPREHENSIVE_CODE_GUIDE.md)
# 📚 Mode of Operation Visualization - Dokumentasyon Index

> **Proje:** React + ReactFlow ile Cryptographic Block Cipher Modes Görselleştirmesi  
> **Dil:** TypeScript/JavaScript (React 19)  
> **Son Güncelleme:** Şubat 2026

---

## 📖 Dokumentasyon Dosyaları

### 1. **[COMPREHENSIVE_CODE_GUIDE.md](./COMPREHENSIVE_CODE_GUIDE.md)** - 📋 Ana Rehber
Tüm kodun detaylı açıklaması, fonksiyonlar, data yapıları ve akış.

**İçerdikleri:**
- ✅ Proje mimarisi & dosya yapısı
- ✅ Data akış modeli (ECB/CBC/CTR)
- ✅ Tüm fonksiyonlar detaylı (App.js, computeGraph.js, validators.js)
- ✅ Node veri yapıları
- ✅ Şifreleme modları formülleri
- ✅ UML temel diyagramları
- ✅ Debugging tıpları
- ✅ Özetleyen tablo

**Okuma Süresi:** ~30-40 dakika

**Başlangıç İçin Okun:**
1. Proje Mimarisi
2. Data Akış Modeli
3. Şifreleme Modları (ECB/CBC/CTR)

---

### 2. **[UML_DIAGRAMS.md](./UML_DIAGRAMS.md)** - 🎨 Görsel Diyagramlar
Durum makineleri, sınıf diyagramları, sequence diyagramları, state transitions.

**İçerdikleri:**
- ✅ Durum Makinesi (State Machine)
- ✅ Sınıf Diyagramı (Class Diagram)
- ✅ Data Flow Sequence Diyagramları
- ✅ ERD (Entity-Relationship)
- ✅ Activity Diagram
- ✅ State Diagram
- ✅ Interaction Diagram
- ✅ Timing Diagram
- ✅ Object Instantiation
- ✅ Process Model
- ✅ Error Handling Flow
- ✅ Performance Considerations

**Okuma Süresi:** ~20 dakika

**Görsel Öğrenenler İçin:** Bu dosyayı ilk okuyun!

---

### 3. **[DATA_FLOW_REFERENCE.md](./DATA_FLOW_REFERENCE.md)** - 🔍 Data Detayları
Node.data özellikleri, valueMap yapısı, input türleri, state cycles.

**İçerdikleri:**
- ✅ PlaintextNode.data (Text/Bits/Image/Encrypted)
- ✅ KeyNode.data
- ✅ IVNode.data
- ✅ BlockCipherNode.data (ECB/CBC/CTR/AES/DES)
- ✅ CiphertextNode.data
- ✅ XORNode.data
- ✅ CTRNode.data
- ✅ valueMap yapısı & örnekler
- ✅ State update cycle
- ✅ Debugging inspection
- ✅ Complete workflow example

**Okuma Süresi:** ~25 dakika

**Detay Çalışması İçin:** Belirli node türü öğrenmek istediğinizde bu dosyayı kullanın.

---

## 🚀 Hızlı Başlangıç

### Senaryo 1: "Projeyi Anlamak İstiyorum"
```
1. UML_DIAGRAMS.md oku → Genel resmi gör
2. COMPREHENSIVE_CODE_GUIDE.md → "Data Akış Modeli" okul
3. COMPREHENSIVE_CODE_GUIDE.md → "Şifreleme Modları" okul
```
**Süre:** ~20 dakika

---

### Senaryo 2: "Specific Fonksiyon Öğrenmek İstiyorum"
Örnek: `onRunXor()` fonksiyonunu anlamak istiyorum.

```
1. COMPREHENSIVE_CODE_GUIDE.md → "Tüm Fonksiyonlar Detayı" → "onRunXor()"
2. DATA_FLOW_REFERENCE.md → "Debugging" → console logging
3. UML_DIAGRAMS.md → "Process Model - Complete XOR Encryption"
```

---

### Senaryo 3: "Node.data'nı Debugging Etmek İstiyorum"
Örnek: BlockCipherNode.data neyi içeriyor?

```
1. DATA_FLOW_REFERENCE.md → "BlockCipherNode - node.data Özellikleri"
2. DATA_FLOW_REFERENCE.md → "State Update Cycle"
3. COMPREHENSIVE_CODE_GUIDE.md → "Node Veri Yapıları"
```

---

### Senaryo 4: "CBC Mode'u Deep Dive"
```
1. COMPREHENSIVE_CODE_GUIDE.md → "Şifreleme Modları" → "CBC"
2. UML_DIAGRAMS.md → "Interaction Diagram - Mode Değiştirme"
3. DATA_FLOW_REFERENCE.md → "IVNode" + "XORNode"
4. COMPREHENSIVE_CODE_GUIDE.md → "Tüm Fonksiyonlar" → "computeGraphValues()"
```

---

### Senaryo 5: "Image Mode (XOR) Akışını Öğrenmek"
```
1. COMPREHENSIVE_CODE_GUIDE.md → "onRunXor()" fonksiyon
2. UML_DIAGRAMS.md → "Process Model - Complete XOR Encryption"
3. DATA_FLOW_REFERENCE.md → "Complete Data Flow Example"
```

---

## 📊 Dosya Bağlantı Haritası

```
COMPREHENSIVE_CODE_GUIDE.md
├─ Proje Mimarisi
│  └─ Dosya yapısı (src/ organization)
├─ Data Akış Modeli
│  ├─ ECB Mode
│  ├─ CBC Mode  ←─────────────┐
│  └─ CTR Mode                 │
├─ Tüm Fonksiyonlar Detayı    │
│  ├─ App.js functions  ←──────┼─────┐
│  │  ├─ onRunXor()  ←─┐      │     │
│  │  ├─ onRunCipher()  │      │     │
│  │  ├─ applyMode()    │      │     │
│  │  └─ ...            │      │     │
│  ├─ computeGraph.js   │      │     │
│  ├─ validators.js  ←──┘      │     │
│  ├─ imageXor.js      │       │     │
│  └─ presets.js   ←───┴───────┘     │
├─ Node Veri Yapıları        │
│  ├─ PlaintextNode  ←────────┼─────┐
│  ├─ KeyNode                │     │
│  ├─ BlockCipherNode  ←──────┴─┐  │
│  ├─ CiphertextNode         │  │
│  ├─ IVNode      ←────────────────┘
│  ├─ XORNode
│  └─ CTRNode
└─ UML Diyagramları

UML_DIAGRAMS.md
├─ State Machine
├─ Class Diagram  ←──┐
├─ Sequence Diagrams │ ← DATA_FLOW_REFERENCE.md ile ilişkili
├─ Activity Diagram  │
├─ State Transitions ├─ Görsel referans sağlar
├─ Interaction Chart │
├─ Timing Diagram    │
├─ Process Model  ←──┘
└─ Performance

DATA_FLOW_REFERENCE.md
├─ PlaintextNode detailed  ←──┐
├─ KeyNode detailed           │
├─ IVNode detailed            │
├─ BlockCipherNode detailed   ├─ Node.data özellik
├─ CiphertextNode detailed    │   referansı
├─ XORNode detailed           │
├─ CTRNode detailed        ←──┘
├─ valueMap examples
├─ State cycles
└─ Complete examples
```

---

## 🎯 Key Concepts & Cross-References

### computeGraphValues() - En Önemli Fonksiyon
| Belge | Bölüm |
|-------|-------|
| COMPREHENSIVE | Tüm Fonksiyonlar → computeGraph.js |
| UML | Activity Diagram |
| DATA_FLOW | State Update Cycle |

### Node.data Özellikleri
| Node Tipi | Belge | Bölüm |
|-----------|-------|-------|
| PlaintextNode | DATA_FLOW | 1. PlaintextNode |
| KeyNode | DATA_FLOW | 2. KeyNode |
| BlockCipherNode | DATA_FLOW | 4. BlockCipherNode |
| CiphertextNode | DATA_FLOW | 5. CiphertextNode |
| IVNode | DATA_FLOW | 3. IVNode |
| XORNode | DATA_FLOW | 6. XORNode |
| CTRNode | DATA_FLOW | 7. CTRNode |

### Şifreleme Modları
| Mode | Belge | Bölüm | Diagram |
|------|-------|-------|---------|
| ECB | COMPREHENSIVE | Şifreleme Modları → ECB | UML → State Machine |
| CBC | COMPREHENSIVE | Şifreleme Modları → CBC | UML → CBC Mode Zincir |
| CTR | COMPREHENSIVE | Şifreleme Modları → CTR | UML → Process Model |

### Image Mode XOR
| Konu | Belge | Bölüm |
|------|-------|-------|
| Genel akış | COMPREHENSIVE | onRunXor() |
| Detay adımlar | UML | Process Model |
| Data değişiklikleri | DATA_FLOW | Complete Data Flow Example |

---

## 💡 Sık Sorulan Sorular (FAQ)

**S: BlockCipherNode.data.preview ne içerir?**
> A: DATA_FLOW_REFERENCE.md → 4. BlockCipherNode → Preview Format

**S: valueMap nasıl çalışır?**
> A: DATA_FLOW_REFERENCE.md → 8. valueMap, COMPREHENSIVE → computeGraphValues()

**S: CBC Mode'da IV nasıl kullanılır?**
> A: COMPREHENSIVE → Şifreleme Modları → CBC, UML → CBC Mode Zincir

**S: Image XOR işlemi nasıl çalışır?**
> A: COMPREHENSIVE → onRunXor(), UML → Process Model

**S: Yeni bir cipher nasıl eklenir?**
> A: COMPREHENSIVE → Common Tasks → Adding a New Cipher Algorithm

**S: Mode değiştirme sürecinde ne olur?**
> A: UML → Interaction Diagram - Mode Değiştirme

**S: Bağlantı doğrulama kuralları nelerdir?**
> A: COMPREHENSIVE → validators.js, DATA_FLOW → ECB/CBC/CTR kuralları

---

## 🔧 Maintenance & Updates

### Documentation Structure
```
COMPREHENSIVE_CODE_GUIDE.md
├─ Doğru bilgiler (stabil)
├─ Kod referansları (değişkenler)
└─ Formüller (matematiksel)

UML_DIAGRAMS.md
├─ Görsel akışlar (zaman bağlı)
├─ State transitions
└─ Event sequences

DATA_FLOW_REFERENCE.md
├─ data property listesi
├─ Example values
└─ Type mappings
```

### Updating Guidelines
- **Yeni fonksiyon ekleme**: COMPREHENSIVE'a ekle, ilgili diyagramları güncelle
- **node.data yeni property**: DATA_FLOW'a ekle, tüm ilgili tabloları güncelle
- **Yeni mod ekleme**: Tüm 3 dosyaya ekle (formül, diyagram, data examples)

---

## 📈 Learning Path (Yol Haritası)

### Level 1: Beginner
```
┌─ Proje nedir?
│  └─ COMPREHENSIVE: Proje Mimarisi
│     └─ UML: State Machine
│
├─ Temel akış nasıl çalışır?
│  └─ COMPREHENSIVE: Data Akış Modeli
│     └─ UML: Sequence Diagrams
│
└─ Mode'lar nedir?
   └─ COMPREHENSIVE: Şifreleme Modları
      └─ UML: Mode Değiştirme Interaction
```

### Level 2: Intermediate
```
┌─ Node türleri ve data yapıları
│  └─ DATA_FLOW: Tüm node sections
│     └─ COMPREHENSIVE: Node Veri Yapıları
│
├─ computeGraphValues() nasıl çalışır?
│  └─ COMPREHENSIVE: computeGraphValues() detayı
│     └─ UML: Activity Diagram
│     └─ DATA_FLOW: State Update Cycle
│
└─ Bağlantı kuralları neler?
   └─ COMPREHENSIVE: validators.js
      └─ DATA_FLOW: Table of Rules
```

### Level 3: Advanced
```
┌─ Image XOR şifreleme derinliği
│  └─ COMPREHENSIVE: onRunXor() + imageXor.js
│     └─ UML: Process Model
│     └─ DATA_FLOW: Complete Example
│
├─ CBC Mode zinciri
│  └─ COMPREHENSIVE: CBC Mode detayı
│     └─ DATA_FLOW: IVNode + XORNode
│     └─ UML: CBC Mode Zincir Diyagramı
│
└─ Performance optimizasyonu
   └─ UML: Performance Considerations
      └─ COMPREHENSIVE: Debugging bölümü
```

---

## 🎓 Öğrenme Stilleri

### 👁️ Görsel Öğrenenler
**Başlayın:** UML_DIAGRAMS.md
- State Machine
- Class Diagram
- Sequence Diagrams
- Activity Diagram

### 📝 Okuyucu Öğrenenler
**Başlayın:** COMPREHENSIVE_CODE_GUIDE.md
- Proje Mimarisi
- Tüm Fonksiyonlar Detayı
- Node Veri Yapıları

### 💬 Dinleyici Öğrenenler
**Başlayın:** COMPREHENSIVE_CODE_GUIDE.md
- Proje Mimarisi
- Data Akış Modeli (sesli açıkla)
- Fonksiyon Çağrı Ağacı

### 🔨 Hands-On Öğrenenler
**Başlayın:** DATA_FLOW_REFERENCE.md
- State Update Cycle
- Complete Data Flow Example
- Debugging: State Inspection

---

## 🔗 External Resources

### Cryptography Foundations
- Electronic Codebook (ECB) Mode - NIST guidelines
- Cipher Block Chaining (CBC) Mode - RFC 3394
- Counter (CTR) Mode - RFC 3610

### ReactFlow
- [ReactFlow Documentation](https://reactflow.dev/)
- Custom Nodes & Handles
- State Management

### React Patterns
- useCallback, useMemo
- Immutable state updates
- Event handling

---

## 📞 İletişim & Destek

Belgelerde:
- ❓ Belirsiz bölümler: Fonksiyon Çağrı Ağacı
- 🐛 Debugging: COMPREHENSIVE → Debugging Tıpları
- ⚙️ Konfigürasyon: COMPREHENSIVE → Önemli Konstantes

---

## 📋 Checklist - Belgeleri Anladınız mı?

### COMPREHENSIVE_CODE_GUIDE.md
- [ ] Proje mimarisi anladım
- [ ] computeGraphValues() fonksiyonunun akışını anladım
- [ ] ECB/CBC/CTR modlarının farkını anladım
- [ ] Tüm node türlerinin amacını anladım
- [ ] applyMode() ve validator'ları anladım

### UML_DIAGRAMS.md
- [ ] State Machine'i takip edebildim
- [ ] Class Diagram'daki ilişkileri gördüm
- [ ] Sequence Diagram'lar mantıklı geldi
- [ ] Activity Diagram'ı adım adım izledim
- [ ] Process Model'i tamamını anladım

### DATA_FLOW_REFERENCE.md
- [ ] Tüm node.data properties'leri öğrendim
- [ ] valueMap yapısını anladım
- [ ] State update cycle'ı takip edebildim
- [ ] Complete example'ı çalıştırabilirdim
- [ ] Debugging tekniklerini kullanabilirim

---

**Last Updated:** Şubat 8, 2026  
**Version:** 1.0  
**Language:** Türkçe & İngilizce (Mixed)
