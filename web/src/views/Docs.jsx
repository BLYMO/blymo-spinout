import React, { useState } from 'react';
import { 
  Server, Shield, Zap, Terminal, Code, Database, ArrowRight, Check, 
  Menu, X, Star, Bot, Cpu, Sparkles, Cloud, Lock, Copy, CheckCircle2, 
  AlertTriangle, Layers, BookOpen, Search, ChevronRight, ExternalLink, 
  Activity, ArrowUpRight, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DOC_SECTIONS = [
  {
    group: 'Getting Started',
    items: [
      { id: 'overview', title: 'What is TryBase?', icon: BookOpen },
      { id: 'quickstart', title: '3-Minute Quickstart', icon: Zap },
      { id: 'architecture', title: 'Infrastructure Topology', icon: Layers }
    ]
  },
  {
    group: 'Security & Zero-Trust IAM',
    items: [
      { id: 'keyless-sts', title: 'Keyless STS Authentication', icon: Lock },
      { id: 'task-roles', title: 'Per-Tenant IAM Task Roles', icon: Shield },
      { id: 'black-october', title: 'The Anti-Leak Standard', icon: AlertTriangle }
    ]
  },
  {
    group: 'Hyperscaler Core',
    items: [
      { id: 'fargate-microvms', title: 'Private Fargate MicroVMs', icon: Cpu },
      { id: 'alb-routing', title: 'ALB & Wildcard TLS Routing', icon: Cloud },
      { id: 'vector-memory', title: 'pgvector & RDS Subsystem', icon: Database }
    ]
  },
  {
    group: 'Workloads & Containers',
    items: [
      { id: 'generic-workload', title: 'Generic Container Module', icon: Code },
      { id: 'writing-agents', title: 'Writing Keyless Agent Code', icon: Bot },
      { id: 'adapters', title: 'Dify & n8n Starter Adapters', icon: Server }
    ]
  },
  {
    group: 'FinOps & Operations',
    items: [
      { id: 'finops', title: 'Infracost Pre-Deploy Audit', icon: Activity },
      { id: 'cli-cheatsheet', title: 'Makefile & CLI Reference', icon: Terminal }
    ]
  }
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredSections = DOC_SECTIONS.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.group.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      color: '#0f172a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Navigation Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 1.5rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button 
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#334155'
            }}
            className="mobile-docs-toggle"
          >
            {isMobileSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#0f172a' }}>
            <img src="/logo.png" alt="TryBase Logo" style={{ height: '24px' }} />
            <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>TryBase</span>
            <span style={{
              background: '#eff6ff',
              color: '#2563eb',
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              border: '1px solid #dbeafe',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}>
              Docs
            </span>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f1f5f9',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            border: '1px solid #e2e8f0',
            width: '240px'
          }}>
            <Search size={15} color="#64748b" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.85rem',
                color: '#0f172a',
                width: '100%'
              }}
            />
          </div>

          <a 
            href="https://github.com/rgayan12/trybase" 
            target="_blank" 
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <Star size={14} fill="#eab308" color="#eab308" /> GitHub
          </a>

          <Link 
            to="/" 
            style={{
              padding: '0.45rem 0.85rem',
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Launch Platform
          </Link>
        </div>
      </header>

      {/* Main Documentation Grid */}
      <div style={{
        display: 'flex',
        flex: 1,
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%'
      }}>
        
        {/* Left Sidebar Navigation */}
        <aside style={{
          width: '280px',
          borderRight: '1px solid #e2e8f0',
          padding: '2rem 1.25rem',
          backgroundColor: '#fafafa',
          overflowY: 'auto',
          height: 'calc(100vh - 64px)',
          position: 'sticky',
          top: '64px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem'
        }}>
          {filteredSections.map((group, idx) => (
            <div key={idx}>
              <h4 style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#64748b',
                marginBottom: '0.65rem',
                paddingLeft: '0.5rem'
              }}>
                {group.group}
              </h4>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: isActive ? '#eff6ff' : 'transparent',
                        color: isActive ? '#2563eb' : '#475569',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={16} color={isActive ? '#2563eb' : '#64748b'} />
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}

          <div style={{ marginTop: 'auto', padding: '1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e40af', display: 'block', marginBottom: '0.25rem' }}>
              Apache 2.0 Open Source
            </span>
            <p style={{ fontSize: '0.75rem', color: '#3b82f6', margin: 0, lineHeight: 1.4 }}>
              Deploy freely on your own AWS infrastructure with 100% data sovereignty.
            </p>
          </div>
        </aside>

        {/* Content Body */}
        <main style={{
          flex: 1,
          padding: '3rem 4rem',
          maxWidth: '920px',
          overflowY: 'auto',
          lineHeight: 1.7
        }}>

          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
            <span>Docs</span>
            <ChevronRight size={14} />
            <span style={{ textTransform: 'capitalize' }}>
              {DOC_SECTIONS.find(g => g.items.some(i => i.id === activeSection))?.group || 'Infrastructure'}
            </span>
            <ChevronRight size={14} />
            <span style={{ color: '#0f172a', fontWeight: 600 }}>
              {DOC_SECTIONS.flatMap(g => g.items).find(i => i.id === activeSection)?.title}
            </span>
          </div>

          {/* SECTION 1: OVERVIEW */}
          {activeSection === 'overview' && (
            <article>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                  FOUNDATION
                </span>
              </div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: '1rem' }}>
                What is TryBase?
              </h1>
              <p style={{ fontSize: '1.2rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem' }}>
                TryBase is the <strong>Open-Source AI Agent Infrastructure Layer</strong> designed to build, run, and scale multi-tenant AI agents on battle-tested hyperscalers (AWS Fargate, Bedrock, and Graviton RDS with pgvector).
              </p>

              <div style={{ background: '#f8fafc', borderLeft: '4px solid #2563eb', padding: '1.25rem', borderRadius: '0 8px 8px 0', marginBottom: '2rem' }}>
                <strong style={{ color: '#1e3a8a', display: 'block', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
                  The Core Architectural Shift
                </strong>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155' }}>
                  Instead of running agents on fragile shared PaaS hosting or storing static API keys in vulnerable environment variables, TryBase provisions a dedicated Firecracker MicroVM, a unique IAM Task Role, and an isolated pgvector collection for every tenant.
                </p>
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '2.5rem', marginBottom: '1rem' }}>
                The Hyperscaler Trinity
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <Cpu size={22} color="#2563eb" style={{ marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.35rem' }}>AWS Fargate Graviton</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Firecracker MicroVM compute in a 100% private VPC. Zero public IP exposure.
                  </p>
                </div>
                <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <Sparkles size={22} color="#7c3aed" style={{ marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.35rem' }}>Amazon Bedrock</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Keyless foundation model gateway for Claude 3.5 Sonnet, Llama 3, and Titan with guardrails.
                  </p>
                </div>
                <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <Database size={22} color="#059669" style={{ marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.35rem' }}>RDS PostgreSQL + pgvector</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Dedicated 1,536-dim vector memory per tenant with native HNSW indexing.
                  </p>
                </div>
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '2.5rem', marginBottom: '1rem' }}>
                Who is TryBase for?
              </h2>
              <ul style={{ paddingLeft: '1.25rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <li><strong>AI SaaS Builders</strong>: Building multi-tenant agent platforms who need true compute and credential isolation between customers.</li>
                <li><strong>Enterprise Platform & Security Teams</strong>: Moving away from static API keys and looking for automated IAM STS role rotation and VPC boundaries.</li>
                <li><strong>AI Automation Agencies</strong>: Delivering isolated client agents on their own AWS with pre-calculated Infracost FinOps governance.</li>
              </ul>
            </article>
          )}

          {/* SECTION 2: QUICKSTART */}
          {activeSection === 'quickstart' && (
            <article>
              <span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                TUTORIAL
              </span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginTop: '0.5rem', marginBottom: '1rem' }}>
                3-Minute Quickstart
              </h1>
              <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '2rem' }}>
                Bootstrap the shared VPC, ALB, Graviton RDS instance, and deploy your first isolated AI agent workload.
              </p>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2rem', marginBottom: '0.75rem' }}>
                1. Clone and Configure
              </h2>
              <div style={{ position: 'relative', background: '#0f172a', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <button
                  onClick={() => handleCopy(`git clone https://github.com/rgayan12/trybase.git\ncd trybase\ncp terraform/terraform.tfvars.example terraform/terraform.tfvars`, 'qs-1')}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  {copiedCode === 'qs-1' ? 'Copied!' : 'Copy'}
                </button>
                <pre style={{ margin: 0, color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  <code>{`git clone https://github.com/rgayan12/trybase.git
cd trybase
cp terraform/terraform.tfvars.example terraform/terraform.tfvars`}</code>
                </pre>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2rem', marginBottom: '0.75rem' }}>
                2. Run Pre-Deploy FinOps Audit
              </h2>
              <p style={{ fontSize: '0.92rem', color: '#475569', marginBottom: '0.75rem' }}>
                Audit your exact monthly AWS expenses before provisioning a single cloud resource:
              </p>
              <div style={{ position: 'relative', background: '#0f172a', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <button
                  onClick={() => handleCopy('make cost', 'qs-2')}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  {copiedCode === 'qs-2' ? 'Copied!' : 'Copy'}
                </button>
                <pre style={{ margin: 0, color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  <code>make cost</code>
                </pre>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2rem', marginBottom: '0.75rem' }}>
                3. Deploy Infrastructure
              </h2>
              <div style={{ position: 'relative', background: '#0f172a', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <button
                  onClick={() => handleCopy('make deploy', 'qs-3')}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  {copiedCode === 'qs-3' ? 'Copied!' : 'Copy'}
                </button>
                <pre style={{ margin: 0, color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  <code>make deploy</code>
                </pre>
              </div>
              <p style={{ fontSize: '0.92rem', color: '#475569' }}>
                In under 8 minutes, Terraform provisions the multi-AZ VPC, Application Load Balancer with wildcard certificates, ECS Fargate cluster, Graviton RDS with pgvector, and Step Functions control plane.
              </p>
            </article>
          )}

          {/* SECTION 3: KEYLESS STS */}
          {activeSection === 'keyless-sts' && (
            <article>
              <span style={{ background: '#fef2f2', color: '#dc2626', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                SECURITY ARCHITECTURE
              </span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginTop: '0.5rem', marginBottom: '1rem' }}>
                Keyless STS Authentication
              </h1>
              <p style={{ fontSize: '1.15rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem' }}>
                How TryBase eliminates static API keys entirely, preventing credential theft and secret leaks at the infrastructure level.
              </p>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginTop: '2rem', marginBottom: '1rem' }}>
                The Link-Local Metadata Agent (169.254.170.2)
              </h2>
              <p style={{ color: '#334155', marginBottom: '1rem' }}>
                In traditional container setups, developers generate permanent IAM access keys (<code style={{ color: '#dc2626' }}>AKIA...</code>) and store them in <code style={{ color: '#dc2626' }}>.env</code> files or container environments. When a container escape or supply chain attack happens, attackers steal these permanent keys.
              </p>
              <p style={{ color: '#334155', marginBottom: '1.5rem' }}>
                In TryBase, the container definition receives <strong>zero AWS keys</strong>. Instead, AWS Fargate exposes an internal link-local metadata endpoint reachable only from inside that specific microVM:
              </p>

              <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.25rem', fontFamily: 'monospace', fontSize: '0.88rem', color: '#0f172a', marginBottom: '2rem' }}>
                http://169.254.170.2$AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginTop: '2rem', marginBottom: '1rem' }}>
                The Automatic 60-Minute Rotation Loop
              </h2>
              <ol style={{ paddingLeft: '1.25rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <li>
                  <strong>SDK Query:</strong> When your Python agent calls <code style={{ color: '#2563eb' }}>boto3.client('bedrock-runtime')</code>, the SDK checks environment variables, sees none, and queries <code style={{ color: '#2563eb' }}>169.254.170.2</code>.
                </li>
                <li>
                  <strong>AWS STS Minting:</strong> AWS Security Token Service (STS) assumes the container's dedicated Task Role and returns a temporary token starting with <code style={{ color: '#16a34a' }}>ASIA...</code> valid for 60 minutes.
                </li>
                <li>
                  <strong>Silent In-Memory Refresh:</strong> Roughly 10-15 minutes before the token expires, the SDK automatically re-queries the link-local agent and swaps in a fresh token in memory.
                </li>
                <li>
                  <strong>Zero Code Interruption:</strong> The agent never restarts, never disconnects, and never throws an auth error.
                </li>
              </ol>

              <div style={{ marginTop: '2rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontWeight: 700, marginBottom: '0.35rem' }}>
                  <ShieldCheck size={18} />
                  <span>The Security Result</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#166534' }}>
                  Even if an attacker dumps the container's environment variables or executes a shell injection, there are no static credentials to steal. The in-memory token is cryptographically bound to that microVM and expires within minutes.
                </p>
              </div>
            </article>
          )}

          {/* SECTION 4: TASK ROLES */}
          {activeSection === 'task-roles' && (
            <article>
              <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                MULTI-TENANCY
              </span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginTop: '0.5rem', marginBottom: '1rem' }}>
                Per-Tenant IAM Task Roles
              </h1>
              <p style={{ fontSize: '1.15rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem' }}>
                Strict cryptographic boundaries that isolate every customer workload, preventing cross-tenant access.
              </p>

              <p style={{ color: '#334155', marginBottom: '1.5rem' }}>
                In multi-tenant SaaS platforms, the biggest architectural failure is assigning a single shared IAM role or API token to all containers. In TryBase, every workload provisioned via <code style={{ color: '#2563eb' }}>modules/generic-workload</code> generates a dedicated AWS IAM role:
              </p>

              <div style={{ position: 'relative', background: '#0f172a', borderRadius: '8px', padding: '1.25rem', marginBottom: '2rem' }}>
                <pre style={{ margin: 0, color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  <code>{`resource "aws_iam_role" "task_role" {
  name = "trybase-\${var.service_name}-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}`}</code>
                </pre>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginTop: '2rem', marginBottom: '1rem' }}>
                Why Dedicated Roles Matter
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>Zero Cross-Talk</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Tenant A's container physically cannot access Tenant B's S3 buckets, Bedrock models, or pgvector schemas.
                  </p>
                </div>
                <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>Auditability</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Every single token invocation in AWS CloudTrail is signed with the specific tenant's role ARN.
                  </p>
                </div>
              </div>
            </article>
          )}

          {/* SECTION 5: WRITING AGENTS */}
          {activeSection === 'writing-agents' && (
            <article>
              <span style={{ background: '#ecfdf5', color: '#059669', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                DEVELOPER GUIDE
              </span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginTop: '0.5rem', marginBottom: '1rem' }}>
                Writing Keyless Agent Containers
              </h1>
              <p style={{ fontSize: '1.15rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem' }}>
                Step-by-step code examples showing how to write production AI agents that invoke Bedrock foundation models keylessly.
              </p>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2rem', marginBottom: '0.75rem' }}>
                Python (boto3 + FastAPI)
              </h2>
              <div style={{ position: 'relative', background: '#0f172a', borderRadius: '8px', padding: '1.25rem', marginBottom: '2rem' }}>
                <pre style={{ margin: 0, color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  <code>{`import os, json, boto3
from fastapi import FastAPI, HTTPException

app = FastAPI(title="TryBase Keyless Agent")

# ZERO API KEYS PASSED!
# Boto3 queries the link-local STS endpoint automatically
bedrock = boto3.client("bedrock-runtime", region_name="eu-west-2")

@app.post("/chat")
def chat(prompt: str):
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": prompt}]
    })
    
    response = bedrock.invoke_model(
        modelId="anthropic.claude-3-5-sonnet-20240620-v1:0",
        body=body
    )
    result = json.loads(response["body"].read())
    return {"reply": result["content"][0]["text"]}`}</code>
                </pre>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2rem', marginBottom: '0.75rem' }}>
                TypeScript (@aws-sdk/client-bedrock-runtime)
              </h2>
              <div style={{ position: 'relative', background: '#0f172a', borderRadius: '8px', padding: '1.25rem', marginBottom: '2rem' }}>
                <pre style={{ margin: 0, color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  <code>{`import express from "express";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const app = express();
app.use(express.json());

// Zero credentials needed in code
const bedrock = new BedrockRuntimeClient({ region: "eu-west-2" });

app.post("/chat", async (req, res) => {
  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
    contentType: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      messages: [{ role: "user", content: req.body.prompt }]
    })
  });
  const response = await bedrock.send(command);
  res.json(JSON.parse(new TextDecoder().decode(response.body)));
});`}</code>
                </pre>
              </div>
            </article>
          )}

          {/* SECTION: ADAPTERS & REDIS ARCHITECTURE */}
          {activeSection === 'adapters' && (
            <article>
              <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                EXTENSIBILITY & ADAPTERS
              </span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginTop: '0.5rem', marginBottom: '1rem' }}>
                Workload Adapters & Redis Caching
              </h1>
              <p style={{ fontSize: '1.15rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem' }}>
                The open-source specification for packaging AI agent studios (Dify, n8n, Langflow) with hardware isolation, zero-cost Redis sidecars, and scoped database security.
              </p>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginTop: '2rem', marginBottom: '1rem' }}>
                What is a TryBase Adapter?
              </h2>
              <p style={{ color: '#334155', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                A <strong>Workload Adapter</strong> is a declarative Terraform specification that packages an autonomous runtime or visual AI studio and hooks it into TryBase's multi-tenant hyperscaler fabric. Instead of managing separate clusters, virtual networks, or load balancers for each framework, an adapter standardizes four core contracts:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>1. Compute Hypervisor</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Dedicated AWS Fargate Graviton ARM64 MicroVM with per-second billing.</div>
                </div>
                <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>2. Traffic Ingress</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Automatic Host-header routing rule and target group on the shared ALB.</div>
                </div>
                <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>3. Vector Memory</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Dedicated schema or database on Graviton RDS with native pgvector enabled.</div>
                </div>
                <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>4. In-Task Caching</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Zero-cost local Redis sidecar container sharing the task loopback interface.</div>
                </div>
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginTop: '2.5rem', marginBottom: '1rem' }}>
                The Redis Sidecar Architecture
              </h2>
              <p style={{ color: '#334155', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                Most modern AI agent platforms (like Dify for Celery worker queues or LangChain for memory buffers) require Redis. Traditional cloud setups deploy a shared AWS ElastiCache cluster, which adds ~$20-$40/month of standing idle costs and creates cross-tenant cache collision risks.
              </p>
              <p style={{ color: '#334155', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                TryBase uses the <strong>Container Sidecar Pattern</strong>. Because AWS Fargate operates in <code style={{ color: '#2563eb' }}>awsvpc</code> network mode, all containers within a single task share the exact same network namespace and localhost loopback interface:
              </p>

              <div style={{ background: '#0f172a', borderRadius: '8px', padding: '1.25rem', fontFamily: 'monospace', fontSize: '0.82rem', color: '#f8fafc', marginBottom: '2rem', lineHeight: 1.6 }}>
                <div style={{ color: '#38bdf8' }}>// Inside Fargate MicroVM (Tenant Task)</div>
                <div style={{ color: '#94a3b8' }}>┌────────────────────────────────────────────────────────┐</div>
                <div style={{ color: '#94a3b8' }}>│  Fargate Network Namespace (10.0.2.x)                  │</div>
                <div style={{ color: '#94a3b8' }}>│                                                        │</div>
                <div>│  [ Application Container: Dify API / Langflow ]        │</div>
                <div>│       │                                                │</div>
                <div>│       ├── connects to "127.0.0.1:6379" (0.05ms)        │</div>
                <div>│       ▼                                                │</div>
                <div>│  [ Sidecar Container: redis:alpine (128MB RAM) ]      │</div>
                <div style={{ color: '#94a3b8' }}>└────────────────────────────────────────────────────────┘</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
                  <h4 style={{ color: '#15803d', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Zero Infrastructure Cost</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534' }}>
                    Redis runs inside the container's allocated memory. No ElastiCache cluster fees, no VPC peering costs, and no idle tax.
                  </p>
                </div>
                <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
                  <h4 style={{ color: '#15803d', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Physical Cache Isolation</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534' }}>
                    Tenant A's Redis instance is physically sandboxed inside their microVM cgroup. Tenant B cannot read or corrupt their cache.
                  </p>
                </div>
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginTop: '2.5rem', marginBottom: '1rem' }}>
                The Scoped Database Security Standard
              </h2>
              <p style={{ color: '#334155', lineHeight: 1.7, marginBottom: '1rem' }}>
                A foundational security rule in TryBase: <strong>Application containers must never receive the RDS master password.</strong>
              </p>
              <p style={{ color: '#334155', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                To maintain zero-trust boundaries across shared databases:
              </p>
              <ol style={{ paddingLeft: '1.25rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                <li>
                  <strong>2-Second Bootstrap Lambda:</strong> The <code style={{ color: '#2563eb' }}>create-schema</code> Lambda is the only entity with temporary access to the master RDS credentials.
                </li>
                <li>
                  <strong>Per-Tenant User Minting:</strong> For dedicated database workloads (like Dify), the Lambda creates a scoped user <code style={{ color: '#2563eb' }}>user_tenant_slug</code> with a cryptographically random password.
                </li>
                <li>
                  <strong>Strict Privileges:</strong> Permissions are granted exclusively to <code style={{ color: '#2563eb' }}>db_tenant_slug</code>. The user cannot view the Postgres catalog, read n8n schemas, or query other databases.
                </li>
                <li>
                  <strong>Secrets Manager Storage:</strong> Scoped credentials are stored in Secrets Manager and mounted directly into the Fargate task definition.
                </li>
              </ol>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginTop: '2.5rem', marginBottom: '1rem' }}>
                Contributing a New Adapter
              </h2>
              <p style={{ color: '#334155', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                We welcome open-source contributions of adapters for popular agent frameworks (Langflow, AutoGen, CrewAI, Flowise). Adding an adapter to TryBase requires three files:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Step 1: Module Definition</div>
                  <div style={{ fontSize: '0.88rem', color: '#475569' }}>
                    Create or extend <code style={{ color: '#2563eb' }}>terraform/modules/generic-workload</code> with your framework's container image, internal port, and health check path.
                  </div>
                </div>
                <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Step 2: Environment Wiring</div>
                  <div style={{ fontSize: '0.88rem', color: '#475569' }}>
                    Bind the database connection string, vector store (<code style={{ color: '#2563eb' }}>pgvector</code>), and Redis sidecar host (<code style={{ color: '#2563eb' }}>127.0.0.1:6379</code>).
                  </div>
                </div>
                <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Step 3: Verification Test</div>
                  <div style={{ fontSize: '0.88rem', color: '#475569' }}>
                    Add an automated test case to <code style={{ color: '#2563eb' }}>tests/test_api_provisioning.sh</code> and verify that <code style={{ color: '#2563eb' }}>make test-provision WORKLOAD=your_adapter</code> returns HTTP 200.
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* SECTION 6: FINOPS */}
          {activeSection === 'finops' && (
            <article>
              <span style={{ background: '#fffbeb', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                FINOPS & GOVERNANCE
              </span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginTop: '0.5rem', marginBottom: '1rem' }}>
                Infracost Pre-Deploy Audit
              </h1>
              <p style={{ fontSize: '1.15rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem' }}>
                Prevent cloud bill shock by auditing your exact infrastructure expenses down to the cent before running terraform apply.
              </p>

              <p style={{ color: '#334155', marginBottom: '1rem' }}>
                TryBase ships with built-in Infracost automation. Run <code style={{ color: '#2563eb' }}>make cost</code> to parse all 182 AWS resources and calculate monthly estimates:
              </p>

              <div style={{ background: '#0f172a', borderRadius: '8px', padding: '1.25rem', fontFamily: 'monospace', fontSize: '0.85rem', color: '#34d399', marginBottom: '2rem', lineHeight: 1.6 }}>
                <div>$ make cost</div>
                <div style={{ color: '#94a3b8' }}>────────────────────────────────────────────────────────</div>
                <div style={{ color: '#f8fafc' }}>Project: trybase/terraform</div>
                <div style={{ color: '#94a3b8' }}>────────────────────────────────────────────────────────</div>
                <div>aws_lb.main (ALB)                   $22.26 / mo</div>
                <div>aws_db_instance.rds (db.t4g.micro)  $18.10 / mo</div>
                <div>aws_ecs_cluster.main                $0.00 / mo</div>
                <div style={{ color: '#94a3b8' }}>────────────────────────────────────────────────────────</div>
                <div style={{ color: '#38bdf8' }}>OVERALL TOTAL:                           ~$280.00 / mo baseline</div>
              </div>
            </article>
          )}

          {/* SECTION 7: CLI REFERENCE */}
          {activeSection === 'cli-cheatsheet' && (
            <article>
              <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                REFERENCE
              </span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginTop: '0.5rem', marginBottom: '1rem' }}>
                Makefile & CLI Reference
              </h1>
              <p style={{ fontSize: '1.15rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem' }}>
                All high-level platform tasks are unified into simple Make targets.
              </p>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#0f172a' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Command</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Description</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#334155' }}>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', color: '#2563eb' }}>make check-env</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>Validates terraform, aws cli, docker, and jq installation</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', color: '#2563eb' }}>make bootstrap</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>Creates S3 remote state bucket & DynamoDB state locking table</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', color: '#2563eb' }}>make cost</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>Runs Infracost pre-deploy bill forecast</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', color: '#2563eb' }}>make deploy</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>Executes terraform apply to stand up all cloud infrastructure</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', color: '#2563eb' }}>make control-plane</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>Applies Supabase migrations & deploys edge orchestration functions</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', color: '#2563eb' }}>make destroy</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>Automated teardown with ENI retries & snapshot bypass</td>
                  </tr>
                </tbody>
              </table>
            </article>
          )}

          {/* FALLBACK FOR OTHER SECTIONS */}
          {!['overview', 'quickstart', 'keyless-sts', 'task-roles', 'writing-agents', 'adapters', 'finops', 'cli-cheatsheet'].includes(activeSection) && (
            <article>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: '1rem' }}>
                {DOC_SECTIONS.flatMap(g => g.items).find(i => i.id === activeSection)?.title || 'Documentation'}
              </h1>
              <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '2rem' }}>
                Detailed technical reference for the TryBase AI Agent Infrastructure Layer.
              </p>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Architecture Highlights
                </h3>
                <ul style={{ paddingLeft: '1.25rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.92rem' }}>
                  <li>AWS Fargate Graviton ARM64 microVM runtime</li>
                  <li>Link-local STS credential vending via <code style={{ color: '#2563eb' }}>169.254.170.2</code></li>
                  <li>Native pgvector 0.7.0 embeddings memory on PostgreSQL 16.3</li>
                  <li>Automatic Application Load Balancer wildcard TLS routing</li>
                </ul>
              </div>
            </article>
          )}

        </main>

      </div>
    </div>
  );
}
