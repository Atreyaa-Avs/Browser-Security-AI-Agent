import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BehaviorNodeType } from '../../types/investigation';

interface BehaviorNodeData {
  label: string;
  type: BehaviorNodeType;
  attributes: any;
  onClick?: (data: any) => void;
  [key: string]: any;
}

const getNodeStyle = (type: BehaviorNodeType) => {
  switch (type) {
    case 'page': return { bg: '#3b82f6', icon: '🌐' };
    case 'domain': return { bg: '#8b5cf6', icon: '🔗' };
    case 'ip_address': return { bg: '#6366f1', icon: '📡' };
    case 'network_request': return { bg: '#f59e0b', icon: '📨' };
    case 'form': return { bg: '#10b981', icon: '📝' };
    case 'dom_element': return { bg: '#06b6d4', icon: '🔧' };
    case 'script': return { bg: '#ec4899', icon: '📜' };
    case 'iframe': return { bg: '#14b8a6', icon: '🖼️' };
    case 'redirect': return { bg: '#f97316', icon: '↪️' };
    case 'cookie': return { bg: '#a855f7', icon: '🍪' };
    case 'storage_object': return { bg: '#84cc16', icon: '💾' };
    case 'user_action': return { bg: '#22d3ee', icon: '👆' };
    case 'security_finding': return { bg: '#ef4444', icon: '⚠️' };
    case 'browser_profile': return { bg: '#64748b', icon: '👤' };
    default: return { bg: '#6b7280', icon: '📦' };
  }
};

export default function BehaviorNode(props: NodeProps) {
  const data = props.data as BehaviorNodeData;
  const style = getNodeStyle(data.type);
  
  return (
    <div
      onClick={() => data.onClick?.(data)}
      style={{
        background: `linear-gradient(135deg, ${style.bg} 0%, ${style.bg}cc 100%)`,
        color: 'white',
        border: `2px solid ${style.bg}`,
        borderRadius: '10px',
        padding: '10px 12px',
        fontSize: '10px',
        fontWeight: '600',
        minWidth: '150px',
        maxWidth: '200px',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#64748b' }} />
      <div style={{ marginBottom: '4px' }}>{style.icon} {data.type.replace('_', ' ').toUpperCase()}</div>
      <div style={{ fontSize: '9px', opacity: 0.95, wordBreak: 'break-word' }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#64748b' }} />
    </div>
  );
}
