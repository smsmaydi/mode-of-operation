import React, { useState } from "react";
import { Handle, Position, useReactFlow } from "reactflow";

export default function XorPreBlockNode({ id, data }) {
  const instance = useReactFlow();
  const hasErr = !!data?.error;
  const showLabels = !!data?.showHandleLabels;

  const formatBits = (bits) => {
    if (!bits) return "Waiting...";
    return bits.length > 16 ? bits.slice(0, 16) + "..." : bits;
  };
    
  return (
    <div style={{
      padding: 10, border: '1px solid #999', borderRadius: 8,
      background: hasErr ? '#ff0000' : '#f96cf9', minWidth: 200,
      minHeight: 120, position: "relative", display:'block', 
    }}>
      <strong>XOR</strong>
      
      <Handle type="target" position={Position.Left} id="pc" style={{ background: "purple" }}/>
      <Handle type="target" position={Position.Left} id="ptLeft" style={{ background: "green", top: "70%" }} />
      <Handle type="target" position={Position.Top} id="pcTop" style={{ background: "purple", left: "30%" }} />
      <Handle type="target" position={Position.Top} id="pt" style={{ background: "green", left: "70%" }} /> 
      <Handle type="source" position={Position.Bottom} id="out" />
      {showLabels && (
        <>
          <div style={{ position: "absolute", top: "24%", left: -36, fontSize: 10, color: "#7a1fa2" }}>
            pc
          </div>
          <div style={{ position: "absolute", top: "64%", left: -36, fontSize: 10, color: "#0a0" }}>
            pt
          </div>
          <div style={{ position: "absolute", top: -14, left: "22%", fontSize: 10, color: "#7a1fa2" }}>
            pc
          </div>
          <div style={{ position: "absolute", top: -14, left: "66%", fontSize: 10, color: "#0a0" }}>
            pt
          </div>
          <div style={{ position: "absolute", bottom: -14, left: "44%", fontSize: 10, color: "#111" }}>
            out
          </div>
        </>
      )}

      <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'monospace' }}>
        <div style={{ marginBottom: 4, padding: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 3 }}>
          <strong>IV/Prev:</strong><br/>
          {formatBits(data?.pcInput)}
        </div>
        <div style={{ marginBottom: 4, padding: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 3 }}>
          <strong>Plaintext:</strong><br/>
          {formatBits(data?.ptInput)}
        </div>
        <div style={{ padding: 4, background: 'rgba(0,255,0,0.2)', borderRadius: 3 }}>
          <strong>Result:</strong><br/>
          {formatBits(data?.xorOutput)}
        </div>
      </div>
    </div>
  );
    
}