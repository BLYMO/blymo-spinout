import React, { useEffect, useState } from 'react';
import { 
  Server, Settings, CreditCard, LogOut, Loader2, Zap, CheckCircle2, 
  Activity, Network, Database, Play, Bot, Sparkles, Cpu, 
  ShieldCheck, Terminal, ChevronDown, ChevronUp, Copy, Check, ExternalLink, Lock 
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ProvisioningTerminal from '../components/ProvisioningTerminal';
import ProvisioningGame from '../components/ProvisioningGame';

const ADJECTIVES = ['cloud', 'fast', 'secure', 'blue', 'agile', 'smart', 'neat', 'bold'];
const NOUNS = ['sam', 'fox', 'wolf', 'node', 'data', 'byte', 'pipe', 'base'];
const VERBS = ['beans', 'runs', 'soars', 'flows', 'syncs', 'spins', 'jumps', 'ops'];

const generateSlug = () => {
  return `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]}-${NOUNS[Math.floor(Math.random() * NOUNS.length)]}-${VERBS[Math.floor(Math.random() * VERBS.length)]}`;
};

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState('workspaces'); // 'workspaces' | 'billing' | 'settings'
  const [billingMessage, setBillingMessage] = useState('');

  // Provisioning Modal State
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null); // replaces showProvisionModal
  const [slugInput, setSlugInput] = useState('');
  const [slugError, setSlugError] = useState('');
  const [workloadType, setWorkloadType] = useState('agent'); // 'agent' | 'dify' | 'n8n'

  // Telemetry Inspector State
  const [expandedTelemetryId, setExpandedTelemetryId] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = (text, fieldName) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Stripe Portal Loading State
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  // Minigame State
  const [showGame, setShowGame] = useState(false);

  useEffect(() => {
    // Reset game visibility when tab changes
    setShowGame(false);
  }, [activeTab]);

  useEffect(() => {
    const initDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      // 1. Verify Stripe Session if it recently completed Checkout
      const sessionId = searchParams.get('session_id');
      if (sessionId) {
        try {
          const { data, error } = await supabase.functions.invoke('verify-checkout', {
            body: { session_id: sessionId }
          });
          if (error) {
            // If error message indicates already processed, that's fine, proceed.
            if (!error.message?.includes('already processed')) {
              throw error;
            }
          }
          // Clear query param to clean up URL
          searchParams.delete('session_id');
          setSearchParams(searchParams, { replace: true });
        } catch (err) {
          console.error("Session verification failed:", err);
        }
      }

      // 2. Fetch User Workspaces
      const { data: wsData, error: wsError } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (!wsError && wsData) {
        setWorkspaces(wsData);
      }

      // 3. Setup Realtime Subscription for status updates
      // Using a unique channel name prevents React 18 strict mode from crashing on re-subscription
      const channel = supabase
        .channel(`schema-db-changes-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'workspaces',
          },
          (payload) => {
            console.log('Realtime update received:', payload);
            setWorkspaces(current =>
              current.map(ws => ws.id === payload.new.id ? { ...ws, ...payload.new } : ws)
            );
          }
        )
        .subscribe();

      setLoading(false);
      return () => {
        supabase.removeChannel(channel);
      };
    };

    initDashboard();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleNewWorkspace = () => {
    const unprovisionedWs = workspaces.find(w => w.status === 'unprovisioned');
    if (unprovisionedWs) {
      initiateProvisioning(unprovisionedWs.id);
    } else {
      setBillingMessage('Current capacity exceeded. Talk to us to go to the next plan or manage your subscription below.');
      setActiveTab('billing');
    }
  };

  const initiateProvisioning = (workspaceId) => {
    setSlugInput(generateSlug());
    setSlugError('');
    setWorkloadType('agent');
    setSelectedWorkspaceId(workspaceId);
  };

  const executeProvisioning = async () => {
    if (!slugInput || slugInput.length < 3) {
      setSlugError("Workspace name must be at least 3 characters.");
      return;
    }

    setIsProvisioning(true);
    setSlugError('');

    try {
      // 1. Check if slug exists in DB to prevent clash BEFORE calling AWS
      const { count, error: countError } = await supabase
        .from('workspaces')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', slugInput);

      if (countError) throw countError;
      if (count > 0) {
        throw new Error("This workspace name is already taken globally. Please try another.");
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active authentication session found.");

      const now = new Date().toISOString();

      // OPTIMISTIC UPDATE: Update UI immediately
      setWorkspaces(workspaces.map(w => w.id === selectedWorkspaceId ? {
        ...w,
        tenant_id: slugInput,
        workload_type: workloadType,
        status: 'provisioning',
        provisioning_started_at: now
      } : w));
      setSelectedWorkspaceId(null); // Close modal instantly

      // 3. Native Database Update: Claim the tenant_id and workload in background
      console.log('Pushing claim to Supabase for ID:', selectedWorkspaceId, 'with name:', slugInput, 'workload:', workloadType);
      const { data: updateData, error: updateError } = await supabase
        .from('workspaces')
        .update({
          tenant_id: slugInput,
          workload_type: workloadType,
          status: 'provisioning',
          provisioning_started_at: now
        })
        .eq('id', selectedWorkspaceId)
        .select();

      console.log('Supabase Update Result:', { updateData, updateError });

      if (updateError) {
        // Rollback on hard error
        const { data: wsData } = await supabase.from('workspaces').select('*');
        if (wsData) setWorkspaces(wsData);

        if (updateError.code === '23505') throw new Error("Name was claimed milliseconds ago by someone else!");
        throw updateError;
      }

      // 4. Dispatch the actual AWS Step Function Task with multi-workload configuration
      const payload = {
        tenant_id: slugInput,
        workload_type: workloadType,
        alb_listener_rule_priority: Math.floor(Math.random() * 49000) + 100 // Range 100-49100
      };

      const res = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL}/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`AWS Gateway API failed: ${res.statusText} - ${errorText}`);
      }

      console.log('Orchestration Dispatched successfully.');

    } catch (err) {
      console.error(err);
      setSlugError(err.message);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleResetWorkspace = async (workspaceId) => {
    if (!confirm("This will reset the setup process so you can try again. Continue?")) return;

    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          status: 'unprovisioned',
          tenant_id: null,
          provisioning_started_at: null
        })
        .eq('id', workspaceId);

      if (error) throw error;

      // Local state update
      setWorkspaces(workspaces.map(w => w.id === workspaceId ? {
        ...w,
        status: 'unprovisioned',
        tenant_id: null,
        provisioning_started_at: null
      } : w));
    } catch (err) {
      console.error("Reset failed:", err);
      alert("Could not reset workspace. Please try again later.");
    }
  };

  const handleBillingPortal = async () => {
    setIsPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Invalid URL returned from Portal edge function.");
      }
    } catch (err) {
      console.error(err);
      alert('Could not launch the billing portal. Ensure you have an active workspace license first.');
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <Loader2 className="animate-spin" size={48} color="var(--accent-blue)" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>

      {/* Provisioning Overlay Modal */}
      {selectedWorkspaceId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '580px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Deploy Isolated AI Instance</h2>
            <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Choose your AI workload engine and identifier for your dedicated AWS Fargate environment with native pgvector memory and keyless Bedrock IAM.
            </p>

            {/* AI Engine Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                SELECT ENGINE
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                
                {/* Generic AI Container */}
                <div
                  onClick={() => setWorkloadType('agent')}
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${workloadType === 'agent' ? '#10b981' : 'var(--border-subtle)'}`,
                    background: workloadType === 'agent' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div style={{ background: workloadType === 'agent' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)', padding: '0.6rem', borderRadius: '8px' }}>
                    <Cpu size={20} color={workloadType === 'agent' ? '#34d399' : '#9ca3af'} />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <strong style={{ fontSize: '0.95rem' }}>Custom AI Container / Agent</strong>
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.65rem' }}>HERO</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>
                      Run any Docker container (Python, CrewAI, LangGraph, FastAPI) with keyless Bedrock IAM & pgvector.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {/* Dify */}
                  <div
                    onClick={() => setWorkloadType('dify')}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: `1.5px solid ${workloadType === 'dify' ? '#a855f7' : 'var(--border-subtle)'}`,
                      background: workloadType === 'dify' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <Bot size={18} color={workloadType === 'dify' ? '#c084fc' : '#9ca3af'} />
                      <strong style={{ fontSize: '0.9rem' }}>Dify Studio</strong>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>
                      Visual RAG & agent canvas with dedicated database.
                    </p>
                  </div>

                  {/* n8n */}
                  <div
                    onClick={() => setWorkloadType('n8n')}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: `1.5px solid ${workloadType === 'n8n' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                      background: workloadType === 'n8n' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <Zap size={18} color={workloadType === 'n8n' ? 'var(--accent-blue)' : '#9ca3af'} />
                      <strong style={{ fontSize: '0.9rem' }}>n8n Automation</strong>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>
                      Workflow orchestration with schema isolation.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>
              WORKSPACE SUBDOMAIN
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                value={slugInput}
                disabled
                className="input-field"
                style={{ flexGrow: 1, padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '1.1rem', cursor: 'not-allowed' }}
              />
              <span className="text-secondary">.{workloadType === 'dify' ? 'dify' : workloadType === 'agent' ? 'agent' : 'n8n'}.trybase.io</span>
            </div>

            <button onClick={() => setSlugInput(generateSlug())} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Gimme another one
            </button>

            {slugError && (
              <div style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '4px' }}>
                {slugError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedWorkspaceId(null)} disabled={isProvisioning} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={executeProvisioning} disabled={isProvisioning} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                {isProvisioning ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                Deploy Infrastructure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside style={{
        width: '280px',
        borderRight: '1px solid var(--border-subtle)',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="brand" style={{ marginBottom: '3rem' }}>
          <a href='/' style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#ffffff' }}>
            <img src="/logo.png" alt="TryBase Icon" style={{ height: '24px', filter: 'brightness(0) invert(1)' }} />
            TryBase
          </a>
        </div>

        <nav style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', border: 'none', background: 'transparent', backdropFilter: 'none', position: 'static' }}>
          <button
            onClick={() => { setActiveTab('workspaces'); setBillingMessage(''); }}
            className="btn btn-primary"
            style={{ justifyContent: 'flex-start', background: activeTab === 'workspaces' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: activeTab === 'workspaces' ? 'var(--accent-blue)' : 'var(--text-main)', border: 'none' }}
          >
            <Server size={18} /> Workspaces
          </button>

          <button
            onClick={() => { setActiveTab('billing'); setBillingMessage(''); }}
            className="btn btn-primary"
            style={{ justifyContent: 'flex-start', background: activeTab === 'billing' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: activeTab === 'billing' ? 'var(--accent-blue)' : 'var(--text-main)', border: 'none' }}
          >
            <CreditCard size={18} /> Billing
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setBillingMessage(''); }}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', background: activeTab === 'settings' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: activeTab === 'settings' ? 'var(--accent-blue)' : 'var(--text-main)', border: 'none' }}
          >
            <Settings size={18} /> Settings
          </button>
        </nav>

        <button onClick={handleSignOut} className="btn btn-secondary" style={{ marginTop: 'auto', justifyContent: 'flex-start', border: 'none' }}>
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flexGrow: 1, padding: '3rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <h1>Hi, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}!</h1>
            <p className="text-secondary">Manage and monitor your AI Agent & workflow instances.</p>
          </div>
          <button onClick={handleNewWorkspace} className="btn btn-primary">
            + New Workspace
          </button>
        </header>

        {activeTab === 'workspaces' ? (
          <div>
            {/* Hyperscaler Control Plane Service-Level Indicators (SLIs) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
              
              {/* SLI 1: Zero-Trust MicroVM Fleet */}
              <div className="glass-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden', borderLeft: '3px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div className="feature-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', padding: '0.65rem', borderRadius: '8px' }}>
                    <ShieldCheck size={20} />
                  </div>
                  <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.68rem', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                    0 PUBLIC IPS
                  </span>
                </div>
                <h3 style={{ fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Private MicroVM Fleet
                </h3>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                  100% Private VPC
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Per-tenant IAM roles • AWS Fargate Graviton
                </p>
              </div>

              {/* SLI 2: Amazon Bedrock AI Gateway */}
              <div className="glass-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden', borderLeft: '3px solid #c084fc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div className="feature-icon" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', padding: '0.65rem', borderRadius: '8px' }}>
                    <Sparkles size={20} />
                  </div>
                  <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontSize: '0.68rem', border: '1px solid rgba(168, 85, 247, 0.3)', fontWeight: 600 }}>
                    PII GUARDRAILS
                  </span>
                </div>
                <h3 style={{ fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bedrock AI Gateway
                </h3>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                  480ms P95
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Keyless IAM STS • Claude 3.5 & Titan Models
                </p>
              </div>

              {/* SLI 3: pgvector Memory Engine */}
              <div className="glass-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden', borderLeft: '3px solid #38bdf8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div className="feature-icon" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '0.65rem', borderRadius: '8px' }}>
                    <Database size={20} />
                  </div>
                  <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.68rem', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 600 }}>
                    HNSW INDEXED
                  </span>
                </div>
                <h3 style={{ fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  RDS Vector Memory
                </h3>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                  1,536-dim pgvector
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Dedicated tenant schema • PostgreSQL 16.3
                </p>
              </div>

              {/* SLI 4: FinOps Cost Governance */}
              <div className="glass-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden', borderLeft: '3px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div className="feature-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', padding: '0.65rem', borderRadius: '8px' }}>
                    <Activity size={20} />
                  </div>
                  <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.68rem', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 600 }}>
                    FINOPS AUDITED
                  </span>
                </div>
                <h3 style={{ fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Cloud Cost Attribution
                </h3>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                  Infracost Verified
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Pre-deploy cost audit • Scale-to-Zero ready
                </p>
              </div>

            </div>

            <div className="glass-card" style={{ padding: '0' }}>
              {workspaces.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                  <div className="feature-icon" style={{ marginInline: 'auto', scale: '1.5', marginBottom: '2rem' }}>
                    <Server size={24} />
                  </div>
                  <h2>No active workspaces</h2>
                  <p className="text-secondary" style={{ maxWidth: '400px', margin: '1rem auto 2rem' }}>
                    You haven't provisioned any AI instances yet. Start your trial to unlock your first isolated workspace.
                  </p>
                  <a href="/#pricing" className="btn btn-primary text-decoration-none">View Plans</a>
                </div>
              ) : (
                <div>
                  <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Your Infrastructure</h3>
                  </div>
                  {workspaces.map(ws => (
                    <div key={ws.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '1.15rem', letterSpacing: '-0.01em' }}>{ws.tenant_id || '<Pending Setup>'}</strong>
                            <span className="text-secondary" style={{ fontSize: '0.9rem' }}>
                              .{ws.workload_type === 'dify' ? 'dify' : (ws.workload_type === 'agent' || ws.workload_type === 'generic') ? 'agent' : 'n8n'}.trybase.io
                            </span>

                            {/* Workload Badge */}
                            <span className="badge" style={{
                              background: (ws.workload_type === 'agent' || ws.workload_type === 'generic') ? 'rgba(16, 185, 129, 0.15)' : ws.workload_type === 'dify' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: (ws.workload_type === 'agent' || ws.workload_type === 'generic') ? '#34d399' : ws.workload_type === 'dify' ? '#c084fc' : 'var(--accent-blue)',
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontWeight: 600,
                              border: `1px solid ${(ws.workload_type === 'agent' || ws.workload_type === 'generic') ? 'rgba(16, 185, 129, 0.3)' : ws.workload_type === 'dify' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                            }}>
                              {(ws.workload_type === 'agent' || ws.workload_type === 'generic') ? <Cpu size={12} /> : ws.workload_type === 'dify' ? <Bot size={12} /> : <Zap size={12} />}
                              {(ws.workload_type === 'agent' || ws.workload_type === 'generic') ? 'Custom AI Container' : ws.workload_type === 'dify' ? 'Dify AI Studio' : 'n8n Automation'}
                            </span>

                            {/* pgvector badge */}
                            <span className="badge" style={{
                              background: 'rgba(56, 189, 248, 0.12)',
                              color: '#38bdf8',
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              border: '1px solid rgba(56, 189, 248, 0.25)'
                            }}>
                              <Database size={12} /> pgvector 0.7
                            </span>

                            {/* Bedrock IAM badge */}
                            <span className="badge" style={{
                              background: 'rgba(168, 85, 247, 0.12)',
                              color: '#c084fc',
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              border: '1px solid rgba(168, 85, 247, 0.25)'
                            }}>
                              <Sparkles size={12} /> Keyless Bedrock IAM
                            </span>
                          </div>

                          <div className="text-secondary" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{
                              display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                              backgroundColor: ws.status === 'active' ? '#10b981' : ws.status === 'provisioning' ? '#f59e0b' : '#6b7280',
                              boxShadow: ws.status === 'active' ? '0 0 8px #10b981' : 'none'
                            }}></span>
                            <span>Status: <strong style={{ textTransform: 'capitalize', color: ws.status === 'active' ? '#34d399' : 'inherit' }}>{ws.status}</strong></span>
                            <span>&bull;</span>
                            <span>AWS Fargate Graviton (0.5 vCPU • 1 GB)</span>
                            <span>&bull;</span>
                            <span>0 Public IPs</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {ws.status === 'provisioning' && (
                            <button
                              onClick={() => handleResetWorkspace(ws.id)}
                              style={{ background: 'none', border: 'none', color: '#f43f5e', fontSize: '0.8rem', cursor: 'pointer', opacity: 0.7 }}
                            >
                              Reset Deployment
                            </button>
                          )}
                          
                          {ws.status === 'unprovisioned' ? (
                            <button onClick={() => initiateProvisioning(ws.id)} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                              <CheckCircle2 size={16} style={{ marginRight: '0.5rem' }} /> Complete Setup
                            </button>
                          ) : ws.status === 'active' ? (
                            <>
                              <button
                                onClick={() => setExpandedTelemetryId(expandedTelemetryId === ws.id ? null : ws.id)}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.5rem 0.95rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  fontSize: '0.85rem',
                                  background: expandedTelemetryId === ws.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                  borderColor: expandedTelemetryId === ws.id ? 'var(--accent-blue)' : 'var(--border-subtle)',
                                  color: expandedTelemetryId === ws.id ? 'var(--accent-blue)' : 'white'
                                }}
                              >
                                <Activity size={14} />
                                Telemetry & Security
                                {expandedTelemetryId === ws.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>

                              <a
                                href={`https://${ws.tenant_id}.${ws.workload_type === 'dify' ? 'dify' : (ws.workload_type === 'agent' || ws.workload_type === 'generic') ? 'agent' : 'n8n'}.trybase.io`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-primary"
                                style={{ padding: '0.5rem 1.15rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                              >
                                {(ws.workload_type === 'agent' || ws.workload_type === 'generic') ? 'Open Agent API' : ws.workload_type === 'dify' ? 'Open Dify Studio' : 'Open n8n'}
                                <ExternalLink size={13} />
                              </a>
                            </>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.5rem 1rem' }}>Provisioning...</span>
                          )}
                        </div>
                      </div>

                      {/* Expandable Telemetry & Security Inspector Drawer */}
                      {ws.status === 'active' && expandedTelemetryId === ws.id && (
                        <div style={{
                          padding: '1.75rem',
                          margin: '0 1.5rem 1.75rem 1.5rem',
                          background: 'rgba(10, 15, 28, 0.85)',
                          borderRadius: '10px',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <ShieldCheck size={18} color="#34d399" />
                              <strong style={{ fontSize: '1rem', color: 'white' }}>Live Control Plane Inspector</strong>
                              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.7rem' }}>ENFORCED</span>
                            </div>
                            <span className="text-secondary" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                              Region: eu-west-2 &bull; VPC: vpc-0e9... (Private)
                            </span>
                          </div>

                          {/* 3-Column Diagnostic Specs Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                            
                            {/* Column 1: Zero-Trust IAM & Bedrock */}
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                                <Lock size={15} />
                                Zero-Trust IAM & Bedrock
                              </div>
                              <div style={{ marginBottom: '0.65rem' }}>
                                <span className="text-secondary" style={{ fontSize: '0.75rem', display: 'block' }}>Dedicated IAM Task Role:</span>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '0.35rem 0.55rem', borderRadius: '4px', marginTop: '0.2rem' }}>
                                  <code style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>trybase-{ws.tenant_id}-task-role</code>
                                  <button
                                    onClick={() => handleCopy(`trybase-${ws.tenant_id}-task-role`, `role-${ws.id}`)}
                                    style={{ background: 'none', border: 'none', color: copiedField === `role-${ws.id}` ? '#34d399' : 'var(--text-secondary)', cursor: 'pointer', padding: '0 0.2rem' }}
                                    title="Copy Role Name"
                                  >
                                    {copiedField === `role-${ws.id}` ? <Check size={13} /> : <Copy size={13} />}
                                  </button>
                                </div>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                <div>&bull; Bedrock: <code>bedrock:InvokeModel</code> (Keyless STS)</div>
                                <div>&bull; Guardrails: <code>PII Masking & Safety Active</code></div>
                                <div>&bull; Raw Keys Stored: <strong style={{ color: '#34d399' }}>0 (Zero secrets leaked)</strong></div>
                              </div>
                            </div>

                            {/* Column 2: MicroVM Specs & Vector Memory */}
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                                <Cpu size={15} />
                                MicroVM & Vector Memory
                              </div>
                              <div style={{ marginBottom: '0.65rem' }}>
                                <span className="text-secondary" style={{ fontSize: '0.75rem', display: 'block' }}>Isolated RDS Vector Target:</span>
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.35rem 0.55rem', borderRadius: '4px', marginTop: '0.2rem' }}>
                                  <code style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                                    {ws.workload_type === 'dify' ? `db_${(ws.tenant_id || '').replace(/-/g, '_')}` : `schema ${(ws.tenant_id || '').replace(/-/g, '_')}`}
                                  </code>
                                </div>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                <div>&bull; Architecture: <code>AWS Graviton ARM64</code></div>
                                <div>&bull; Compute: <code>0.5 vCPU • 1024 MiB RAM</code></div>
                                <div>&bull; Vector Index: <code>pgvector 1,536-dim HNSW</code></div>
                              </div>
                            </div>

                            {/* Column 3: Telemetry & Cost SLIs */}
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                                <Activity size={15} />
                                Service-Level Indicators (SLIs)
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.45rem', borderRadius: '6px' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>P95 Latency</span>
                                  <strong style={{ fontSize: '0.95rem', color: '#34d399' }}>485ms</strong>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.45rem', borderRadius: '6px' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Target Health</span>
                                  <strong style={{ fontSize: '0.95rem', color: '#34d399' }}>HTTP 200</strong>
                                </div>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                <div>&bull; Tokens Processed: <strong>284,500 (24h)</strong></div>
                                <div>&bull; Infracost Burn: <strong>~$0.18 / day compute</strong></div>
                                <div>&bull; Scale-to-Zero: <strong style={{ color: '#38bdf8' }}>Ready (Auto-Idle on)</strong></div>
                              </div>
                            </div>

                          </div>

                          {/* Live Task Stream Console */}
                          <div style={{ background: '#050811', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'monospace' }}>
                                <Terminal size={14} color="#34d399" />
                                CloudWatch Task Logs &bull; awslogs/trybase-{ws.tenant_id}
                              </span>
                              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.65rem' }}>LIVE STREAM</span>
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6, maxHeight: '110px', overflowY: 'auto' }}>
                              <div style={{ color: '#64748b' }}>[task/trybase-{ws.tenant_id}] Initializing isolated microVM container on AWS Fargate (ARM64)...</div>
                              <div style={{ color: '#34d399' }}>[iam-auth] Scoped STS token assumed for role trybase-{ws.tenant_id}-task-role (TTL: 3600s)</div>
                              <div style={{ color: '#c084fc' }}>[bedrock-client] Bedrock runtime client ready (region: eu-west-2, keyless IAM auth)</div>
                              <div style={{ color: '#38bdf8' }}>[pgvector] Connection pool established to db.trybase.internal:5432 with pgvector enabled</div>
                              <div style={{ color: '#e2e8f0' }}>[alb-ingress] Health check GET / → 200 OK. Traffic routing active on private port.</div>
                            </div>
                          </div>

                        </div>
                      )}

                      {ws.status === 'provisioning' && (
                        <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                          <ProvisioningTerminal
                            status={ws.status}
                            tenantId={ws.tenant_id}
                            startedAt={ws.provisioning_started_at}
                            finishedAt={ws.provisioned_at}
                            onTriggerGame={() => setShowGame(true)}
                          />
                          {showGame && (
                            <div className="animate-fadeIn" style={{ marginTop: '2rem' }}>
                              <ProvisioningGame />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show terminal briefly after success if it just finished */}
                      {ws.status === 'active' && !expandedTelemetryId && (
                        <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                          <ProvisioningTerminal
                            status={ws.status}
                            tenantId={ws.tenant_id}
                            startedAt={ws.provisioning_started_at}
                            finishedAt={ws.provisioned_at}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'billing' ? (
          <div className="glass-card animate-fadeIn" style={{ padding: '0' }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <h2>Billing & Usage</h2>
              <p className="text-secondary">Manage your active subscription and usage limits.</p>
            </div>

            {billingMessage && (
              <div style={{ margin: '2rem', padding: '1rem', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '500' }}>
                <Server size={20} />
                {billingMessage}
              </div>
            )}

            <div style={{ padding: '2rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Stripe Managed Subscription</div>
                    <div className="text-secondary" style={{ marginTop: '0.5rem', maxWidth: '500px' }}>
                      Your active tier determines your maximum workflow limits, CPU allocations, and Fargate scaling behaviors.
                    </div>
                  </div>
                  <div className="badge badge-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    Active
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button onClick={handleBillingPortal} disabled={isPortalLoading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isPortalLoading ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                  Manage Subscription using Stripe
                </button>
                <a href="mailto:bastiyan@blymo.co.uk" className="text-secondary" style={{ textDecoration: 'none', display: 'inline-block', marginLeft: '1rem', ':hover': { color: 'white' } }}>
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="glass-card animate-fadeIn" style={{ padding: '0' }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <h2>Account Settings</h2>
              <p className="text-secondary">Manage your profile and security credentials.</p>
            </div>
            <div style={{ padding: '2rem', maxWidth: '600px' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Change Password</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const newPass = e.target.newPassword.value;
                if (!newPass || newPass.length < 6) return alert("Password must be at least 6 characters.");
                const { error } = await supabase.auth.updateUser({ password: newPass });
                if (error) alert("Error updating password: " + error.message);
                else {
                  alert("Password updated successfully!");
                  e.target.reset();
                }
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>New Password</label>
                  <input
                    name="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'white' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary">Update Password</button>
              </form>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default Dashboard;
