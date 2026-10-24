import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, Shield, Zap, Terminal, Code, Database, ArrowRight, Check, Timer, 
  Loader2, Menu, X, Star, Bot, Cpu, Sparkles, Cloud, Lock, Copy, CheckCircle2, 
  AlertTriangle, Layers 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import '../index.css';
import { supabase } from '../lib/supabaseClient';
import { redirectToCheckout } from '../lib/billing';

const CODE_SNIPPETS = {
  python: {
    filename: 'agent.py',
    lang: 'Python (boto3 + FastAPI)',
    code: `import os, json, boto3
from fastapi import FastAPI, HTTPException

app = FastAPI(title="TryBase AI Agent")

# ZERO API KEYS REQUIRED!
# Boto3 automatically retrieves temporary STS credentials from AWS Fargate's
# link-local endpoint (169.254.170.2) using the container's dedicated Task Role.
bedrock = boto3.client("bedrock-runtime", region_name="eu-west-2")

@app.post("/chat")
def chat(prompt: str):
    try:
        # Keyless invocation of Claude 3.5 Sonnet on Amazon Bedrock
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": prompt}]
        })
        
        response = bedrock.invoke_model(
            modelId="anthropic.claude-3-5-sonnet-20240620-v1:0",
            body=body
        )
        data = json.loads(response["body"].read())
        return {"reply": data["content"][0]["text"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))`
  },
  typescript: {
    filename: 'agent.ts',
    lang: 'TypeScript (@aws-sdk)',
    code: `import express from "express";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const app = express();
app.use(express.json());

// Zero static AWS credentials in code or .env!
// The AWS SDK automatically requests 60-minute ephemeral STS tokens
// and silently refreshes them in-memory before expiration.
const bedrock = new BedrockRuntimeClient({ region: "eu-west-2" });

app.post("/chat", async (req, res) => {
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024,
    messages: [{ role: "user", content: req.body.prompt }]
  };

  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
    contentType: "application/json",
    body: JSON.stringify(payload)
  });

  const response = await bedrock.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  res.json({ reply: result.content[0].text });
});

app.listen(8080, () => console.log("AI Agent running on port 8080"));`
  },
  docker: {
    filename: 'Dockerfile',
    lang: 'Dockerfile (Graviton ARM64)',
    code: `# Lean Graviton-optimized container (Zero secrets baked into image layers)
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \\
    libpq-dev gcc && \\
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose internal port for Application Load Balancer
EXPOSE 8080

# Run without root privileges
USER 10001
CMD ["uvicorn", "agent:app", "--host", "0.0.0.0", "--port", "8080"]`
  },
  terraform: {
    filename: 'main.tf',
    lang: 'Terraform Module',
    code: `module "customer_agent" {
  source = "github.com/rgayan12/trybase//terraform/modules/generic-workload"

  service_name    = "support-agent"
  subdomain       = "support"
  container_image = "ghcr.io/my-org/support-agent:latest"
  container_port  = 8080
  
  # Attaches dedicated IAM Task Role with keyless Bedrock permissions
  enable_bedrock  = true

  environment_variables = {
    AWS_DEFAULT_REGION = "eu-west-2"
    # Zero API keys needed! AWS STS vends temporary tokens automatically.
  }

  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnets
  ecs_cluster_name           = aws_ecs_cluster.main.name
  alb_listener_arn           = aws_lb_listener.https.arn
  alb_security_group_id      = aws_security_group.alb.id
  alb_listener_rule_priority = 100
}`
  }
};

export default function Home() {
  const [mode, setMode] = useState('gui'); // 'gui' or 'cli'
  const demoRef = useRef(null);
  const [guiDeployState, setGuiDeployState] = useState('idle'); // 'idle', 'step1', 'step2', 'success'
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const step1Ref = useRef(null);
  const step2Ref = useRef(null);
  const step3Ref = useRef(null);
  const demoContainerRef = useRef(null);

  const [typedText, setTypedText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [session, setSession] = useState(null);

  // Waitlist State
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState('idle'); // 'idle' | 'loading' | 'success'

  // Code Tab State
  const [codeTab, setCodeTab] = useState('python'); // 'python' | 'typescript' | 'docker' | 'terraform'
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const handleCopySnippet = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleJoinWaitlist = async (e) => {
    e.preventDefault();
    if (!waitlistEmail || !waitlistEmail.includes('@')) return;
    setWaitlistStatus('loading');
    try {
      if (supabase?.from) {
        await supabase.from('waitlist').insert([{ email: waitlistEmail, created_at: new Date().toISOString() }]);
      }
    } catch (err) {
      console.warn('Waitlist notice:', err);
    } finally {
      setWaitlistStatus('success');
    }
  };

  const fullText = "curl -X POST https://api.trybase.io/provision \\\n  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\\n  -d '{ \"workspace\": \"acme-corp\" }'";

  useEffect(() => {
    let subscription = null;

    // Initial session check
    if (supabase?.auth?.getSession) {
      supabase.auth.getSession()
        .then(({ data }) => {
          setSession(data?.session || null);
        })
        .catch(err => {
          console.warn('Could not retrieve auth session:', err);
        });
    }

    // Listen for auth changes
    if (supabase?.auth?.onAuthStateChange) {
      try {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
        });
        subscription = data?.subscription;
      } catch (err) {
        console.warn('Could not register auth state listener:', err);
      }
    }

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (mode === 'cli') {
      setTypedText('');
      setShowResult(false);
      let i = 0;
      const typingInterval = setInterval(() => {
        if (i < fullText.length) {
          setTypedText(prev => prev + fullText.charAt(i));
          i++;
        } else {
          clearInterval(typingInterval);
          setShowResult(true);
        }
      }, 30);
      return () => clearInterval(typingInterval);
    }
  }, [mode]);

  // Auto-Scroll Engine for Mobile
  useEffect(() => {
    if (window.innerWidth > 768) return; // Only auto-scroll on mobile

    const scrollOptions = { behavior: 'smooth', block: 'center' };

    if (guiDeployState === 'step1') {
      step2Ref.current?.scrollIntoView(scrollOptions);
    } else if (guiDeployState === 'step2') {
      step3Ref.current?.scrollIntoView(scrollOptions);
    } else if (guiDeployState === 'success') {
      step3Ref.current?.scrollIntoView(scrollOptions);
    }
  }, [guiDeployState]);

  return (
    <>
      <nav>
        <div className="container nav-container">
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="TryBase Icon" style={{ height: '24px', filter: 'brightness(0) invert(1)' }} />
            TryBase
          </div>

          <div className="desktop-nav">
            <a href="#features" className="btn btn-secondary" style={{ marginRight: '1rem', border: 'none', background: 'transparent' }}>Features</a>
            <a href="#keyless-architecture" className="btn btn-secondary" style={{ marginRight: '1rem', border: 'none', background: 'transparent' }}>Architecture</a>
            <Link to="/docs" className="btn btn-secondary" style={{ marginRight: '1rem', border: 'none', background: 'transparent' }}>Docs</Link>
            <a href="#community" className="btn btn-secondary" style={{ marginRight: '1rem', border: 'none', background: 'transparent' }}>Cloud Waitlist</a>
            <a href="https://github.com/rgayan12/trybase" target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ marginRight: '1rem', border: 'none', background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Star size={16} fill="#facc15" color="#facc15" /> GitHub
            </a>
            {session ? (
              <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
            ) : (
              <Link to="/auth?mode=login" className="btn btn-primary" style={{ textDecoration: 'none' }}>Sign In</Link>
            )}
          </div>

          <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      <div className={`mobile-menu-overlay ${isMenuOpen ? 'is-open' : ''}`}>
        <a href="#features" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Features</a>
        <a href="#keyless-architecture" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Architecture</a>
        <Link to="/docs" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Docs</Link>
        <a href="#community" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Cloud Waitlist</a>
        <a href="https://github.com/rgayan12/trybase" target="_blank" rel="noreferrer" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>GitHub</a>
        {session ? (
          <Link to="/dashboard" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
        ) : (
          <Link to="/auth?mode=login" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
        )}
      </div>

      <main>
        {/* Hero Section */}
        <section className="hero container" style={{ textAlign: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
          <div className="badge badge-pulse" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
            <Sparkles size={14} /> 100% OPEN SOURCE • APACHE 2.0
          </div>

          <h1 className="animate-float text-gradient" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.15, marginBottom: '1.5rem', fontWeight: 800 }}>
            Build & Scale Multi-Tenant AI Agents on <span className="text-accent-gradient">Battle-Tested Hyperscalers.</span>
          </h1>

          <p style={{ maxWidth: '750px', margin: '0 auto 2.5rem', fontSize: '1.2rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            The open-source platform to deploy isolated containerized AI agents, workers, and autonomous workloads on AWS. Dedicated Firecracker microVMs, per-tenant IAM security, and native pgvector memory. Zero Kubernetes required.
          </p>

          <div className="hero-actions" style={{ justifyContent: 'center', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              href="https://github.com/rgayan12/trybase"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.85rem', fontSize: '1.05rem', fontWeight: 600 }}
            >
              <Star size={18} fill="#facc15" color="#facc15" /> Star on GitHub
            </a>

            {session ? (
              <Link to="/dashboard" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.5rem' }}>
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <a
                href="#community"
                onClick={(e) => { e.preventDefault(); document.getElementById('community')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="btn btn-secondary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.5rem' }}
              >
                <Terminal size={18} /> Quickstart Guide
              </a>
            )}
          </div>
        </section>

        {/* Cinematic Flow Demo */}
        <section ref={demoRef} className="visualizer" style={{ padding: '5rem 0', overflow: 'hidden' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
            <div className="section-header" style={{ marginBottom: '3rem' }}>
              <h2>From click to live instance in <span className="text-accent-gradient">under 3 minutes</span></h2>
              <p className="text-secondary">Watch the full provisioning flow — no config, no DevOps.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Step 1 — Deploy Button */}
              <div className={`cinematic-step glass-card ${guiDeployState !== 'idle' ? 'step-done' : 'step-active'}`} ref={step1Ref}>

                <div className="step-badge">01</div>
                <div style={{ flex: 1 }}>
                  <div className="step-label">You click one button</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <div className="mock-input">acme-corp</div>
                    <button
                      className={`btn btn-primary deploy-btn ${guiDeployState !== 'idle' ? 'deployed' : ''}`}
                      onClick={() => {
                        if (guiDeployState === 'idle') {
                          window.amplitude?.track('Demo Started');
                          setGuiDeployState('step1');
                          setTimeout(() => setGuiDeployState('step2'), 2500);
                          setTimeout(() => setGuiDeployState('success'), 5500);
                        } else {
                          setGuiDeployState('idle');
                        }
                      }}
                    >
                      {guiDeployState === 'idle' ? (
                        <><Zap size={16} /> Deploy Now</>
                      ) : (
                        <><Check size={16} /> Deployed!</>
                      )}
                    </button>
                    {guiDeployState === 'idle' && (
                      <span className="text-secondary" style={{ fontSize: '0.85rem' }}>← Click to watch the magic</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Connector */}
              <div className={`flow-connector ${guiDeployState !== 'idle' ? 'flow-active' : ''}`}>
                <div className="flow-line"></div>
                <div className="flow-dot"></div>
              </div>

              {/* Step 2 — Provisioning Terminal */}
              <div className={`cinematic-step glass-card ${guiDeployState === 'idle' ? 'step-waiting' : guiDeployState === 'success' ? 'step-done' : 'step-active'}`} ref={step2Ref}>

                <div className="step-badge">02</div>
                <div style={{ flex: 1 }}>
                  <div className="step-label">Our orchestration engine takes over</div>
                  <div className="mini-terminal" style={{ marginTop: '1rem' }}>
                    <div className="terminal-header">
                      <div className="term-dot r"></div>
                      <div className="term-dot y"></div>
                      <div className="term-dot g"></div>
                      <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>TryBase Orchestrator</span>
                    </div>
                    <div className="terminal-body" style={{ minHeight: '130px' }}>
                      {guiDeployState === 'idle' && (
                        <div className="term-line text-secondary" style={{ opacity: 0.4 }}>Waiting for deployment trigger...</div>
                      )}
                      {guiDeployState !== 'idle' && (
                        <>
                          <div className="term-line term-success animate-fadeIn">▶ Step Function execution started</div>
                          <div className="term-line text-secondary animate-fadeIn" style={{ animationDelay: '0.3s' }}>↳ Launching CodeBuild: terraform apply -target=module.acme-corp</div>
                          <div className="term-line text-secondary animate-fadeIn" style={{ animationDelay: '0.6s' }}>↳ Allocating dedicated Fargate task...</div>
                          {(guiDeployState === 'step2' || guiDeployState === 'success') && (
                            <>
                              <div className="term-line term-success animate-fadeIn" style={{ animationDelay: '0s' }}>✓ ECS service created (eu-west-2)</div>
                              <div className="term-line term-success animate-fadeIn" style={{ animationDelay: '0.2s' }}>✓ PostgreSQL schema 'acme-corp' provisioned</div>
                              <div className="term-line term-success animate-fadeIn" style={{ animationDelay: '0.4s' }}>✓ ALB routing attached</div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector */}
              <div className={`flow-connector ${guiDeployState === 'success' ? 'flow-active' : ''}`}>
                <div className="flow-line"></div>
                <div className="flow-dot"></div>
              </div>

              {/* Step 3 — Live Instance */}
              <div className={`cinematic-step glass-card ${guiDeployState === 'success' ? 'step-live' : 'step-waiting'}`} ref={step3Ref}>

                <div className="step-badge" style={guiDeployState === 'success' ? { background: 'rgba(141,200,145,0.2)', color: '#8DC891' } : {}}>03</div>
                <div style={{ flex: 1 }}>
                  <div className="step-label">Your n8n instance is live</div>
                  {guiDeployState === 'success' ? (
                    <div className="live-instance animate-fadeIn" style={{ marginTop: '1rem' }}>
                      <div className="live-badge">
                        <span className="live-dot"></span> LIVE
                      </div>
                      <div className="live-url">
                        <Code size={14} />
                        <a href="#" style={{ color: '#8DC891', textDecoration: 'none' }}>https://acme-corp.trybase.io</a>
                      </div>
                      <div className="live-info-grid">
                        <div className="live-info-card">
                          <div className="live-info-icon"><Server size={16} /></div>
                          <div>
                            <div className="live-info-title">Dedicated Fargate Task</div>
                            <div className="live-info-desc">Your n8n runs in its own isolated container — no shared CPU, no shared memory with other users. Full resources, all yours.</div>
                            <div className="live-info-benefit">✓ Zero noisy-neighbour effect</div>
                          </div>
                        </div>
                        <div className="live-info-card">
                          <div className="live-info-icon"><Database size={16} /></div>
                          <div>
                            <div className="live-info-title">Isolated Postgres Schema</div>
                            <div className="live-info-desc">Your workflow data lives in its own dedicated schema inside a managed RDS instance. Nobody else can ever touch your data.</div>
                            <div className="live-info-benefit">✓ Complete data isolation</div>
                          </div>
                        </div>
                        <div className="live-info-card">
                          <div className="live-info-icon"><Shield size={16} /></div>
                          <div>
                            <div className="live-info-title">Scoped IAM Role</div>
                            <div className="live-info-desc">Your instance operates under a strictly scoped AWS IAM role. It can only access its own credentials — nothing from other tenants.</div>
                            <div className="live-info-benefit">✓ Least-privilege security</div>
                          </div>
                        </div>
                        <div className="live-info-card">
                          <div className="live-info-icon"><Zap size={16} /></div>
                          <div>
                            <div className="live-info-title">Encrypted Secrets Vault</div>
                            <div className="live-info-desc">All credentials are stored in AWS Secrets Manager with AES-256 encryption. Your API keys and passwords are never stored in plain text.</div>
                            <div className="live-info-benefit">✓ Enterprise-grade encryption</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '1rem', opacity: 0.3, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Your instance will appear here after deployment...
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Reset */}
            {guiDeployState === 'success' && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', opacity: 0.6 }}
                  onClick={() => {
                    demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setTimeout(() => setGuiDeployState('idle'), 600);
                  }}
                >
                  ↺ Replay demo
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features container" style={{ padding: '5rem 0' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.35rem 0.85rem', fontSize: '0.8rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Enterprise Primitives
            </span>
            <h2 style={{ fontSize: '2.5rem', marginTop: '1rem', marginBottom: '0.75rem' }}>Battle-Tested Hyperscaler Architecture</h2>
            <p className="text-secondary" style={{ maxWidth: '650px', margin: '0 auto', fontSize: '1.1rem' }}>
              Built for platform teams, agencies, and developers who need true multi-tenant microVM isolation without the complexity of Kubernetes.
            </p>
          </div>

          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-card feature-card" style={{ padding: '2rem' }}>
              <div className="feature-icon" style={{ color: '#3B82F6', background: 'rgba(59,130,246,0.1)', padding: '0.75rem', borderRadius: '10px', display: 'inline-block', marginBottom: '1.25rem' }}>
                <Shield size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Zero-Trust Per-Tenant IAM</h3>
              <p className="text-secondary" style={{ lineHeight: 1.6 }}>
                Every container gets its own dedicated AWS IAM Task Role. Tenant A physically cannot access Tenant B's data, private S3 documents, or Bedrock quota.
              </p>
            </div>

            <div className="glass-card feature-card" style={{ padding: '2rem' }}>
              <div className="feature-icon" style={{ color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', padding: '0.75rem', borderRadius: '10px', display: 'inline-block', marginBottom: '1.25rem' }}>
                <Bot size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Any Docker Container</h3>
              <p className="text-secondary" style={{ lineHeight: 1.6 }}>
                Container-agnostic runtime. Deploy your custom Python CrewAI agent, AutoGen team, FastAPI microservice, or pre-built stacks like Dify and n8n.
              </p>
            </div>

            <div className="glass-card feature-card" style={{ padding: '2rem' }}>
              <div className="feature-icon" style={{ color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: '10px', display: 'inline-block', marginBottom: '1.25rem' }}>
                <Database size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Native Vector Memory (pgvector)</h3>
              <p className="text-secondary" style={{ lineHeight: 1.6 }}>
                Multi-tenant vector search built directly into Graviton PostgreSQL. Every tenant gets dedicated embeddings collections and RAG storage at $0 extra cost.
              </p>
            </div>

            <div className="glass-card feature-card" style={{ padding: '2rem' }}>
              <div className="feature-icon" style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '0.75rem', borderRadius: '10px', display: 'inline-block', marginBottom: '1.25rem' }}>
                <Cloud size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Amazon Bedrock AI Gateway</h3>
              <p className="text-secondary" style={{ lineHeight: 1.6 }}>
                Keyless IAM model invocation for Claude 3.5 Sonnet, Llama 3, and Titan. Built-in PII redaction and safety guardrails inside your private VPC.
              </p>
            </div>

            <div className="glass-card feature-card" style={{ padding: '2rem' }}>
              <div className="feature-icon" style={{ color: '#EC4899', background: 'rgba(236,72,153,0.1)', padding: '0.75rem', borderRadius: '10px', display: 'inline-block', marginBottom: '1.25rem' }}>
                <Code size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Instant Wildcard Subdomains</h3>
              <p className="text-secondary" style={{ lineHeight: 1.6 }}>
                Every container is automatically wired to an Application Load Balancer rule with wildcard SSL (<span style={{ fontFamily: 'monospace', color: '#8DC891' }}>tenant.yourdomain.com</span>).
              </p>
            </div>

            <div className="glass-card feature-card" style={{ padding: '2rem' }}>
              <div className="feature-icon" style={{ color: '#00C7B7', background: 'rgba(0,199,183,0.1)', padding: '0.75rem', borderRadius: '10px', display: 'inline-block', marginBottom: '1.25rem' }}>
                <Terminal size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Pre-Deploy FinOps (Infracost)</h3>
              <p className="text-secondary" style={{ lineHeight: 1.6 }}>
                Forecast exact cloud infrastructure bills before deploying. Run <code>make cost</code> to preview monthly AWS fleet expenses itemized down to the cent.
              </p>
            </div>
          </div>
        </section>

        {/* Keyless Bedrock Agent & Zero-Trust Architecture Section */}
        <section id="keyless-architecture" style={{ padding: '6rem 0', background: 'linear-gradient(180deg, transparent 0%, rgba(16, 185, 129, 0.03) 50%, transparent 100%)' }}>
          <div className="container">
            <div className="section-header" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.35rem 0.85rem', fontSize: '0.8rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Zero-Trust Architecture
              </span>
              <h2 style={{ fontSize: '2.5rem', marginTop: '1rem', marginBottom: '0.75rem' }}>
                Write AI Agents Without API Keys.
              </h2>
              <p className="text-secondary" style={{ maxWidth: '720px', margin: '0 auto', fontSize: '1.1rem', lineHeight: 1.6 }}>
                Recent industry breaches proved that storing static API keys in environment variables is a major security liability. TryBase replaces static keys with ephemeral AWS STS tokens rotated automatically every 60 minutes.
              </p>
            </div>

            {/* Architecture Comparison: Vulnerable vs TryBase */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3.5rem' }}>
              
              {/* Vulnerable Approach Card */}
              <div className="glass-card" style={{ padding: '2rem', borderLeft: '4px solid #f43f5e', background: 'rgba(244, 63, 94, 0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f43f5e', fontWeight: 600 }}>
                    <AlertTriangle size={20} />
                    <span style={{ fontSize: '1.1rem' }}>The Fragile Way (Status Quo)</span>
                  </div>
                  <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', fontSize: '0.7rem' }}>
                    HIGH RISK
                  </span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                  <li style={{ display: 'flex', gap: '0.65rem' }}>
                    <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>✕</span>
                    <span><strong>Static Credentials</strong>: Permanent <code>OPENAI_API_KEY</code> or <code>AKIA...</code> keys baked into <code>.env</code> files or databases.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '0.65rem' }}>
                    <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>✕</span>
                    <span><strong>Supply Chain Leaks</strong>: Package compromises and credential stealers dump environment variables to external servers.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '0.65rem' }}>
                    <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>✕</span>
                    <span><strong>Shared Blast Radius</strong>: All tenants share root API credentials; a single compromise breaches the entire fleet.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '0.65rem' }}>
                    <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>✕</span>
                    <span><strong>Public Attack Surface</strong>: Containers run with public IPv4 addresses vulnerable to automated internet scanners.</span>
                  </li>
                </ul>
              </div>

              {/* TryBase Hyperscaler Approach Card */}
              <div className="glass-card" style={{ padding: '2rem', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 600 }}>
                    <Shield size={20} />
                    <span style={{ fontSize: '1.1rem' }}>The TryBase Way (Hyperscaler STS)</span>
                  </div>
                  <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.7rem' }}>
                    BATTLE-TESTED
                  </span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                  <li style={{ display: 'flex', gap: '0.65rem' }}>
                    <span style={{ color: '#34d399', fontWeight: 'bold' }}>✓</span>
                    <span><strong>Zero Secret Footprint</strong>: Zero API keys in container definitions, <code>.env</code> files, or databases.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '0.65rem' }}>
                    <span style={{ color: '#34d399', fontWeight: 'bold' }}>✓</span>
                    <span><strong>Ephemeral STS Tokens</strong>: Injected via link-local metadata (<code>169.254.170.2</code>) and silently rotated every 60 minutes.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '0.65rem' }}>
                    <span style={{ color: '#34d399', fontWeight: 'bold' }}>✓</span>
                    <span><strong>Per-Tenant IAM Isolation</strong>: Every agent gets a dedicated Task Role; Tenant A physically cannot call Tenant B's models.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '0.65rem' }}>
                    <span style={{ color: '#34d399', fontWeight: 'bold' }}>✓</span>
                    <span><strong>100% Private VPC</strong>: 0 Public IPs. Containers run in private AWS subnets behind an Application Load Balancer.</span>
                  </li>
                </ul>
              </div>

            </div>

            {/* Interactive Code Container Recipes */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              
              {/* Tab Header Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {Object.entries(CODE_SNIPPETS).map(([key, item]) => (
                    <button
                      key={key}
                      onClick={() => setCodeTab(key)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: codeTab === key ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                        color: codeTab === key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        fontWeight: codeTab === key ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {item.lang}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
                    {CODE_SNIPPETS[codeTab].filename}
                  </span>
                  <button
                    onClick={() => handleCopySnippet(CODE_SNIPPETS[codeTab].code)}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {copiedSnippet ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    {copiedSnippet ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>

              {/* Code Display Area */}
              <div style={{
                padding: '1.75rem',
                background: '#070a14',
                overflowX: 'auto',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.88rem',
                lineHeight: 1.7,
                color: '#e2e8f0'
              }}>
                <pre style={{ margin: 0 }}>
                  <code>{CODE_SNIPPETS[codeTab].code}</code>
                </pre>
              </div>

              {/* Sub-bar explaining the magic */}
              <div style={{
                padding: '1.25rem 1.75rem',
                background: 'rgba(16, 185, 129, 0.05)',
                borderTop: '1px solid rgba(16, 185, 129, 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Sparkles size={18} color="#34d399" />
                  <span style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>
                    <strong>How it works:</strong> The AWS SDK queries the link-local metadata agent (<code>169.254.170.2</code>). STS returns short-lived credentials that auto-rotate silently.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.75rem' }}>
                    Zero Hardcoded Secrets
                  </span>
                  <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', fontSize: '0.75rem' }}>
                    Bedrock Guardrails Ready
                  </span>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* Community & Waitlist Section */}
        <section id="community" className="pricing" style={{ padding: '6rem 0' }}>
          <div className="container">
            <div className="section-header" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.35rem 0.85rem', fontSize: '0.8rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Open Source & Cloud
              </span>
              <h2 style={{ fontSize: '2.5rem', marginTop: '1rem', marginBottom: '0.75rem' }}>Deploy on your AWS. Or let us manage it.</h2>
              <p className="text-secondary" style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
                TryBase is 100% Apache 2.0 open source. Self-host on your own cloud today, or join the early access waitlist for our managed control plane.
              </p>
            </div>

            <div className="pricing-grid" style={{ maxWidth: '950px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              
              {/* Community Open Source Tier */}
              <div className="glass-card pricing-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
                <div className="pricing-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.4rem' }}>Community Edition</h3>
                    <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      Free Forever
                    </span>
                  </div>
                  <div className="price" style={{ margin: '1rem 0', fontSize: '2.5rem', fontWeight: 800 }}>$0<span> / self-hosted</span></div>
                  <p className="text-secondary" style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>
                    Deploy and scale directly into your own AWS account with full data sovereignty and zero vendor lock-in.
                  </p>
                </div>

                <ul className="pricing-features" style={{ margin: '2rem 0', flexGrow: 1, listStyle: 'none', padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Check size={18} className="icon-check" /> <span><strong>Any Docker Container</strong> (Python, CrewAI, Dify, n8n)</span></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Check size={18} className="icon-check" /> <span><strong>Dedicated MicroVM Compute</strong> on AWS Fargate</span></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Check size={18} className="icon-check" /> <span><strong>Per-Tenant IAM Roles</strong> (Zero credential cross-talk)</span></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Check size={18} className="icon-check" /> <span><strong>Native pgvector Memory</strong> on Graviton RDS</span></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Check size={18} className="icon-check" /> <span><strong>Dynamic Subdomain Routing</strong> with Wildcard SSL</span></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Check size={18} className="icon-check" /> <span><strong>Infracost FinOps</strong> CLI integration (<code>make cost</code>)</span></li>
                </ul>

                <a
                  href="https://github.com/rgayan12/trybase"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem' }}
                >
                  <Star size={16} fill="#facc15" color="#facc15" /> Clone & Star on GitHub
                </a>
              </div>

              {/* Managed Cloud Waitlist Tier */}
              <div className="glass-card pricing-card featured" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div className="popular-badge" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', position: 'absolute', top: '-12px', right: '20px', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                  Coming Soon
                </div>
                <div className="pricing-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.4rem' }}>TryBase Cloud</h3>
                    <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                      Managed Platform
                    </span>
                  </div>
                  <div className="price" style={{ margin: '1rem 0', fontSize: '2.5rem', fontWeight: 800 }}>Early Access<span> / waitlist</span></div>
                  <p className="text-secondary" style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>
                    Zero-DevOps managed fleet orchestration. We run the control plane; you focus on building agents.
                  </p>
                </div>

                <ul className="pricing-features" style={{ margin: '2rem 0', flexGrow: 1, listStyle: 'none', padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Check size={18} className="icon-check" /> <span><strong>Scale-to-Zero Auto-Idling</strong> (Save 80% on compute)</span></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Check size={18} className="icon-check" /> <span><strong>Centralized Bedrock Gateway</strong> with PII Guardrails</span></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Check size={18} className="icon-check" /> <span><strong>Multi-Tenant Token Metering</strong> & cost attribution</span></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Check size={18} className="icon-check" /> <span><strong>Multi-Cloud Support</strong> (AWS, GCP Cloud Run, Azure)</span></li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Check size={18} className="icon-check" /> <span><strong>Automated Nightly Backups</strong> & SSL lifecycle</span></li>
                </ul>

                {waitlistStatus === 'success' ? (
                  <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#34d399', textAlign: 'center', fontSize: '0.95rem', fontWeight: 500 }}>
                    🎉 You're on the early access list! We'll reach out soon.
                  </div>
                ) : (
                  <form onSubmit={handleJoinWaitlist} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input
                      type="email"
                      required
                      placeholder="Enter your work email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'white',
                        fontSize: '0.95rem'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={waitlistStatus === 'loading'}
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
                    >
                      {waitlistStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : 'Join Early Access Waitlist'}
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <div className="brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1rem', fontSize: '1.25rem' }}>
            <img src="/favicon.svg" alt="TryBase Icon" style={{ height: '24px', filter: 'brightness(0) invert(1)' }} />
            TryBase
          </div>
          <p>The Open-Source AI Agent Infrastructure Layer for Battle-Tested Hyperscalers.</p>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Link to="/docs" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Documentation</Link>
            <a href="https://github.com/rgayan12/trybase" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>GitHub Repository</a>
            <a href="mailto:bastiyan@blymo.co.uk" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact Us</a>
          </div>
          <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.2)' }}>
            &copy; 2026 TryBase. Apache 2.0 Open Source.
          </p>
        </div>
      </footer>
    </>
  );
}
