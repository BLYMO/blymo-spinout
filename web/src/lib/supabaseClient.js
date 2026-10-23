import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// We only initialize if the keys are present to avoid the "supabaseUrl is required" crash during development
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : { 
      auth: { 
        getUser: () => Promise.resolve({ data: { user: null } }),
        signInWithPassword: () => Promise.reject(new Error("Supabase URL not configured")),
        signUp: () => Promise.reject(new Error("Supabase URL not configured")),
        signOut: () => Promise.resolve()
      } 
    };

if (!supabaseUrl) {
  console.warn('⚠️ Supabase URL is missing. Add VITE_SUPABASE_URL to your .env.local file to enable authentication.');
}
