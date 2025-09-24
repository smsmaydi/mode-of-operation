import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  addEdge, useEdgesState, useNodesState, Controls, Background
} from 'reactflow';
import 'reactflow/dist/style.css';

import PlaintextBinaryNode from './components/nodes/PlaintextBinaryNode';
import KeyNode from './components/nodes/KeyNode';
import BlockCipherNode from './components/nodes/BlockCipherNode';
import CiphertextNode from './components/nodes/CiphertextNode';

import { computeGraphValues } from './utils/computeGraph';
import { isValidConnection } from './utils/validators';

const nodeTypes = {
  plaintext: PlaintextBinaryNode,
  key: KeyNode,
  blockcipher: BlockCipherNode,
  ciphertext: CiphertextNode,
};

export default function App() {
  const initialNodes = useMemo(() => ([
    {
      id: 'p1',
      position: { x: 80, y: 40 },
      type: 'plaintext',
      data: {
        id: 'p1',
        bits: '10110010',
        onChange: (id, patch) => {
          setNodes(nds => {
            const next = nds.map(n => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
            return computeGraphValues(next, edges);
          });
        },
      },
    },
    {
      id: 'k1',
      position: { x: 340, y: 40 },
      type: 'key',
      data: {
        id: 'k1',
        bits: '01010101',
        onChange: (id, patch) => {
          setNodes(nds => {
            const next = nds.map(n => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
            return computeGraphValues(next, edges);
          });
        },
      },
    },
    { id: 'b1', position: { x: 210, y: 160 }, type: 'blockcipher', data: {} },
    { id: 'c1', position: { x: 210, y: 300 }, type: 'ciphertext', data: {} },
  ]), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback((params) => {
    if (!isValidConnection(params, nodes)) return;
    setEdges(eds => {
      const next = addEdge(params, eds);
      setNodes(nds => computeGraphValues([...nds], next));
      return next;
    });
  }, [nodes]);

  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    setNodes(nds => computeGraphValues([...nds], edges));
  }, [onNodesChange, edges]);

  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
    setNodes(nds => computeGraphValues([...nds], edges));
  }, [onEdgesChange, edges]);

  React.useEffect(() => {
    setNodes(nds => computeGraphValues([...nds], edges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 240, padding: 10, borderRight: '1px solid #ddd', background: 'linear-gradient(red, yellow)' }}>
        <p style={{ marginTop: 0 }}><strong>Palette</strong></p>
        <p style={{ fontSize: 12, color: '#666' }}>
          Plaintext → BlockCipher (Key ile) → Ciphertext
        </p>
       
      </aside>

      <div style={{ flexGrow: 1 }}>
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
    </div>
  );
}
