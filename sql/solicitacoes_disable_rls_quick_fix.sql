-- CORRECAO RAPIDA (teste): remove bloqueio RLS da tabela solicitacoes
-- Use no SQL Editor do Supabase e execute.
-- Depois recarregue a pagina.

alter table if exists public.solicitacoes disable row level security;
grant usage on schema public to anon, authenticated;
grant select, insert on table public.solicitacoes to anon, authenticated;
