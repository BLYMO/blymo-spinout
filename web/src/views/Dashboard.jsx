import React, { useEffect, useState } from 'react';
import { Server, Settings, CreditCard, LogOut, Loader2, Zap, CheckCircle2, Activity, Network, Database, Play, Bot, Sparkles, Cpu } from 'lucide-react';
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
  const [workloadType, setWorkloadType] = useState('n8n'); // 'n8n' | 'dify'

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
    setWorkloadType('n8n');
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '540px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Deploy Isolated AI Instance</h2>
            <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Choose your AI workload engine and identifier for your dedicated AWS Fargate environment with native pgvector memory.
            </p>

            {/* AI Engine Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                SELECT ENGINE
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div
                  onClick={() => setWorkloadType('n8n')}
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${workloadType === 'n8n' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    background: workloadType === 'n8n' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <Zap size={18} color={workloadType === 'n8n' ? 'var(--accent-blue)' : '#9ca3af'} />
                    <strong style={{ fontSize: '0.95rem' }}>n8n Automation</strong>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>
                    Multi-tenant schema mode, AI nodes & pgvector memory.
                  </p>
                </div>

                <div
                  onClick={() => setWorkloadType('dify')}
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${workloadType === 'dify' ? '#a855f7' : 'var(--border-subtle)'}`,
                    background: workloadType === 'dify' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <Bot size={18} color={workloadType === 'dify' ? '#c084fc' : '#9ca3af'} />
                    <strong style={{ fontSize: '0.95rem' }}>Dify AI Studio</strong>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>
                    Dedicated database mode, Agent workflows & RAG search.
                  </p>
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
              <span className="text-secondary">.{workloadType === 'dify' ? 'dify' : 'n8n'}.trybase.io</span>
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
            {/* System Health Overview (Disabled/Coming Soon) */}
            <div style={{ marginBottom: '1.5rem', padding: '0 0.5rem' }}>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem', cursor: 'not-allowed', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div className="feature-icon" style={{ background: 'rgba(59, 130, 246, 0.05)', color: 'rgba(59, 130, 246, 0.5)', padding: '0.65rem', borderRadius: '8px' }}>
                    <Activity size={20} />
                  </div>
                  <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', border: '1px solid rgba(255,255,255,0.05)' }}>COMING SOON</span>
                </div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Control Plane Uptime</h3>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.1)' }}>— %</div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', cursor: 'not-allowed', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div className="feature-icon" style={{ background: 'rgba(16, 185, 129, 0.05)', color: 'rgba(16, 185, 129, 0.5)', padding: '0.65rem', borderRadius: '8px' }}>
                    <Network size={20} />
                  </div>
                  <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', border: '1px solid rgba(255,255,255,0.05)' }}>COMING SOON</span>
                </div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Global Latency</h3>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.1)' }}>— ms</div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', cursor: 'not-allowed', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div className="feature-icon" style={{ background: 'rgba(245, 158, 11, 0.05)', color: 'rgba(245, 158, 11, 0.5)', padding: '0.65rem', borderRadius: '8px' }}>
                    <Database size={20} />
                  </div>
                  <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', border: '1px solid rgba(255,255,255,0.05)' }}>COMING SOON</span>
                </div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Last Automated Backup</h3>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.1)' }}>— hr ago</div>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '1.1rem' }}>{ws.tenant_id || '<Pending Setup>'}</strong>
                            <span className="text-secondary" style={{ fontSize: '0.9rem' }}>
                              .{ws.workload_type === 'dify' ? 'dify' : 'n8n'}.trybase.io
                            </span>
                            <span className="badge" style={{
                              background: ws.workload_type === 'dify' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: ws.workload_type === 'dify' ? '#c084fc' : 'var(--accent-blue)',
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              border: `1px solid ${ws.workload_type === 'dify' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                            }}>
                              {ws.workload_type === 'dify' ? <Bot size={12} /> : <Zap size={12} />}
                              {ws.workload_type === 'dify' ? 'Dify AI Studio' : 'n8n Automation'}
                            </span>
                            <span className="badge" style={{
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#34d399',
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              border: '1px solid rgba(16, 185, 129, 0.25)'
                            }}>
                              <Database size={12} /> pgvector
                            </span>
                          </div>
                          <div className="text-secondary" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                              backgroundColor: ws.status === 'active' ? '#10b981' : ws.status === 'provisioning' ? '#f59e0b' : '#6b7280'
                            }}></span>
                            Status: <span style={{ textTransform: 'capitalize' }}>{ws.status}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {ws.status === 'provisioning' && (
                            <button
                              onClick={() => handleResetWorkspace(ws.id)}
                              style={{ background: 'none', border: 'none', color: '#f43f5e', fontSize: '0.8rem', cursor: 'pointer', opacity: 0.6 }}
                            >
                              Reset Deployment
                            </button>
                          )}
                          {ws.status === 'unprovisioned' ? (
                            <button onClick={() => initiateProvisioning(ws.id)} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                              <CheckCircle2 size={16} style={{ marginRight: '0.5rem' }} /> Complete Setup
                            </button>
                          ) : ws.status === 'active' ? (
                            <a
                              href={`https://${ws.tenant_id}.${ws.workload_type === 'dify' ? 'dify' : 'n8n'}.trybase.io`}
                              target="_blank"
                              className="btn btn-secondary"
                              style={{ padding: '0.5rem 1.25rem', textDecoration: 'none' }}
                            >
                              {ws.workload_type === 'dify' ? 'Open Dify Studio' : 'Open n8n'}
                            </a>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.5rem 1rem' }}>Provisioning...</span>
                          )}
                        </div>
                      </div>

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
                      {ws.status === 'active' && (
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
