import React, { useState } from 'react';
import { xorImageFileWithKey } from '../utils/computeGraph';

export default function TestImageXor() {
  const [key, setKey] = useState('01010101');
  const [file, setFile] = useState(null);     // yüklenen resim
  const [outUrl, setOutUrl] = useState(null); // çıktı resmi

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setOutUrl(null); // yeni resim seçilince eski çıktıyı temizle
    }
  };

  const runXor = async () => {
    if (!file) {
      alert('Lütfen önce bir resim yükle');
      return;
    }
    if (!key) {
      alert('Lütfen bir key gir');
      return;
    }
    try {
      const url = await xorImageFileWithKey(file, key);
      setOutUrl(url);
    } catch (err) {
      alert('Hata: ' + err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>Test Image XOR</h3>
      
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Key bits (örn. 01010101)"
          style={{ flex: 1 }}
        />
        <button onClick={runXor}>Run XOR</button>
      </div>

      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={onFileChange}
        style={{ marginBottom: 20 }}
      />

      {outUrl && (
        <div>
          <img
            src={outUrl}
            alt="cipher"
            style={{ maxWidth: '300px', border: '1px solid #ccc' }}
          />
          <p><a href={outUrl} download="xor.png">İndir</a></p>
        </div>
      )}
    </div>
  );
}
