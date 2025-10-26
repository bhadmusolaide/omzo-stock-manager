import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
if (!supabaseAnonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');

// Debug logging for server-side
if (typeof window === 'undefined') {
  console.log('Server-side Supabase config:', {
    url: supabaseUrl ? 'Set' : 'Missing',
    anonKey: supabaseAnonKey ? 'Set' : 'Missing',
    serviceRoleKey: supabaseServiceRoleKey ? 'Set' : 'Missing',
  });
}

export const createSupabaseClient = () =>
  createClient(supabaseUrl, supabaseAnonKey);

export const createClientServiceRole = () => {
  // Only require service role key on server-side
  if (typeof window === 'undefined' && !supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side operations');
  }
  
  // Use service role key if available, otherwise fall back to anon key
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  if (!key) {
    throw new Error('No valid Supabase key available');
  }
  
  const client = createClient(supabaseUrl, key);
  return client;
};

// For server-side operations, we need the service role key
let supabaseServer;
if (typeof window === 'undefined') {
  if (supabaseServiceRoleKey) {
    supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey);
  } else {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set - some server-side operations may not work correctly');
    // Fallback to anon key for server-side operations
    supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
  }
} else {
  // Client-side doesn't use service role key
  supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabaseServer };
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);