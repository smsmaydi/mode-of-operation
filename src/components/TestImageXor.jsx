import React, { useState } from 'react';
import { xorImageFileWithKey } from "../utils/xorImageFile";

export default function TestImageXor() {
  const [key, setKey] = useState('01010101');
  const [file, setFile] = useState(null); // uploaded image
  const [outUrl, setOutUrl] = useState(null); // output image URL

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setOutUrl(null); // clear previous output when a new image is selected
    }
  };

  const runXor = async () => {
    if (!file) {
      alert('Please upload an image first');
      return;
    }
    if (!key) {
      alert('Please enter key bits');
      return;
    }
    try {
      const url = await xorImageFileWithKey(file, key);
      setOutUrl(url);
    } catch (err) {
      alert('Error: ' + err);
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
          placeholder="Key bits (e.g. 01010101)"
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
          <p><a href={outUrl} download="xor.png">Download</a></p>
        </div>
      )}
    </div>
  );
}
