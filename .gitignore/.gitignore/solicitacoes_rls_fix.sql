-- Execute este script no Supabase SQL Editor do projeto
-- Projeto: stlbrmnmnbxlyjebgdin

-- 1) Garante RLS ativo na tabela
alter table if exists public.solicitacoes enable row level security;

-- 2) Garante privilegios basicos para roles do client-side
grant usage on schema public to anon, authenticated;
grant select, insert on table public.solicitacoes to anon, authenticated;

-- 3) Politica de leitura (SELECT)
drop policy if exists "solicitacoes_select_public" on public.solicitacoes;
create policy "solicitacoes_select_public"
on public.solicitacoes
for select
to anon, authenticated
using (true);

-- 4) Politica de insercao (INSERT)
drop policy if exists "solicitacoes_insert_public" on public.solicitacoes;
create policy "solicitacoes_insert_public"
on public.solicitacoes
for insert
to anon, authenticated
with check (true);
