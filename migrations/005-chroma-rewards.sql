create table player_chroma_wallet (
  user_id text primary key references "user" ("id") on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table chroma_reward_claim (
  user_id text not null references "user" ("id") on delete cascade,
  reward_key text not null,
  attempt_id text unique references leaderboard_attempt (id) on delete set null,
  source_kind text not null check (source_kind in ('preset', 'daily', 'endless')),
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, reward_key)
);

create index chroma_reward_claim_user_created_idx
  on chroma_reward_claim (user_id, created_at);
