-- Created with Supabase CLI; ordered after the eight existing immutable migrations.
-- Enum addition commits separately before the provider label is used.
alter type public.ai_provider add value if not exists 'deepseek';
