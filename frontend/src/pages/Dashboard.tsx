import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [list, setList] = useState<any[]>([]);
  const navigate = useNavigate();

  const load = async () => {
    const r = await fetch('http://localhost:4000/trpc/listInvestigations?input=' + encodeURIComponent(JSON.stringify({ limit: 50, offset: 0 })));
    const j = await r.json();
    setList(j.result?.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const start = async () => {
    const r = await fetch('http://localhost:4000/trpc/createInvestigation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, depth: 'standard', adaptive_exploration: true, differential_execution: false, recording_enabled: false, max_duration_ms: 120000, max_browser_actions: 50, browser_profiles: [] }),
    });
    const j = await r.json();
    if (j.result?.data?.investigationId) navigate('/investigation/' + j.result.data.investigationId);
  };

  return (
    <div style={{ padding: 24, color: '#e5e7eb', background: '#0b1220', minHeight: '100vh' }}>
      <h1>Web Security AI Agent</h1>
      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" style={{ flex: 1, padding: 8 }} />
        <button onClick={start}>New Investigation</button>
      </div>
      <h2>Recent investigations</h2>
      <ul>{list.map((i) => <li key={i.id} onClick={() => navigate('/investigation/' + i.id)} style={{ cursor: 'pointer' }}>{i.url} — {i.status}</li>)}</ul>
    </div>
  );
}
