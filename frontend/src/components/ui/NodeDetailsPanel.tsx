import React, { useState } from 'react';
import { PipelineStage, PIPELINE_PHASES } from '../../types/investigation';

interface NodeDetailsPanelProps {
  stage: PipelineStage | null;
  behaviorNode: any | null;
  onClose: () => void;
}

export default function NodeDetailsPanel({ stage, behaviorNode, onClose }: NodeDetailsPanelProps) {
  if (!stage && !behaviorNode) return null;
  
  return (
    <div style={{
      position: 'absolute',
      top: 60,
      right: 20,
      width: 320,
      background: '#111827',
      border: '1px solid #374151',
      borderRadius: '8px',
      color: '#e5e7eb',
      maxHeight: '80vh',
      overflowY: 'auto',
      zIndex: 1000,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #374151',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#1f2937'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>
          {stage ? 'Pipeline Stage Details' : 'Behavior Node Details'}
        </h3>
        <button onClick={onClose} style={{ 
          background: 'none', 
          border: 'none', 
          color: '#9ca3af', 
          cursor: 'pointer',
          fontSize: '18px'
        }}>×</button>
      </div>
      
      <div style={{ padding: '12px 16px' }}>
        {stage && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>Stage</div>
              <div style={{ fontWeight: '600' }}>{stage.name}</div>
              <div style={{ color: '#6b7280', fontSize: '11px' }}>{stage.stage_id}</div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>Status</div>
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                background: stage.status === 'completed' ? '#065f46' : 
                           stage.status === 'running' ? '#1e3a8a' : 
                           stage.status === 'failed' ? '#7f1d1d' : '#374151',
                color: stage.status === 'completed' ? '#34d399' : 
                       stage.status === 'running' ? '#60a5fa' : 
                       stage.status === 'failed' ? '#f87171' : '#9ca3af'
              }}>
                {stage.status}
              </span>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>Phase</div>
              <div>{stage.phase}</div>
            </div>
            
            {stage.start_time && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>Start Time</div>
                <div style={{ fontSize: '11px' }}>{new Date(stage.start_time).toLocaleTimeString()}</div>
              </div>
            )}
            
            {stage.end_time && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>End Time</div>
                <div style={{ fontSize: '11px' }}>{new Date(stage.end_time).toLocaleTimeString()}</div>
              </div>
            )}
            
            {stage.duration && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>Duration</div>
                <div>{(stage.duration / 1000).toFixed(2)}s</div>
              </div>
            )}
            
            {stage.output && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>Output</div>
                <pre style={{ 
                  background: '#0f172a', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  fontSize: '10px',
                  overflow: 'auto',
                  margin: 0
                }}>
                  {JSON.stringify(stage.output, null, 2)}
                </pre>
              </div>
            )}
            
            {stage.error && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#f87171', fontSize: '11px', marginBottom: '4px' }}>Error</div>
                <div style={{ fontSize: '11px', color: '#fca5a5' }}>{stage.error}</div>
              </div>
            )}
          </>
        )}
        
        {behaviorNode && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>Node Type</div>
              <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                {behaviorNode.type?.replace('_', ' ')}
              </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>Label</div>
              <div>{behaviorNode.label}</div>
            </div>
            
            {behaviorNode.attributes && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>Attributes</div>
                <pre style={{ 
                  background: '#0f172a', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  fontSize: '10px',
                  overflow: 'auto',
                  margin: 0
                }}>
                  {JSON.stringify(behaviorNode.attributes, null, 2)}
                </pre>
              </div>
            )}
            
            {behaviorNode.observation_count && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>Observations</div>
                <div>{behaviorNode.observation_count}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
