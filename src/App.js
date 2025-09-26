import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  addEdge, useEdgesState, useNodesState, Controls, Background
} from 'reactflow';
import 'reactflow/dist/style.css';

import ModeMenu from './components/layout/ModeMenu';
import NodePalette from './components/palette/NodePalette';

import PlaintextBinaryNode from './components/nodes/PlaintextBinaryNode';
import KeyNode from './components/nodes/KeyNode';
import BlockCipherNode from './components/nodes/BlockCipherNode';
import CiphertextNode from './components/nodes/CiphertextNode';

import { computeGraphValues } from './utils/computeGraph';
import { buildPreset } from './utils/presets';
import { makeIsValidConnection } from './utils/validators';

const nodeTypes = {
  plaintext: PlaintextBinaryNode,
  key: KeyNode,
  blockcipher: BlockCipherNode,
  ciphertext: CiphertextNode,
};

export default function App() {
  const [mode, setMode] = useState('ecb'); // 'ecb' | 'cbc' | 'ctr' | 'free'

  // Başlangıç preset’i
  const initial = useMemo(() => buildPreset(mode), []); // ilk render
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  // Mode değişince preset yükle
  const applyMode = useCallback((m) => {
    setMode(m);
    const preset = buildPreset(m);
    setNodes(computeGraphValues(preset.nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        // Plaintext/Key inputları değişince grafı güncelleyelim
        onChange: (id, patch) => {
          setNodes(nds => {
            const next = nds.map(nn => (nn.id === id ? { ...nn, data: { ...nn.data, ...patch } } : nn));
            return computeGraphValues(next, edges);
          });
        },
      }
    })), preset.edges));
    setEdges(preset.edges);
  }, [setNodes, setEdges, edges]);

  // İlk mount’ta preset’i oturt
  React.useEffect(() => { applyMode(mode); /* eslint-disable-next-line */ }, []);

  const isValidConnection = useCallback((params) => {
    const fn = makeIsValidConnection(mode);
    return fn(params, nodes);
  }, [mode, nodes]);

  const onConnect = useCallback((params) => {
    if (!isValidConnection(params)) return;
    setEdges(eds => {
      const next = addEdge(params, eds);
      setNodes(nds => computeGraphValues([...nds], next));
      return next;
    });
  }, [isValidConnection]);

  // Free Mode sürükle-bırak
  const onDrop = useCallback((event) => {
    if (mode !== 'free') return;
    event.preventDefault();
    const payload = event.dataTransfer.getData('application/reactflow');
    if (!payload) return;
    const { type } = JSON.parse(payload);

    const bounds = event.currentTarget.getBoundingClientRect();
    const position = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };

    const id = `${type}-${Date.now()}`;
    const dataBase = {
      id,
      onChange: (nid, patch) => {
        setNodes(nds => {
          const next = nds.map(n => (n.id === nid ? { ...n, data: { ...n.data, ...patch } } : n));
          return computeGraphValues(next, edges);
        });
      }
    };

    const newNode = {
      id,
      type,
      position,
      data: type === 'plaintext' || type === 'key' ? { ...dataBase, bits: '' } : { ...dataBase },
    };

    setNodes(nds => computeGraphValues(nds.concat(newNode), edges));
  }, [mode, edges, setNodes]);

  const onDragOver = useCallback((event) => {
    if (mode !== 'free') return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [mode]);

  // Node/edge değişimlerinde hesaplama
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    setNodes(nds => computeGraphValues([...nds], edges));
  }, [onNodesChange, edges]);

  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
    setNodes(nds => computeGraphValues([...nds], edges));
  }, [onEdgesChange, edges]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 220px', height: '100vh' }}>
      <ModeMenu current={mode} onSelect={applyMode} />

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{ position: 'relative' }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      {mode === 'free' ? <NodePalette /> : (
        <aside style={{ width: 220, borderLeft: '1px solid #ddd', background: '#fafafa', padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Açıklama</div>
          {mode === 'ecb' && <p>ECB: Her blok bağımsız şifrelenir (şimdilik demo XOR).</p>}
          {mode === 'cbc' && <p>CBC: Her blok, önceki ciphertext ile XOR (IV gerekecek).</p>}
          {mode === 'ctr' && <p>CTR: Sayaç/nonce ile keystream üretimi (gelecek).</p>}
        </aside>
      )}
    </div>
  );
}
