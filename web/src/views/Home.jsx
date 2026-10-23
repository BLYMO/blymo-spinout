import React, { useState, useEffect, useRef } from 'react';
import { Server, Shield, Zap, Terminal, Code, Database, ArrowRight, Check, Timer, Loader2, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../index.css';
import CountdownTimer from '../components/CountdownTimer';
import { supabase } from '../lib/supabaseClient';
import { redirectToCheckout } from '../lib/billing';

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
            {session ? (
              <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
            ) : (
              <>
                <Link to="/auth?mode=login" className="btn btn-secondary" style={{ marginRight: '0.5rem', border: 'none', background: 'transparent' }}>Login</Link>
                <a href="#pricing" onClick={(e) => { e.preventDefault(); document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' }); }} className="btn btn-primary" style={{ textDecoration: 'none' }}>Start Provisioning</a>
              </>
            )}
          </div>

          <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      <div className={`mobile-menu-overlay ${isMenuOpen ? 'is-open' : ''}`}>
        <a href="#features" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Features</a>
        <a href="#pricing" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Pricing</a>
        {session ? (
          <Link to="/dashboard" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
        ) : (
          <>
            <Link to="/auth?mode=login" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Login</Link>
            <Link to="/auth?mode=signup" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Join TryBase</Link>
          </>
        )}
      </div>

      <main>
        {/* Hero Section */}
        <section className="hero container">
          <h1 className="animate-float text-gradient">
            Fully Isolated, Serverless <span className="text-accent-gradient">n8n Workspaces.</span>
          </h1>
          <p>
            Stop wrestling with complex infrastructure. TryBase provisions dedicated, production-grade n8n instances on AWS in minutes. Zero noisy neighbors. Total data isolation.
          </p>



          <CountdownTimer targetDate={new Date(Date.now() + 86400000 * 2).toISOString()} />

          <div className="hero-actions">
            {session ? (
              <Link to="/dashboard" className="btn btn-primary">
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <a href="#pricing" onClick={(e) => { e.preventDefault(); document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' }); }} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Start Your 7-Day Free Trial <ArrowRight size={18} />
              </a>
            )}
            <button className="btn btn-secondary" style={{ position: 'relative' }}>
              <Terminal size={18} /> API Reference
              <span style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                background: 'var(--accent-purple)',
                fontSize: '0.65rem',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '700',
                letterSpacing: '0.05em'
              }}>SOON</span>
            </button>
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
        <section id="features" className="features container">
          <div className="section-header">
            <h2>Everything you need, nothing you don't</h2>
            <p className="text-secondary">Built for teams who want to move fast without building the infrastructure themselves.</p>
          </div>

          <div className="features-grid">
            <div className="glass-card feature-card">
              <div className="feature-icon" style={{ color: '#3B82F6', background: 'rgba(59,130,246,0.1)' }}>
                <Zap size={24} />
              </div>
              <h3>Live in Under 3 Minutes</h3>
              <p>From clicking "Deploy Now" to a fully running n8n instance — no waiting around. Our Step Function orchestration is built for speed.</p>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon" style={{ color: '#8B5CF6', background: 'rgba(139,92,246,0.1)' }}>
                <Shield size={24} />
              </div>
              <h3>GDPR Friendly</h3>
              <p>Built with data privacy at its core. Each workspace is fully isolated — your data stays yours. Ideal for teams who take compliance seriously.</p>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon" style={{ color: '#10B981', background: 'rgba(16,185,129,0.1)' }}>
                <Server size={24} />
              </div>
              <h3>Zero Cold Starts</h3>
              <p>Your n8n container runs persistently on Fargate — always warm, always ready. No serverless spin-up delays when your workflows trigger.</p>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon" style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)' }}>
                <Database size={24} />
              </div>
              <h3>Automated Daily Backups</h3>
              <p>Your workflow data is automatically backed up every day with point-in-time recovery on Pro and Business plans. Sleep easy.</p>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon" style={{ color: '#EC4899', background: 'rgba(236,72,153,0.1)' }}>
                <Code size={24} />
              </div>
              <h3>Your Own Subdomain</h3>
              <p>Every workspace gets a unique, memorable URL like <span style={{ fontFamily: 'monospace', color: '#8DC891' }}>fast-fox-jumps.trybase.io</span>. Ready to share the moment it's live.</p>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon" style={{ color: '#FF6D5A', background: 'rgba(255,109,90,0.1)' }}>
                <Terminal size={24} />
              </div>
              <h3>Zero DevOps Required</h3>
              <p>No servers to patch. No Docker files to maintain. No Kubernetes to debug at 2am. We handle the infrastructure so you focus on building workflows.</p>
            </div>
          </div>
        </section>
        {/* Pricing Section */}
        <section id="pricing" className="pricing">
          <div className="container">
            <div className="section-header">
              <h2>Simple, predictable pricing</h2>
              <p className="text-secondary">Enterprise-grade infrastructure shouldn't require an enterprise contract.</p>
            </div>

            <div className="pricing-grid">
              {/* Starter Tier */}
              <div className="glass-card pricing-card">
                <div className="pricing-header">
                  <h3>Starter</h3>
                  <div className="price">$19<span>/mo</span></div>
                  <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Perfect for small automations.</p>
                  <div className="badge badge-pulse" style={{ marginTop: '1rem' }}>7 Days Free</div>
                </div>
                <ul className="pricing-features">
                  <li><Check size={18} className="icon-check" /> Dedicated Fargate Container</li>
                  <li><Check size={18} className="icon-check" /> 15 Active Workflows</li>
                  <li><Check size={18} className="icon-check" /> Memorable Subdomain (e.g. fast-fox.trybase.io)</li>
                  <li><Check size={18} className="icon-check" /> Community Support</li>
                  <li><Check size={18} className="icon-check" /> Standard n8n Executions</li>
                </ul>
                <button
                  onClick={() => {
                    window.amplitude?.track('Plan Selected', { plan: 'starter' });
                    redirectToCheckout('starter');
                  }}
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Start Free Trial
                </button>
              </div>

              {/* Pro Tier (Featured) */}
              <div className="glass-card pricing-card featured" style={{ position: 'relative' }}>
                <div className="popular-badge">Best Value</div>
                <div className="pricing-header">
                  <h3>Pro</h3>
                  <div className="price">$79<span>/mo</span></div>
                  <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Built for scaling production operations.</p>
                  <div className="badge badge-pulse" style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}>7 Days Free</div>
                </div>
                <ul className="pricing-features">
                  <li><Check size={18} className="icon-check" /> Upgraded Dedicated Resources</li>
                  <li><Check size={18} className="icon-check" /> Uncapped Workflows</li>
                  <li><Check size={18} className="icon-check" /> Automated Daily Backups</li>
                  <li><Check size={18} className="icon-check" /> Memorable Subdomain</li>
                  <li><Check size={18} className="icon-check" /> Priority Email Support</li>
                </ul>
                <button
                  onClick={() => {
                    window.amplitude?.track('Plan Selected', { plan: 'pro' });
                    redirectToCheckout('pro');
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Start 7-Day Trial
                </button>
              </div>

              {/* Enterprise Tier */}
              <div className="glass-card pricing-card">
                <div className="pricing-header">
                  <h3>Business</h3>
                  <div className="price">$149+<span>/mo</span></div>
                  <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Multi-tenant power and compliance.</p>
                </div>
                <ul className="pricing-features">
                  <li><Check size={18} className="icon-check" /> Maximum Fargate Allocation</li>
                  <li><Check size={18} className="icon-check" /> Dedicated Single-Tenant RDS</li>
                  <li><Check size={18} className="icon-check" /> Custom Domain (bring your own)</li>
                  <li><Check size={18} className="icon-check" /> Point-in-time Recovery Backups</li>
                  <li><Check size={18} className="icon-check" /> Custom Docker Image Support</li>
                  <li><Check size={18} className="icon-check" /> 24/7 SLA Supported</li>
                </ul>
                <a href="mailto:bastiyan@blymo.co.uk" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>Talk to Us</a>
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
          <p>Enterprise Grade n8n Instances in Minutes.</p>
          <div style={{ marginTop: '1rem' }}>
            <a href="mailto:bastiyan@blymo.co.uk" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact Us</a>
          </div>
          <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.2)' }}>
            &copy; 2026 TryBase. Not affiliated with n8n.
          </p>
        </div>
      </footer>
    </>
  );
}
