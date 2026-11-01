import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, Node, Edge, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PipelineNode from '../components/graphs/PipelineNode';
import BehaviorNode from '../components/graphs/BehaviorNode';
import NodeDetailsPanel from '../components/ui/NodeDetailsPanel';
import InvestigationReport from '../components/ui/InvestigationReport';
import { MockInvestigationEngine } from '../engine/MockInvestigationEngine';
import { PIPELINE_STAGES, PIPELINE_PHASES } from '../types/investigation';

const nodeTypes: NodeTypes = {
  pipelineNode: PipelineNode,
  behaviorNode: BehaviorNode
};

export default function Investigation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pipelineNodes, setPipelineNodes, onPipelineNodesChange] = useNodesState([] as Node[]);
  const [pipelineEdges, setPipelineEdges, onPipelineEdgesChange] = useEdgesState([] as Edge[]);
  const [behaviorNodes, setBehaviorNodes, onBehaviorNodesChange] = useNodesState([] as Node[]);
  const [behaviorEdges, setBehaviorEdges, onBehaviorEdgesChange] = useEdgesState([] as Edge[]);
  
  const [status, setStatus] = useState('initializing');
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<any>(null);
  const [selectedBehaviorNode, setSelectedBehaviorNode] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'temporal' | 'report'>('pipeline');
  const [engine, setEngine] = useState<MockInvestigationEngine | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isStepMode, setIsStepMode] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const [investigationData, setInvestigationData] = useState({
    url: 'https://secure-account-verify.example/login',
    currentPhase: 'Ingestion & Triage',
    elapsedTime: 0,
    riskScore: 0
  });

  useEffect(() => {
    const investigationId = id || 'inv_' + Date.now();
    const mockEngine = new MockInvestigationEngine(investigationId);
    setEngine(mockEngine);
    
    mockEngine.onComplete(() => {
      setIsComplete(true);
      setStatus('completed');
      setInvestigationData(prev => ({ ...prev, riskScore: 87 }));
    });
    
    // Initialize pipeline graph
    const stages = PIPELINE_STAGES;
    const pNodes: Node[] = stages.map((stage, index) => {
      const phase = PIPELINE_PHASES.find(p => p.stages.includes(stage.id));
      const level = PIPELINE_PHASES.findIndex(p => p.stages.includes(stage.id));
      const posInPhase = phase ? phase.stages.indexOf(stage.id) : 0;
      
      return {
        id: stage.id,
        type: 'pipelineNode',
        position: { 
          x: 50 + posInPhase * 200, 
          y: 60 + level * 120 
        },
        data: { 
          label: stage.name, 
          status: 'pending',
          phase: stage.phase,
          stageId: stage.id,
          onClick: (data: any) => {
            const st = mockEngine.getPipelineManager().getStage(data.stageId);
            setSelectedPipelineStage(st);
            setSelectedBehaviorNode(null);
          }
        }
      };
    });
    setPipelineNodes(pNodes);
    
    // Create edges between stages
    const pEdges: Edge[] = [];
    // Sequential edges
    for (let i = 0; i < stages.length - 1; i++) {
      if (stages[i].id === 'stopping_rule_evaluation') {
        // Special case: can loop back or continue
        pEdges.push({
          id: `e${i}-continue`,
          source: stages[i].id,
          target: stages[i + 1].id,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#64748b' }
        });
        pEdges.push({
          id: `e${i}-loop`,
          source: stages[i].id,
          target: stages[8].id, // behavioral_intent_inference
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#f59e0b', strokeDasharray: '5,5' },
          label: 'continue loop'
        });
      } else if (stages[i].id === 'evidence_fusion') {
        // Branch to three parallel assessments
        pEdges.push({
          id: `e${i}-phishing`,
          source: stages[i].id,
          target: stages[16].id,
          type: 'smoothstep',
          style: { stroke: '#64748b' }
        });
        pEdges.push({
          id: `e${i}-cloaking`,
          source: stages[i].id,
          target: stages[17].id,
          type: 'smoothstep',
          style: { stroke: '#64748b' }
        });
        pEdges.push({
          id: `e${i}-agent`,
          source: stages[i].id,
          target: stages[18].id,
          type: 'smoothstep',
          style: { stroke: '#64748b' }
        });
      } else if (stages[i].id !== 'phishing_risk_assessment' && stages[i].id !== 'cloaking_risk_assessment' && stages[i].id !== 'agent_manipulation_risk_assessment') {
        pEdges.push({
          id: `e${i}`,
          source: stages[i].id,
          target: stages[i + 1].id,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#64748b' }
        });
      }
    }
    // All three assessments feed into final report
    pEdges.push({
      id: 'to-final-phishing',
      source: stages[16].id,
      target: stages[19].id,
      type: 'smoothstep',
      style: { stroke: '#64748b' }
    });
    pEdges.push({
      id: 'to-final-cloaking',
      source: stages[17].id,
      target: stages[19].id,
      type: 'smoothstep',
      style: { stroke: '#64748b' }
    });
    pEdges.push({
      id: 'to-final-agent',
      source: stages[18].id,
      target: stages[19].id,
      type: 'smoothstep',
      style: { stroke: '#64748b' }
    });
    setPipelineEdges(pEdges);
    
    // Setup event handling
    mockEngine.getEventAdapter().onEvent((event) => {
      if (event.event_type === 'stage.started') {
        setStatus('analyzing');
        setPipelineNodes((nodes) => nodes.map(n => 
          n.id === event.payload.stage ? { 
            ...n, 
            data: { ...n.data, status: 'running' } 
          } : n
        ));
        const pm = mockEngine.getPipelineManager();
        const st = pm.getStage(event.payload.stage);
        if (st) setSelectedPipelineStage(st);
      } else if (event.event_type === 'stage.completed' || event.event_type === 'stage.skipped') {
        setPipelineNodes((nodes) => nodes.map(n => 
          n.id === event.payload.stage ? { 
            ...n, 
            data: { ...n.data, status: event.event_type === 'stage.skipped' ? 'skipped' : 'completed' } 
          } : n
        ));
        const pm = mockEngine.getPipelineManager();
        const st = pm.getStage(event.payload.stage);
        if (st) setSelectedPipelineStage(st);
      } else if (event.event_type === 'stage.failed') {
        setPipelineNodes((nodes) => nodes.map(n => 
          n.id === event.payload.stage ? { 
            ...n, 
            data: { ...n.data, status: 'failed' } 
          } : n
        ));
      } else if (event.event_type === 'graph.updated') {
        // Update behavior graph
        updateBehaviorGraph(mockEngine);
      } else if (event.event_type === 'investigation.completed') {
        setStatus('completed');
        setIsComplete(true);
        setInvestigationData(prev => ({ ...prev, riskScore: event.payload.risk_score }));
      }
    });
    
    // Start in step mode by default for controllability
    mockEngine.start(true);
    setIsStepMode(true);
  }, [id]);

  const handleNextStep = async () => {
    if (engine) {
      await engine.nextStep();
    }
  };

  const handleStartAuto = () => {
    if (engine) {
      engine.reset();
      // Reinitialize
      const investigationId = id || 'inv_' + Date.now();
      const newEngine = new MockInvestigationEngine(investigationId);
      setEngine(newEngine);
      newEngine.onComplete(() => {
        setIsComplete(true);
        setStatus('completed');
        setInvestigationData(prev => ({ ...prev, riskScore: 87 }));
      });
      newEngine.getEventAdapter().onEvent((event: any) => {
        if (event.event_type === 'stage.started') {
          setStatus('analyzing');
          setPipelineNodes((nodes) => nodes.map((n: any) => 
            n.id === event.payload.stage ? { ...n, data: { ...n.data, status: 'running' } } : n
          ));
        } else if (event.event_type === 'stage.completed') {
          setPipelineNodes((nodes) => nodes.map((n: any) => 
            n.id === event.payload.stage ? { ...n, data: { ...n.data, status: 'completed' } } : n
          ));
        } else if (event.event_type === 'stage.skipped') {
          setPipelineNodes((nodes) => nodes.map((n: any) => 
            n.id === event.payload.stage ? { ...n, data: { ...n.data, status: 'skipped' } } : n
          ));
        } else if (event.event_type === 'graph.updated') {
          updateBehaviorGraph(newEngine);
        } else if (event.event_type === 'investigation.completed') {
          setStatus('completed');
          setIsComplete(true);
          setInvestigationData(prev => ({ ...prev, riskScore: event.payload.risk_score }));
        }
      });
      newEngine.start(false);
      setIsStepMode(false);
      setIsPaused(false);
    }
  };

  const updateBehaviorGraph = (mockEngine: MockInvestigationEngine) => {
    const tm = mockEngine.getTemporalManager();
    const nodes = tm.getAllNodes();
    const edges = tm.getAllEdges();
    
    const bNodes: Node[] = nodes.map((node, index) => {
      // Cluster by type/relationship
      const angle = (index * 137.5) * Math.PI / 180;
      const radius = 150 + (index % 5) * 80;
      return {
        id: node.id,
        type: 'behaviorNode',
        position: { 
          x: 300 + Math.cos(angle) * radius, 
          y: 200 + Math.sin(angle) * radius 
        },
        data: { 
          label: node.label, 
          type: node.type,
          attributes: node.attributes,
          onClick: (data: any) => {
            setSelectedBehaviorNode({ ...node, ...data });
            setSelectedPipelineStage(null);
          }
        }
      };
    });
    setBehaviorNodes(bNodes);
    
    const bEdges: Edge[] = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      label: edge.type.replace('_', ' '),
      animated: true,
      style: { stroke: '#f59e0b' },
      labelStyle: { fill: '#fbbf24', fontSize: 10 },
      labelBgStyle: { fill: '#1f2937', fillOpacity: 0.8 }
    }));
    setBehaviorEdges(bEdges);
  };

  const togglePause = () => {
    if (engine) {
      setIsPaused(!isPaused);
    }
  };

  return (
    <div style={{ height: '100vh', background: '#0f172a', color: '#e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Navigation */}
      <div style={{ 
        padding: '12px 20px', 
        background: 'linear-gradient(90deg, #111827 0%, #1e293b 100%)',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '18px', background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Deception-Aware Browser Agent Dashboard
          </h1>
          <span style={{ padding: '4px 10px', background: status === 'completed' ? '#065f46' : status === 'analyzing' ? '#1e3a8a' : '#374151', borderRadius: '6px', fontSize: '12px' }}>
            {status.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
          <span>Session: {id?.slice(0, 8)}...</span>
          <button onClick={() => navigate('/')} style={{ padding: '6px 12px', background: '#374151', color: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            ← Dashboard
          </button>
        </div>
      </div>
      
      {/* Investigation Overview */}
      <div style={{ 
        padding: '12px 20px', 
        background: '#111827',
        borderBottom: '1px solid #334155',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr',
        gap: '20px',
        fontSize: '13px'
      }}>
        <div>
          <div style={{ color: '#94a3b8', fontSize: '11px' }}>Investigated URL</div>
          <div style={{ fontWeight: '600', wordBreak: 'break-all' }}>{investigationData.url}</div>
        </div>
        <div>
          <div style={{ color: '#94a3b8', fontSize: '11px' }}>Current Phase</div>
          <div style={{ fontWeight: '600' }}>{investigationData.currentPhase}</div>
        </div>
        <div>
          <div style={{ color: '#94a3b8', fontSize: '11px' }}>Risk Score</div>
          <div style={{ fontWeight: '600', color: investigationData.riskScore > 70 ? '#f87171' : investigationData.riskScore > 40 ? '#fbbf24' : '#34d399' }}>
            {investigationData.riskScore} / 100
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={togglePause} style={{ 
            padding: '6px 12px', 
            background: isPaused ? '#059669' : '#d97706', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '12px'
          }}>
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button onClick={() => setShowReport(true)} style={{ 
            padding: '6px 12px', 
            background: '#dc2626', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '12px'
          }}>
            📊 Final Report
          </button>
        </div>
      </div>
      
      {/* Control Panel */}
      <div style={{ 
        padding: '10px 20px', 
        background: '#0f172a',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ color: '#94a3b8', fontSize: '12px' }}>Controls:</span>
        {isStepMode && !isComplete && (
          <button onClick={handleNextStep} style={{ 
            padding: '6px 14px', 
            background: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '12px'
          }}>
            ⏭️ Next Step
          </button>
        )}
        {!isStepMode && (
          <span style={{ color: '#10b981', fontSize: '12px' }}>▶ Auto-running</span>
        )}
        {isStepMode && !engine && (
          <button onClick={() => {
            if (engine) (engine as any).start(true);
            setIsStepMode(true);
          }} style={{ 
            padding: '6px 14px', 
            background: '#059669', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '12px'
          }}>
            🔄 Restart Step Mode
          </button>
        )}
        {!isStepMode && (
          <button onClick={handleStartAuto} style={{ 
            padding: '6px 14px', 
            background: '#8b5cf6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '12px'
          }}>
            ⚡ Run Automatically
          </button>
        )}
        {isComplete && (
          <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '600' }}>✅ Investigation Complete</span>
        )}
      </div>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', background: '#111827', borderBottom: '1px solid #334155' }}>
        <button 
          onClick={() => setActiveTab('pipeline')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'pipeline' ? '#1e293b' : 'transparent',
            color: activeTab === 'pipeline' ? '#60a5fa' : '#94a3b8',
            border: 'none',
            borderBottom: activeTab === 'pipeline' ? '2px solid #60a5fa' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          🔄 Investigation Pipeline Graph
        </button>
        <button 
          onClick={() => setActiveTab('temporal')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'temporal' ? '#1e293b' : 'transparent',
            color: activeTab === 'temporal' ? '#f59e0b' : '#94a3b8',
            border: 'none',
            borderBottom: activeTab === 'temporal' ? '2px solid #f59e0b' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          🕸️ Temporal Behavioral Graph
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          disabled={!isComplete}
          style={{
            padding: '10px 20px',
            background: activeTab === 'report' ? '#1e293b' : 'transparent',
            color: !isComplete ? '#475569' : activeTab === 'report' ? '#ef4444' : '#94a3b8',
            border: 'none',
            borderBottom: activeTab === 'report' ? '2px solid #ef4444' : '2px solid transparent',
            cursor: !isComplete ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            opacity: !isComplete ? 0.5 : 1
          }}
        >
          📊 Investigation Report {isComplete ? '' : '(Complete investigation first)'}
        </button>
      </div>
      
      {/* Main Visualization Area */}
      <div style={{ flex: 1, position: 'relative', background: '#0f172a' }}>
        {activeTab === 'pipeline' && (
          <ReactFlow 
            nodes={pipelineNodes} 
            edges={pipelineEdges} 
            onNodesChange={onPipelineNodesChange}
            onEdgesChange={onPipelineEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            style={{ background: '#0f172a' }}
          >
            <Background color="#1e293b" gap={20} />
            <Controls style={{ background: '#111827', border: '1px solid #334155' }} />
            <MiniMap style={{ background: '#111827' }} nodeColor="#64748b" />
          </ReactFlow>
        )}
        {activeTab === 'temporal' && (
          <ReactFlow 
            nodes={behaviorNodes} 
            edges={behaviorEdges} 
            onNodesChange={onBehaviorNodesChange}
            onEdgesChange={onBehaviorEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            style={{ background: '#0f172a' }}
          >
            <Background color="#1e293b" gap={20} />
            <Controls style={{ background: '#111827', border: '1px solid #334155' }} />
            <MiniMap style={{ background: '#111827' }} nodeColor="#f59e0b" />
          </ReactFlow>
        )}
        {activeTab === 'report' && isComplete && (
          <div style={{ height: '100%', overflowY: 'auto', background: '#0f172a' }}>
            <InvestigationReport investigationId={id || 'unknown'} url={investigationData.url} />
          </div>
        )}
        <NodeDetailsPanel 
          stage={selectedPipelineStage} 
          behaviorNode={selectedBehaviorNode}
          onClose={() => {
            setSelectedPipelineStage(null);
            setSelectedBehaviorNode(null);
          }}
        />
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
