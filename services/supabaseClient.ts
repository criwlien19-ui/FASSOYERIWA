import { createClient } from '@supabase/supabase-js';

// Configuration Supabase active
const SUPABASE_URL = 'https://ewmeqdbyzysticwinjqy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3bWVxZGJ5enlzdGljd2luanF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NDA3MzMsImV4cCI6MjA3OTUxNjczM30.0GWeIaZmd_j30HdDzHl7haHvaeVuci7OummKQhhnBvI';

// Vérification de la configuration
export const isSupabaseConfigured = 
  SUPABASE_URL && 
  !SUPABASE_URL.includes('votre-projet') && 
  !SUPABASE_URL.includes('your-project');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);