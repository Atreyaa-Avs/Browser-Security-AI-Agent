import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [url, setUrl] = useState('https://secure-account-verify.example/login');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const startInvestigation = async () => {
    setLoading(true);
    const investigationId = 'inv_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    setTimeout(() => {
      navigate('/investigation/' + investigationId);
    }, 500);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      color: '#e2e8f0',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ 
            fontSize: '42px', 
            margin: '0 0 12px 0',
            background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 50%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            Deception-Aware Browser Agents
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8', margin: 0 }}>
            Active Behavioral Phishing Detection Platform
          </p>
        </div>
        
        <div style={{
          background: '#111827',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '24px' }}>Start New Investigation</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
            Enter a website URL to launch an autonomous AI investigation with dual-graph analysis
          </p>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <input 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              placeholder="https://example.com" 
              style={{ 
                flex: 1, 
                padding: '12px 16px', 
                background: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '14px'
              }} 
            />
            <button 
              onClick={startInvestigation} 
              disabled={loading || !url}
              style={{ 
                padding: '12px 32px', 
                background: loading ? '#475569' : 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? '🚀 Starting...' : '🔍 Start Investigation'}
            </button>
            <button 
              onClick={() => navigate('/demo')}
              style={{ 
                padding: '12px 32px', 
                background: '#334155',
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
            >
              Demo
            </button>
          </div>
          
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            ⚠️ This is a prototype demonstration. Investigations use simulated mock data.
          </div>
        </div>
        
        <div style={{
          background: '#111827',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Features</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
            <div style={{ padding: '12px', background: '#0f172a', borderRadius: '6px' }}>
              <div style={{ color: '#60a5fa', fontWeight: '600', marginBottom: '4px' }}>🔄 Pipeline Graph</div>
              <div style={{ color: '#94a3b8' }}>20-stage AI investigation workflow with 5 phases</div>
            </div>
            <div style={{ padding: '12px', background: '#0f172a', borderRadius: '6px' }}>
              <div style={{ color: '#f59e0b', fontWeight: '600', marginBottom: '4px' }}>🕸️ Temporal Behavioral Graph</div>
              <div style={{ color: '#94a3b8' }}>Dynamic discovery of website entities and behaviors</div>
            </div>
            <div style={{ padding: '12px', background: '#0f172a', borderRadius: '6px' }}>
              <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '4px' }}>👥 Cross-Profile Analysis</div>
              <div style={{ color: '#94a3b8' }}>Compare behavior across different browser profiles</div>
            </div>
            <div style={{ padding: '12px', background: '#0f172a', borderRadius: '6px' }}>
              <div style={{ color: '#ef4444', fontWeight: '600', marginBottom: '4px' }}>🎯 Evidence-Based Detection</div>
              <div style={{ color: '#94a3b8' }}>Phishing, cloaking & agent manipulation assessment</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
