-- 0002_truth_objects.sql (schema_v2)
-- Unified “truth objects” + link graph.

begin;

do $$
begin
  create type public.truth_object_type as enum ('note', 'belief', 'prediction', 'framework', 'data');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.truth_object_link_relation as enum (
    'supports',
    'contradicts',
    'derived_from',
    'uses',
    'related'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.truth_objects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.truth_object_type not null,
  -- Per-user unique handle for @ referencing (lowercase slug).
  handle text not null,
  title text not null default '',
  body text not null default '',
  -- Optional confidence in [0, 1]; commonly used for beliefs.
  confidence numeric(5,4) null,
  source_url text null,
  -- Type-specific minimal structure; avoid hardcoding optional fields.
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint truth_objects_handle_format check (handle ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  constraint truth_objects_handle_unique unique (user_id, handle),
  constraint truth_objects_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create index if not exists truth_objects_user_id_type_updated_at_idx
  on public.truth_objects (user_id, type, updated_at desc);

create index if not exists truth_objects_user_id_handle_idx
  on public.truth_objects (user_id, handle);

drop trigger if exists truth_objects_set_updated_at on public.truth_objects;
create trigger truth_objects_set_updated_at
before update on public.truth_objects
for each row execute function public.set_updated_at();

create table if not exists public.truth_object_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  from_object_id uuid not null references public.truth_objects(id) on delete cascade,
  to_object_id uuid not null references public.truth_objects(id) on delete cascade,
  relation public.truth_object_link_relation not null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint truth_object_links_no_self check (from_object_id <> to_object_id),
  constraint truth_object_links_unique unique (from_object_id, to_object_id, relation)
);

create index if not exists truth_object_links_user_id_from_idx
  on public.truth_object_links (user_id, from_object_id);

create index if not exists truth_object_links_user_id_to_idx
  on public.truth_object_links (user_id, to_object_id);

drop trigger if exists truth_object_links_set_updated_at on public.truth_object_links;
create trigger truth_object_links_set_updated_at
before update on public.truth_object_links
for each row execute function public.set_updated_at();

commit;
