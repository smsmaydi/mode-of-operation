import React from 'react';

const modes = [
  { id: 'ecb', label: 'ECB' },
  { id: 'cbc', label: 'CBC' },
  { id: 'ctr', label: 'Counter Mode' },
  { id: 'free', label: 'Free Mode' },
];

export default function ModeMenu({ current, onSelect }) {
  return (
    <aside style={{ width: 220, borderRight: '1px solid #ddd', background: '#fafafa' }}>
      <div style={{ padding: 12, fontWeight: 700 }}>Modes</div>
      {modes.map(m => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '10px 12px',
            border: 'none',
            background: current === m.id ? '#e8f0fe' : 'transparent',
            cursor: 'pointer',
            fontWeight: current === m.id ? 700 : 500
          }}
        >
          {m.label}
        </button>
      ))}
      <div style={{ padding: 12, fontSize: 12, color: '#666' }}>
        Bir moda tıkla; canvas hazır kurulumla gelsin.
      </div>
    </aside>
  );
}
