import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { redirectToCheckout } from '../lib/billing';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode');
  const [isLogin, setIsLogin] = useState(initialMode !== 'signup');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const redirectPath = searchParams.get('redirect');

    try {
      if (isLogin) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw loginError;
        
        // Track Amplitude Event
        window.amplitude?.track('Sign In');
        
        // Handle post-login redirection
        if (redirectPath) {
          if (redirectPath.startsWith('stripe_')) {
            const planId = redirectPath.replace('stripe_', '');
            await redirectToCheckout(planId);
          } else {
            navigate(redirectPath);
          }
        } else {
          navigate('/dashboard');
        }
      } else {
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin,
              data: {
                full_name: fullName,
              }
            },
          });
        if (signUpError) throw signUpError;

        // Track Amplitude Event
        window.amplitude?.track('Sign Up', {
          full_name: fullName,
          email: email
        });
        
        // Since email confirmation is disabled, we redirect immediately
        if (redirectPath) {
          if (redirectPath.startsWith('stripe_')) {
            const planId = redirectPath.replace('stripe_', '');
            await redirectToCheckout(planId);
          } else {
            navigate(redirectPath);
          }
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Link to="/" className="btn btn-secondary" style={{ marginBottom: '2rem', border: 'none', background: 'transparent' }}>
        <ArrowLeft size={18} /> Back to Home
      </Link>
      
      <div className="glass-card">
        <h2 style={{ marginBottom: '0.5rem' }}>{isLogin ? 'Welcome Back' : 'Get Started'}</h2>
        <p className="text-secondary" style={{ marginBottom: '2rem' }}>
          {isLogin ? 'Log in to manage your workspaces' : 'Create your account to start your 7-day trial'}
        </p>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '8px', color: '#f43f5e', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth}>
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="John Doe" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
          <span className="text-secondary">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </span>
          <button 
            onClick={() => setIsLogin(!isLogin)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--accent-blue)', 
              marginLeft: '0.5rem', 
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
