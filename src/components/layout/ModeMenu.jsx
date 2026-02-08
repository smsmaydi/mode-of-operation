import React from 'react';

const modes = [
  { id: 'ecb', label: 'ECB' },
  { id: 'cbc', label: 'CBC' },
  { id: 'ctr', label: 'Counter Mode' },
  { id: 'free', label: 'Free Mode' },
];

export default function ModeMenu({ current, onSelect, showHandleLabels, onToggleHandleLabels }) {
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
            fontWeight: current === m.id ? 700 : 300
          }}
        >
          {m.label}
        </button>
      ))}
      <div style={{ padding: 12, fontSize: 12, color: '#666' }}>
        Click a mode.
      </div>
      <div style={{ padding: 12, borderTop: '1px solid #eee' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={!!showHandleLabels}
            onChange={(e) => onToggleHandleLabels?.(e.target.checked)}
          />
          Show input/output labels
        </label>
      </div>
    </aside>
  );
}
