import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required!');
}

const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export const auth = {
  login: async (credentials: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: credentials.email, password: credentials.password });
    return { user: data.user, session: data.session, error };
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  getUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
};