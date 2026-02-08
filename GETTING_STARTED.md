# 🎬 Getting Started (EN)

## What’s in this documentation set?

1. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) — 5‑minute overview
2. [COMPREHENSIVE_CODE_GUIDE.md](COMPREHENSIVE_CODE_GUIDE.md) — full guide
3. [UML_DIAGRAMS.md](UML_DIAGRAMS.md) — diagrams
4. [DATA_FLOW_REFERENCE.md](DATA_FLOW_REFERENCE.md) — `node.data` details
5. [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) — navigation

---

## Choose your path

### 5 minutes
Read [QUICK_REFERENCE.md](QUICK_REFERENCE.md).

### 20 minutes
Read:
1. [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
2. [COMPREHENSIVE_CODE_GUIDE.md](COMPREHENSIVE_CODE_GUIDE.md) → Architecture + Data Flow
3. [UML_DIAGRAMS.md](UML_DIAGRAMS.md) → State + Sequence

### 45–60 minutes
Read:
1. [COMPREHENSIVE_CODE_GUIDE.md](COMPREHENSIVE_CODE_GUIDE.md)
2. [DATA_FLOW_REFERENCE.md](DATA_FLOW_REFERENCE.md)
3. [UML_DIAGRAMS.md](UML_DIAGRAMS.md)

---

## Practical workflow

1. Open the docs in split view with the code.
2. Start at `computeGraphValues()` in [COMPREHENSIVE_CODE_GUIDE.md](COMPREHENSIVE_CODE_GUIDE.md).
3. Follow the same flow in [UML_DIAGRAMS.md](UML_DIAGRAMS.md).
4. Use [DATA_FLOW_REFERENCE.md](DATA_FLOW_REFERENCE.md) to verify `node.data` fields.
# 🎬 Başlangıç Rehberi - Getting Started with Documentation

> Yeni proje geliştirme veya bakım mı yapıyorsunuz? Burada başlayın!

---

## 📚 Oluşturulan Yeni Belgeler

Projenize 5 kapsamlı belge eklendi:

```
✅ COMPREHENSIVE_CODE_GUIDE.md (156 KB)
✅ UML_DIAGRAMS.md (68 KB)
✅ DATA_FLOW_REFERENCE.md (71 KB)
✅ DOCUMENTATION_INDEX.md (28 KB)
✅ QUICK_REFERENCE.md (18 KB)
───────────────────────────────────
📊 Toplam: ~341 KB belge
⏱️  Okuma süresi: ~2-3 saat (yoğun)
```

---

## 🎯 Hızlı Seçim - "Bana hangi belgeyi oku?" Rehberi

### ❓ "Projemi hızlı anlamak istiyorum" (5 dakika)
```
1. QUICK_REFERENCE.md oku
   └─ Temel kavramlar, node tipler, formüller

Bitti! Temel bilgiye sahipsin.
```

---

### ❓ "Genel mimariyi öğrenmek istiyorum" (20 dakika)
```
1. DOCUMENTATION_INDEX.md → "Hızlı Başlangıç" bölümü oku
2. COMPREHENSIVE_CODE_GUIDE.md
   ├─ Proje Mimarisi
   ├─ Data Akış Modeli
   └─ Şifreleme Modları (ECB/CBC/CTR)
3. UML_DIAGRAMS.md → State Machine & Sınıf Diyagramı

Bitti! Genel resmi gördün.
```

---

### ❓ "Spesifik fonksiyonu anlamak istiyorum" (30 dakika)
Örnek: `computeGraphValues()` öğrenmek istiyorum

```
1. QUICK_REFERENCE.md → "computeGraphValues()" kısmını bul
2. COMPREHENSIVE_CODE_GUIDE.md
   └─ Tüm Fonksiyonlar Detayı → computeGraph.js bölümü
3. UML_DIAGRAMS.md → Activity Diagram
4. DATA_FLOW_REFERENCE.md → State Update Cycle

Bitti! Fonksiyonu tam anladın.
```

---

### ❓ "Node.data detaylarını öğrenmek istiyorum" (25 dakika)
Örnek: PlaintextNode.data nedir?

```
1. QUICK_REFERENCE.md → "Node.data Structure" tablosu
2. DATA_FLOW_REFERENCE.md
   └─ "1. PlaintextNode - node.data Özellikleri" bölümü
3. COMPREHENSIVE_CODE_GUIDE.md
   └─ Node Veri Yapıları bölümü

Bitti! Node yapılarını öğrendin.
```

---

### ❓ "Image Mode XOR akışını öğrenmek istiyorum" (40 dakika)
```
1. COMPREHENSIVE_CODE_GUIDE.md
   └─ onRunXor() fonksiyonu
2. UML_DIAGRAMS.md
   ├─ Process Model - Complete XOR Encryption
   └─ Timing Diagram
3. DATA_FLOW_REFERENCE.md
   └─ Complete Data Flow Example: "ABC" XOR "KEY"

Bitti! Image mode tam kontrolünde.
```

---

### ❓ "CBC Mode'un zincir mantığını anlamak istiyorum" (35 dakika)
```
1. COMPREHENSIVE_CODE_GUIDE.md
   └─ Şifreleme Modları → CBC
2. UML_DIAGRAMS.md
   └─ CBC Mode Zincir Diyagramı
3. DATA_FLOW_REFERENCE.md
   ├─ IVNode
   └─ XORNode
4. QUICK_REFERENCE.md
   └─ CBC formülü

Bitti! CBC zincirini anladın.
```

---

### ❓ "Yeni bir feature geliştirmek istiyorum" (1 saat)
Örnek: Yeni bir cipher algoritması eklemek

```
1. COMPREHENSIVE_CODE_GUIDE.md
   └─ Common Tasks → "Adding a New Cipher Algorithm"
2. Mevcut cipher'ı incelemek:
   ├─ BlockCipherNode.jsx
   ├─ App.js onRunCipher()
   └─ validators.js
3. QUICK_REFERENCE.md → Main Functions tablosu
4. DATA_FLOW_REFERENCE.md → BlockCipherNode detayı

Implementasyon planını yaptın!
```

---

### ❓ "Bug fix / debugging yapıyorum" (30-45 dakika)
```
1. QUICK_REFERENCE.md → "Debugging Tips" & "Common Errors"
2. COMPREHENSIVE_CODE_GUIDE.md → "Debugging Graph State"
3. DATA_FLOW_REFERENCE.md → "Debugging: State Inspection"
4. İlgili bölüme dalın (yukarıdaki senaryolardan birini seçin)

Bitti! Debug etmeyi hazırlığı var.
```

---

## 📖 Belge Diyarlaması

### COMPREHENSIVE_CODE_GUIDE.md
**Ne için?** Derinlemesine kod açıklaması
**Uzunluk:** ~8,500 satır
**Okuma Süresi:** ~45 dakika (çabuk) / ~90 dakika (detaylı)
**En İyi İçin:** Tüm proje yapısını anlamak

**Bölümler:**
- Proje Mimarisi
- Data Akış Modeli
- Tüm Fonksiyonlar (App.js, computeGraph.js, validators.js, imageXor.js, presets.js, nodeHelpers.js)
- Node Veri Yapıları
- Şifreleme Modları
- UML Temel Diyagramları
- Debugging
- Call Tree

---

### UML_DIAGRAMS.md
**Ne için?** Görsel akış ve ilişkiler
**Uzunluk:** ~2,500 satır
**Okuma Süresi:** ~20 dakika
**En İyi İçin:** Görsel öğrenenler, akış anlamak

**Diyagramlar:**
- State Machine
- Class Diagram
- Sequence Diagrams (ECB, CBC+Image)
- Entity-Relationship Diagram
- Activity Diagram
- State Transitions
- Interaction Diagram
- Timing Diagram
- Object Instantiation
- Process Model
- Error Handling Flow

---

### DATA_FLOW_REFERENCE.md
**Ne için?** Node.data özellik referansı
**Uzunlük:** ~2,800 satır
**Okuma Süresi:** ~30 dakika
**En İyi İçin:** Node detayları, veri yapıları

**Bölümler:**
- PlaintextNode (Text/Bits/Image/Encrypted modes)
- KeyNode
- IVNode
- BlockCipherNode (ECB/CBC/AES/DES modes)
- CiphertextNode
- XORNode
- CTRNode
- valueMap yapısı
- State Update Cycle
- Complete Examples

---

### DOCUMENTATION_INDEX.md
**Ne için?** Belge haritası ve rehberlik
**Uzunlük:** ~1,200 satır
**Okuma Süresi:** ~10 dakika
**En İyi İçin:** Başlangıç noktası, senaryo bulma

**Bölümler:**
- Belge açıklamaları
- Hızlı Başlangıç (5 senaryo)
- Dosya Bağlantı Haritası
- Key Concepts Cross-References
- Sık Sorulan Sorular
- Learning Path (3 level)
- Öğrenme Stilleri

---

### QUICK_REFERENCE.md
**Ne için?** Tek sayfa hızlı referans
**Uzunlük:** ~500 satır
**Okuma Süresi:** ~5 dakika
**En İyi İçin:** Yadımda tut, çabuk bakış

**İçerik:**
- Proje yapısı
- Main functions tablosu
- Data flow
- Modes ve formüller
- Node.data structure
- computeGraphValues() adımlar
- Connection rules
- Common patterns
- Property checklist

---

## 🚀 İlk Çıkışınız Şimdi

### Step 1: Genel Resmi Gör (5-10 min)
```bash
# Aç → QUICK_REFERENCE.md
# Oku → Proje yapısı, Node.data, Modes
```

### Step 2: Yapıyı Anla (15-20 min)
```bash
# Aç → DOCUMENTATION_INDEX.md
# Oku → "Hızlı Başlangıç" bölümü
# Seçin → Uygun senaryo
```

### Step 3: Detay Çalış (30-60 min)
```bash
# Seçtiğiniz senaryoya göre:
# - COMPREHENSIVE_CODE_GUIDE.md
# - UML_DIAGRAMS.md
# - DATA_FLOW_REFERENCE.md
# Okuyun ve not alın
```

### Step 4: Pratik Yapın (30 min)
```bash
# VS Code açın
# Belge ile kodu karşılaştırın
# computeGraphValues() fonksiyonunu adım adım takip edin
# console.log() ekleyin ve çalıştırın
```

---

## 💡 Pro Tips - Profesyonel İpuçları

### Tip 1: Bookmark Önemli Bölümler
```javascript
// VS Code'da CMD+F (Find)
"computeGraphValues" → COMPREHENSIVE_CODE_GUIDE.md
"onRunXor"          → COMPREHENSIVE_CODE_GUIDE.md
"PlaintextNode"     → DATA_FLOW_REFERENCE.md
"CBC Mode"          → COMPREHENSIVE_CODE_GUIDE.md
```

### Tip 2: Kod ile Belge Yan Yana
```
┌──────────────────────────────────────────────┐
│ Split Screen:                                 │
│ ┌──────────────────┐ ┌────────────────────┐ │
│ │ App.js           │ │ COMPREHENSIVE      │ │
│ │ (left panel)     │ │ (right panel)      │ │
│ │ onRunXor()       │ │ onRunXor() bölümü  │ │
│ │ satırını takip   │ │ eşzamanlı oku      │ │
│ └──────────────────┘ └────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Tip 3: Print & Annotate
```
QUICK_REFERENCE.md'i yazdır
→ Kopyalarını çalışma alanında bulundur
→ Önemli bölümleri vurgula
→ Kişisel notlar ekle
```

### Tip 4: Grup Öğrenimi
```
Takım halinde çalışıyorsanız:
1. Bir kişi COMPREHENSIVE oku
2. Bir kişi UML diyagramları incelemek oku
3. Bir kişi DATA_FLOW bölümlerini oku
4. Haftada bir kez tartışın
5. Birbirinize anlatın
```

---

## 🔍 Cross-Reference Kullanımı

Belgeleri bağlı şekilde kullanan:

```
Soru: "plaintext ⊕ key işlemi nerede hesaplanıyor?"

1. QUICK_REFERENCE.md
   └─ Main Functions → computeGraphValues()

2. COMPREHENSIVE_CODE_GUIDE.md
   └─ computeGraphValues() detayı
   └─ Step 6: BlockCipher node'ları

3. UML_DIAGRAMS.md
   └─ Activity Diagram
   └─ XOR işlemi adımı

4. DATA_FLOW_REFERENCE.md
   └─ BlockCipherNode.data
   └─ Example: "ABC" XOR "KEY"

✅ Soru yanıtlandı!
```

---

## 📞 Yaygın Sorular

**S: Ne kadar belge okumalı?**
> A: Başta QUICK_REFERENCE.md (5 min) + ilgili senaryo (30 min). Toplamda ~35 dakika başlangıç için yeterli.

**S: Tüm belgeleri oku mu?**
> A: Hayır! İhtiyacınıza göre seçin. DOCUMENTATION_INDEX.md'de "Hızlı Başlangıç" bölümü var.

**S: Belgeleri güncellemeliyim mi?**
> A: Kod değiştirdiğinizde ilgili bölümleri güncelleyin. DOCUMENTATION_INDEX.md'de güncelleme kılavuzu var.

**S: Kodu anlamadığımda ne yapmalıyım?**
> A: Bul → DOCUMENTATION_INDEX.md'deki "Sık Sorulan Sorular" bölümü
> Veya: Kod satırını ara → COMPREHENSIVE_CODE_GUIDE.md'de aynı kod bul

---

## 🎓 Öğrenme Hedefleri Checklist

Belgeleri bitirdikten sonra şunları yapabilirsiniz:

- [ ] Proje mimarisini çizebilir misiniz?
- [ ] computeGraphValues() akışını adım adım anlatabilir misiniz?
- [ ] ECB vs CBC modlarını karşılaştırabiliyor musunuz?
- [ ] Bir node'un data yapısını yazabilir misiniz?
- [ ] Yeni bir bağlantı kuralı yazabilir misiniz?
- [ ] Bug'ı bulmak için console.log nereye eklemeli?
- [ ] Image XOR işleminin adımlarını saymabiliyor musunuz?

Hepsini "evet" diyebilirse → Belgeleri başarılı anladınız! 🎉

---

## 🛠️ Sonraki Adımlar

### Geliştirme Başlatmak İçin
```
1. Belgeleri okuyun (yukarıdaki senaryo)
2. Kodu VS Code'da açın
3. Belge ile kod karşılaştırın
4. computeGraphValues() fonksiyonunda debug breakpoint set et
5. "Run" butonuna tıkla, state değişimlerini gözlemle
6. console.log ile takip et
```

### Yeni Feature Eklemek İçin
```
1. COMPREHENSIVE_CODE_GUIDE.md → "Common Tasks"
2. İlgili dosyaları aç (App.js, utils/, components/)
3. Belge ile kod karşılaştır
4. Yeni feature'ın yerini belirle
5. Benzer pattern'i takip et
6. Test et
```

### Bakım Yapmak İçin
```
1. Bug'un ne olduğunu anla
2. DOCUMENTATION_INDEX.md'de "Sık Sorulan Sorular"
3. İlgili belge bölümünü oku
4. Kodu debug et
5. Belgeyi güncelle (gerekirse)
```

---

## 📊 Belge İstatistikleri

```
Toplam Belge Sayısı: 5
├─ COMPREHENSIVE_CODE_GUIDE.md      156 KB
├─ UML_DIAGRAMS.md                   68 KB
├─ DATA_FLOW_REFERENCE.md            71 KB
├─ DOCUMENTATION_INDEX.md            28 KB
└─ QUICK_REFERENCE.md                18 KB
───────────────────────────────────
Toplam: ~341 KB

Tahmini Okuma Süresi:
├─ Hızlı (tüm başlıklar):        ~30 dakika
├─ Orta (tüm bölümler):          ~90 dakika
└─ Detaylı (tüm örnekler):       ~180 dakika
```

---

## ✅ Kontrol Listesi - Başlamadan Önce

- [ ] Belgeleri projeye aldım
- [ ] VS Code'a npm start çalıştırdım
- [ ] QUICK_REFERENCE.md açtım
- [ ] DOCUMENTATION_INDEX.md'de senaryom buldum
- [ ] İlgili belgeyi okumaya hazırım
- [ ] Yan panel'de kod açmaya hazırım

Tamamladığında → Başlayabilirsin! 🚀

---

**Last Updated:** Şubat 8, 2026  
**Belgeler Sürüm:** 1.0  
**Dil:** Türkçe  

İyi çalışmalar! Happy Coding! 🎉
