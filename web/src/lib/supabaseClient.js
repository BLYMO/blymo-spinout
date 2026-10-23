import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const mockAuth = {
  getUser: () => Promise.resolve({ data: { user: null }, error: null }),
  getSession: () => Promise.resolve({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signInWithPassword: () => Promise.reject(new Error("Supabase credentials not configured")),
  signUp: () => Promise.reject(new Error("Supabase credentials not configured")),
  signOut: () => Promise.resolve({ error: null }),
  updateUser: () => Promise.resolve({ data: { user: null }, error: null })
};

const mockQueryBuilder = {
  select: () => mockQueryBuilder,
  eq: () => Promise.resolve({ data: [], error: null, count: 0 }),
  order: () => Promise.resolve({ data: [], error: null }),
  update: () => mockQueryBuilder,
  insert: () => Promise.resolve({ data: [], error: null }),
  delete: () => Promise.resolve({ data: [], error: null }),
  single: () => Promise.resolve({ data: null, error: null }),
  then: (resolve) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve)
};

const mockChannel = {
  on: () => mockChannel,
  subscribe: () => mockChannel
};

// We only initialize if the keys are present to avoid the "supabaseUrl is required" crash during development
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : { 
      auth: mockAuth,
      from: () => mockQueryBuilder,
      channel: () => mockChannel,
      removeChannel: () => {},
      functions: {
        invoke: () => Promise.resolve({ data: null, error: null })
      }
    };

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file to enable authentication.');
}
