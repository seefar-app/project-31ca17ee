import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = 'https://gbufmahyxmvfovsfajpq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidWZtYWh5eG12Zm92c2ZhanBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzA1NDcsImV4cCI6MjEwMjcwNjU0N30.lOBMiZ8W__ZAT_xKJ5NBY84lF1Xed1sApiVTXIYszvA';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
