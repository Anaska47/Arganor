create extension if not exists pgcrypto;

create or replace function public.arganor_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.content_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'post',
  status text not null default 'draft',
  priority integer not null default 0,
  title text,
  topic text,
  intent text,
  product_ref text,
  post_ref text,
  cluster_ref text,
  payload jsonb not null default '{}'::jsonb,
  decision_reason text,
  scheduled_for timestamptz,
  locked_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.content_queue is 'Growth Machine queue additive a l existant. product_ref/post_ref/cluster_ref restent des references texte.';
comment on column public.content_queue.product_ref is 'Reference produit canonique sous forme de slug texte.';
comment on column public.content_queue.post_ref is 'Reference article canonique sous forme de slug texte.';
comment on column public.content_queue.cluster_ref is 'Reference cluster canonique sous forme de nom texte.';

create index if not exists content_queue_status_idx on public.content_queue (status, scheduled_for desc nulls last);
create index if not exists content_queue_cluster_ref_idx on public.content_queue (cluster_ref);
create index if not exists content_queue_product_ref_idx on public.content_queue (product_ref);
create index if not exists content_queue_post_ref_idx on public.content_queue (post_ref);
create index if not exists content_queue_payload_gin_idx on public.content_queue using gin (payload);

create table if not exists public.autopilot_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_source text not null default 'manual',
  status text not null default 'queued',
  workflow_ref text,
  run_label text,
  commit_sha text,
  product_ref text,
  post_ref text,
  cluster_ref text,
  started_at timestamptz,
  completed_at timestamptz,
  stats jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.autopilot_runs is 'Journal des runs de generation et validation de l autopilot.';

create index if not exists autopilot_runs_status_idx on public.autopilot_runs (status, created_at desc);
create index if not exists autopilot_runs_trigger_source_idx on public.autopilot_runs (trigger_source, created_at desc);
create index if not exists autopilot_runs_cluster_ref_idx on public.autopilot_runs (cluster_ref);
create index if not exists autopilot_runs_metadata_gin_idx on public.autopilot_runs using gin (metadata);

create table if not exists public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  memory_key text not null unique,
  memory_type text not null default 'note',
  scope_ref text,
  product_ref text,
  post_ref text,
  cluster_ref text,
  value jsonb not null default '{}'::jsonb,
  summary text,
  confidence double precision,
  source text,
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint agent_memory_memory_key_namespaced_chk check (
    memory_key ~ '^(product|post|cluster|hook):.+'
  )
);

comment on table public.agent_memory is 'Memoire persistante de l agent. memory_key doit etre namespacée: product:..., post:..., cluster:..., hook:...';

create index if not exists agent_memory_memory_type_idx on public.agent_memory (memory_type, updated_at desc);
create index if not exists agent_memory_cluster_ref_idx on public.agent_memory (cluster_ref);
create index if not exists agent_memory_product_ref_idx on public.agent_memory (product_ref);
create index if not exists agent_memory_post_ref_idx on public.agent_memory (post_ref);
create index if not exists agent_memory_value_gin_idx on public.agent_memory using gin (value);

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  prompt_key text not null,
  version text not null,
  status text not null default 'draft',
  prompt_body text not null,
  notes text,
  variables jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint prompt_versions_unique_key_version unique (module, prompt_key, version)
);

comment on table public.prompt_versions is 'Registre versionne des prompts utilises par la Growth Machine.';

create index if not exists prompt_versions_module_idx on public.prompt_versions (module, prompt_key, created_at desc);
create index if not exists prompt_versions_status_idx on public.prompt_versions (status, created_at desc);

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null unique,
  name text not null,
  hypothesis text,
  status text not null default 'draft',
  product_ref text,
  post_ref text,
  cluster_ref text,
  success_metric text,
  variants jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.experiments is 'Journal d experimentation additive pour hooks, clusters, prompts et distribution.';

create index if not exists experiments_status_idx on public.experiments (status, created_at desc);
create index if not exists experiments_cluster_ref_idx on public.experiments (cluster_ref);
create index if not exists experiments_variants_gin_idx on public.experiments using gin (variants);
create index if not exists experiments_results_gin_idx on public.experiments using gin (results);

alter table public.content_queue enable row level security;
alter table public.autopilot_runs enable row level security;
alter table public.agent_memory enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.experiments enable row level security;

drop trigger if exists content_queue_set_updated_at on public.content_queue;
create trigger content_queue_set_updated_at
before update on public.content_queue
for each row
execute function public.arganor_set_updated_at();

drop trigger if exists autopilot_runs_set_updated_at on public.autopilot_runs;
create trigger autopilot_runs_set_updated_at
before update on public.autopilot_runs
for each row
execute function public.arganor_set_updated_at();

drop trigger if exists agent_memory_set_updated_at on public.agent_memory;
create trigger agent_memory_set_updated_at
before update on public.agent_memory
for each row
execute function public.arganor_set_updated_at();

drop trigger if exists prompt_versions_set_updated_at on public.prompt_versions;
create trigger prompt_versions_set_updated_at
before update on public.prompt_versions
for each row
execute function public.arganor_set_updated_at();

drop trigger if exists experiments_set_updated_at on public.experiments;
create trigger experiments_set_updated_at
before update on public.experiments
for each row
execute function public.arganor_set_updated_at();
