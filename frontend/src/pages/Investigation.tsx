import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import io from 'socket.io-client';

const stages = ['url_received','static_risk_assessment','confidence_evaluation','browser_investigator','dom_observation','network_observation','visual_observation','temporal_graph','behavioral_intent_inference','information_gain_selector','controlled_browser_action','new_evidence_collection','temporal_graph_update','stopping_rule_evaluation','differential_execution','evidence_fusion','phishing_risk_assessment','cloaking_risk_assessment','agent_manipulation_risk_assessment','final_report'];

export default function Investigation() {
  const { id } = useParams();
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [status, setStatus] = useState('queued');

  useEffect(() => {
    const socket = io('http://localhost:4000');
    socket.emit('subscribe', id);
    socket.on('investigation:event', (e: any) => {
      if (e.type === 'stage.started') {
        setNodes((ns) => ns.map((n) => n.id === e.payload.stage ? { ...n, data: { ...n.data, status: 'running' } } : n));
      }
      if (e.type === 'stage.completed') {
        setNodes((ns) => ns.map((n) => n.id === e.payload.stage ? { ...n, data: { ...n.data, status: 'completed' } } : n));
      }
      if (e.type === 'investigation.status_changed') setStatus(e.payload.status);
      if (e.type === 'investigation.completed') setStatus('completed');
      if (e.type === 'investigation.failed') setStatus('failed');
    });
    return () => { socket.disconnect(); };
  }, [id]);

  useEffect(() => {
    setNodes(stages.map((s, i) => ({ id: s, position: { x: (i % 5) * 180, y: Math.floor(i / 5) * 80 }, data: { label: s, status: 'pending' } })));
    const e: any[] = [];
    for (let i = 0; i < stages.length - 1; i++) e.push({ id: `e${i}`, source: stages[i], target: stages[i + 1] });
    setEdges(e);
  }, []);

  return (
    <div style={{ height: '100vh', background: '#0b1220', color: '#e5e7eb' }}>
      <div style={{ padding: 12 }}>Investigation {id} — {status}</div>
      <div style={{ height: 'calc(100vh - 50px)' }}>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
