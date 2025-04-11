-- Create turns table if it doesn't exist
create table if not exists turns (
    id uuid primary key default uuid_generate_v4(),
    game_id uuid not null references games(id),
    player_id uuid not null references players(id),
    turn_number integer not null,
    duration integer not null,  -- in milliseconds
    timestamp timestamptz not null default now(),
    created_at timestamptz not null default now(),
    
    constraint turns_game_player_turn_idx unique(game_id, player_id, turn_number)
);

-- Create VP changes table if it doesn't exist
create table if not exists vp_changes (
    id uuid primary key default uuid_generate_v4(),
    turn_id uuid not null references turns(id),
    game_id uuid not null references games(id),
    player_id uuid not null references players(id),
    vp_amount integer not null,
    timestamp timestamptz not null default now(),
    created_at timestamptz not null default now(),
    
    constraint vp_changes_turn_idx unique(turn_id, player_id)
);

-- Create game stats table if it doesn't exist
create table if not exists game_stats (
    id uuid primary key default uuid_generate_v4(),
    game_id uuid not null references games(id) unique,
    current_turn_number integer not null default 1,
    current_player_id uuid references players(id),
    turn_elapsed_time integer not null default 0,
    game_elapsed_time integer not null default 0,
    total_elapsed_time integer not null default 0,
    last_updated timestamptz not null default now(),
    created_at timestamptz not null default now(),
    
    constraint game_stats_game_idx unique(game_id)
);

-- Drop any existing policies
do $$ 
begin
    -- Drop policies for turns table if it exists
    if exists (select 1 from pg_tables where tablename = 'turns') then
        drop policy if exists "Users can view turns in their games" on turns;
        drop policy if exists "Users can insert turns in their games" on turns;
    end if;

    -- Drop policies for vp_changes table if it exists
    if exists (select 1 from pg_tables where tablename = 'vp_changes') then
        drop policy if exists "Users can view VP changes in their games" on vp_changes;
        drop policy if exists "Users can insert VP changes in their games" on vp_changes;
    end if;

    -- Drop policies for game_stats table if it exists
    if exists (select 1 from pg_tables where tablename = 'game_stats') then
        drop policy if exists "Users can view game stats for their games" on game_stats;
        drop policy if exists "Users can insert game stats for their games" on game_stats;
        drop policy if exists "Users can update game stats for their games" on game_stats;
    end if;
end $$;

-- Add RLS policies
do $$
begin
    -- Enable RLS and add policies for turns
    if exists (select 1 from pg_tables where tablename = 'turns') then
        alter table turns enable row level security;
        create policy "Users can view turns in their games" on turns
            for select using (
                exists (
                    select 1 from games
                    where games.id = turns.game_id
                    and games.user_id = auth.uid()
                )
            );
        create policy "Users can insert turns in their games" on turns
            for insert with check (
                exists (
                    select 1 from games
                    where games.id = turns.game_id
                    and games.user_id = auth.uid()
                )
            );
    end if;

    -- Enable RLS and add policies for vp_changes
    if exists (select 1 from pg_tables where tablename = 'vp_changes') then
        alter table vp_changes enable row level security;
        create policy "Users can view VP changes in their games" on vp_changes
            for select using (
                exists (
                    select 1 from games
                    where games.id = vp_changes.game_id
                    and games.user_id = auth.uid()
                )
            );
        create policy "Users can insert VP changes in their games" on vp_changes
            for insert with check (
                exists (
                    select 1 from games
                    where games.id = vp_changes.game_id
                    and games.user_id = auth.uid()
                )
            );
    end if;

    -- Enable RLS and add policies for game_stats
    if exists (select 1 from pg_tables where tablename = 'game_stats') then
        alter table game_stats enable row level security;
        create policy "Users can view game stats for their games" on game_stats
            for select using (
                exists (
                    select 1 from games
                    where games.id = game_stats.game_id
                    and games.user_id = auth.uid()
                )
            );
        create policy "Users can insert game stats for their games" on game_stats
            for insert with check (
                exists (
                    select 1 from games
                    where games.id = game_stats.game_id
                    and games.user_id = auth.uid()
                )
            );
        create policy "Users can update game stats for their games" on game_stats
            for update using (
                exists (
                    select 1 from games
                    where games.id = game_stats.game_id
                    and games.user_id = auth.uid()
                )
            );
    end if;
end $$;
