create table if not exists public.page_views (
  page text primary key,
  views bigint not null default 0 check (views >= 0)
);

insert into public.page_views (page, views)
values ('home', 0) on conflict (page) do nothing;

alter table public.page_views enable row level security;
revoke all on public.page_views from anon, authenticated;
grant select, update on public.page_views to service_role;

create or replace function public.increment_page_views()
returns bigint
language sql
security invoker
set search_path = ''
as $$
  update public.page_views set views = views + 1
  where page = 'home' returning views;
$$;

revoke all on function public.increment_page_views() from public, anon, authenticated;
grant execute on function public.increment_page_views() to service_role;
