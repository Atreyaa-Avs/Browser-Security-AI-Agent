import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { StageStatus } from '../../types/investigation';

interface PipelineNodeData {
  label: string;
  status: StageStatus;
  phase: string;
  stageId?: string;
  onClick?: (data: any) => void;
  [key: string]: any;
}

export default function PipelineNode(props: NodeProps) {
  const data = props.data as PipelineNodeData;
  const getStatusColor = (status: StageStatus) => {
    switch (status) {
      case 'running': return { bg: '#3b82f6', border: '#60a5fa', glow: '0 0 8px rgba(59, 130, 246, 0.6)' };
      case 'completed': return { bg: '#10b981', border: '#34d399', glow: 'none' };
      case 'skipped': return { bg: '#6b7280', border: '#9ca3af', glow: 'none' };
      case 'failed': return { bg: '#ef4444', border: '#f87171', glow: 'none' };
      default: return { bg: '#1f2937', border: '#374151', glow: 'none' };
    }
  };

  const colors = getStatusColor(data.status);
  
  return (
    <div
      onClick={() => data.onClick?.(data)}
      style={{
        background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)`,
        color: 'white',
        border: `2px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '11px',
        fontWeight: '600',
        minWidth: '180px',
        textAlign: 'center',
        boxShadow: colors.glow,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative'
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#64748b' }} />
      <div style={{ textTransform: 'capitalize' }}>{data.label}</div>
      {data.status === 'running' && (
        <div style={{ 
          position: 'absolute', 
          top: -2, 
          right: -2, 
          width: 8, 
          height: 8, 
          background: '#60a5fa', 
          borderRadius: '50%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#64748b' }} />
    </div>
  );
}
