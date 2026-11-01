import React from 'react';

interface InvestigationReportProps {
  investigationId: string;
  url: string;
}

export default function InvestigationReport({ investigationId, url }: InvestigationReportProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: '#111827',
        border: '1px solid #374151',
        borderRadius: '12px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: '#e5e7eb'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #374151',
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px', marginBottom: '8px' }}>🚨 Phishing Investigation Report</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>Prototype - Simulated Data</p>
        </div>
        
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#f87171' }}>Final Verdict</h2>
            <div style={{
              padding: '16px',
              background: '#7f1d1d',
              border: '2px solid #dc2626',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fca5a5' }}>PHISHING</div>
              <div style={{ marginTop: '8px', fontSize: '16px' }}>Risk Score: 87 / 100</div>
              <div style={{ marginTop: '4px', fontSize: '14px', opacity: 0.9 }}>Confidence: 92%</div>
            </div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Investigation Details</h3>
            <div style={{ background: '#1f2937', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
              <div style={{ marginBottom: '6px' }}><strong>Investigated URL:</strong> {url}</div>
              <div style={{ marginBottom: '6px' }}><strong>Investigation ID:</strong> {investigationId}</div>
              <div style={{ marginBottom: '6px' }}><strong>Duration:</strong> ~2m 15s</div>
              <div><strong>Status:</strong> Completed</div>
            </div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Risk Assessment Breakdown</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#7f1d1d', borderRadius: '6px' }}>
                <span>Phishing Risk</span>
                <span style={{ color: '#fca5a5', fontWeight: 'bold' }}>87 / 100 (High)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#92400e', borderRadius: '6px' }}>
                <span>Cloaking & Evasion</span>
                <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>72 / 100 (High)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#78350f', borderRadius: '6px' }}>
                <span>Agent Manipulation Risk</span>
                <span style={{ color: '#fdba74', fontWeight: 'bold' }}>65 / 100 (Medium)</span>
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Key Security Findings</h3>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px', color: '#fca5a5' }}>Credential harvesting form detected</li>
              <li style={{ marginBottom: '8px', color: '#fca5a5' }}>Suspicious cross-origin data submission</li>
              <li style={{ marginBottom: '8px', color: '#fbbf24' }}>External malicious tracking script</li>
              <li style={{ marginBottom: '8px', color: '#fbbf24' }}>Behavioral divergence across browser profiles</li>
              <li style={{ color: '#fdba74' }}>Cookie/localStorage manipulation observed</li>
            </ul>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Cross-Profile Differences</h3>
            <div style={{ background: '#1f2937', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
              <div style={{ marginBottom: '6px' }}>• <strong>Clean Chrome:</strong> Received standard login page</div>
              <div>• <strong>Automated Browser (Puppeteer):</strong> Received different page variant with enhanced evasion</div>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '16px', background: '#374151', borderRadius: '6px', fontSize: '12px', opacity: 0.8 }}>
            This is a simulated investigation for prototype demonstration purposes.
          </div>
        </div>
      </div>
    </div>
  );
}
