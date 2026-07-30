# ColorTile (colortile.vercel.app)

ColorTile is a gradient puzzle game where players swap colored tiles until the board blends smoothly between four fixed corner colors.

Preset puzzles use a stopwatch, so the goal is to solve each board quickly and with as few moves as possible. Endless mode adds changing board sizes, move limits, countdown challenges, and black-and-white puzzles.

## Features

- Procedurally generated color-gradient puzzles
- Color and black-and-white preset modes
- Daily puzzles
- Endless puzzle streaks
- Local progress for guest players
- Optional accounts with synchronized progress
- Fastest-time, fewest-moves, daily, and endless-streak leaderboards
- Responsive mouse, touch, and pointer controls

## Gameplay

1. Start with a scrambled color grid.
2. Drag one movable tile onto another to swap them.
3. Restore the smooth gradient between all four corner colors.
4. Aim for a fast solve with as few moves as possible.

Correctly positioned tiles are locked. Some daily and endless puzzles also enforce move or countdown limits.

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and configure the required database and authentication values. Apply database changes explicitly with:

Production startup requires `DATABASE_URL` and `BETTER_AUTH_SECRET`. The app exits during startup if either value is missing.

```bash
npm run db:migrate
```

The verified-leaderboard migration clears legacy unverified rankings. It should be reviewed before it is applied to an existing database.

Leaderboard retention cleanup is intentionally separate from web requests:

```bash
npm run db:cleanup
```

Run that command from deployment scheduling appropriate for the hosting environment.

Leaderboard puzzles are returned by the `/start` request, not when an attempt is prepared. The server timer starts with that response; network delay and the black-and-white preview therefore count toward the authoritative solve time.

## Checks

```bash
npm run lint
npm run test:unit
npx tsc --noEmit --incremental false
npm run build
```

Database integration tests are opt-in and must use an isolated test database. They create and remove a temporary schema:

```bash
TEST_DATABASE_URL=postgresql://... npm run test:database
```

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
