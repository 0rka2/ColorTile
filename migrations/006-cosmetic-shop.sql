create table player_cosmetic_ownership (
  user_id text not null references "user" ("id") on delete cascade,
  item_id text not null,
  purchase_price integer not null check (purchase_price >= 0),
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table player_cosmetic_loadout (
  user_id text not null references "user" ("id") on delete cascade,
  slot text not null,
  item_id text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

create index player_cosmetic_ownership_user_purchased_idx
  on player_cosmetic_ownership (user_id, purchased_at);
