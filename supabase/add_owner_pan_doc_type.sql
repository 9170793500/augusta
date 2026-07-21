-- Add owner_pan to document_type enum (run once in Supabase SQL Editor)
alter type public.document_type add value if not exists 'owner_pan';
