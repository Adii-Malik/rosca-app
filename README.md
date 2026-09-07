# Committee

A rotating savings and credit association tracker: members join a committee, pay
a monthly contribution, and each month one member is drawn to receive the pooled
payout. The draw runs live over websockets so everyone watching sees the same
wheel spin at the same time.

- **client/** — React 18 (Create React App) + Tailwind
- **server/** — Express + MongoDB (Mongoose) + socket.io

## Running locally

You need Node 20+ and a MongoDB instance (local `mongod` or Atlas).

```bash
# 1. Server
cd server
npm install
cp .env.example .env        # then set ATLAS_CONNECTION
npm run seed                # optional: sample members, committee, contributions
npm run dev                 # http://localhost:5001

# 2. Client (separate terminal)
cd client
npm install
cp .env.example .env
npm start                   # http://localhost:3000
```

The dashboard is public. Everything else requires signing in with `ADMIN_USER` /
`ADMIN_PASSWORD` from `server/.env`.

## Server scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Run the server |
| `npm run dev` | Run with auto-restart on file changes |
| `npm run seed` | Populate a **local** database with sample data (refuses remote hosts without `--force`) |
| `npm run inspect-db` | Read-only survey of the configured database — safe against production |
| `npm run hash-password 'pw'` | Generate `ADMIN_PASSWORD_HASH` for production |
| `npm run migrate:draw-dates` | Convert legacy string `DrawRecord.date` values to real dates (dry run; `--apply` to write) |
| `npm run resync-durations` | Recompute each open committee's term from its share count (dry run; `--apply` to write) |

## How the draw works

Each committee has a **schedule**: a day of the month, a time, and a timezone
(`withdrawDay`, `withdrawHour`, `withdrawMinute`, `timezone`). The server checks
every minute and runs the draw itself when that moment arrives — the countdown
on the dashboard refers to a real event, not a decorative clock.

1. The scheduler notices a round is due and calls the draw.
2. The server loads the committee, that round's contributions and its draw history
   from the database, and refuses the draw if the round is not yet due, if its pool
   is not fully collected, if the committee has finished, or if every member has
   been paid out.
3. It picks a winner with `crypto.randomInt` among members who have not yet reached
   their share count, broadcasts `drawStarted`, and saves the record.
4. After `DRAW_ANIMATION_MS` (7s) it broadcasts `drawCompleted`; the wheel
   decelerates onto the winner over a further 2.4s and the result is revealed.

An admin can press **Draw now** to run a due round without waiting for the next
scheduler tick, but not to run one before its day or before its pool is complete.
Setting `autoDraw` to false on a committee turns the automatic run off entirely.

The client is never trusted to decide the outcome — it supplies the committee id
and nothing more.

### Nobody has to be watching

A draw is a stored event, not just a broadcast:

- Each `DrawRecord` keeps the **eligible members at the time**, the payout, the
  round number and a `periodKey` such as `"2026-09"`.
- Anyone can **replay** a past draw from the archive and see the same wheel land
  on the same winner.
- Someone opening the page mid-draw joins the wheel already in progress.

A unique index on `{ committeeId, periodKey }` means one draw per committee per
round is enforced by the database, not by a check two requests could both pass.
Records created before this existed have a null `periodKey`; they still show in
history but cannot be replayed.

## Recording contributions

Payments are entered as a checklist rather than one member at a time. Pick a
committee and a month, and the form lists its members with anyone who still owes
at the top; **Select all unpaid** ticks them in one go, each with their own share
pre-filled (a member holding two shares owes double). Amounts stay editable for
partial payments.

`POST /api/contributions/bulk` backs this. Members who already have a
contribution for that month are reported as skipped rather than failing the
batch, so re-running a partial entry is safe. Contributions cannot be recorded
against a completed committee.

The history is grouped by month with month and committee filters, defaulting to
the current month.

## How long a committee runs

One round pays out one share, so the term is exactly as long as there are
shares: eight members where one holds two shares is nine shares, so nine rounds.
The start and end dates are checked against that count — read inclusively, so a
committee starting in September and ending in June runs ten rounds, September
through June — and a committee whose dates disagree with its shares is rejected
rather than saved with a term that leaves a share unpaid.

Records created before this rule may still carry a stale term; `npm run
resync-durations` reports and repairs them.

## Rounds

A round is a position in the term, not whatever month it happens to be. Round 1
is the committee's start month — the first month is a payout month like any
other — and round *n* is the *n*th month from there.

A round becomes drawable on its configured day and time, or on the committee's
start date if that day has already passed when the committee begins. It then
stays drawable until it actually runs. Two things follow:

- **A round is never skipped.** If September's draw does not happen in
  September, September is still the round owed in October, and drawing it then
  records it against September.
- **A draw needs the whole pool.** The winner receives the full monthly pool, so
  every member must have paid their share for that round first. Until then the
  draw waits and the dashboard names who is short. Awarding a round to a chosen
  member is still allowed without payment, since a reserved round often comes
  before anyone has paid in.

Together these replace the previous behaviour, where one contribution was enough
to release the whole pool and a round whose day had passed was dropped.

**Being drawable and being drawn automatically are separate.** A draw is an
event members are told to watch, so the server starts one only at the announced
moment — within `DRAW_AUTO_GRACE_MS` of it, which covers a restart. Two rounds
therefore never start on their own, and wait for an admin to press **Draw now**
when everyone is present:

- a first round whose configured day already fell before the committee began, so
  it never had an announced moment;
- any round still short of money at its moment, which would otherwise have gone
  off the instant an admin recorded the last payment.

The dashboard shows these as **Ready to draw · Manual** rather than *Automatic*.

## Committee lifecycle

A committee is `active` or `completed`. The scheduler closes it once every member
has been paid out; it will not close a committee that still owes a round, even
past its end date, because that round is a real debt to a member. An admin can
close one by hand. A completed committee refuses new draws.

- **Active** committees appear on the dashboard.
- **Completed** committees move to `/archive`, which shows every round, who won
  it and for how much, plus a per-member ledger of what each person paid in
  against what they took out. In a committee that ran to completion every member
  nets zero — which makes the archive a useful check that the books balanced.

`PATCH /api/committees/:id/status` reopens a committee closed too early, or
closes one by hand.

## Authentication

A single admin account, configured by environment variable. Signing in returns a
JWT which the client stores in `sessionStorage` and sends as a `Bearer` token;
the websocket handshake carries the same token.

- **Read endpoints are public** (`GET /api/users`, `/committees`, `/contributions`,
  `/dashboards`, `/draws`) so guests can watch a draw.
- **All writes require a valid token**, as does starting a draw.

### Production checklist

- Set `JWT_SECRET` to a strong random value — the server refuses to start in
  production without one.
- Set `ADMIN_PASSWORD_HASH` (via `npm run hash-password`) instead of `ADMIN_PASSWORD`.
- Set `CORS_ORIGIN` to your front-end origin; blank allows any origin.
- `PORT` must match `internal_port` in `fly.toml` (8080).

## Inspecting a real database safely

Set `READ_ONLY=true` and the server refuses every write: HTTP mutations return
403, scheduled draws do not run, committees are not auto-closed, and manual
draws are rejected. Signing in and all reads still work, so the app can be
browsed normally against production data.

```bash
READ_ONLY=true npm start
```

`GET /api/health` reports `readOnly` so you can confirm which mode is active.

## Deploying

`fly deploy` builds the Dockerfile, which compiles the React app and serves it
from the Express server on port 8080. The production bundle talks to `/api` on
its own origin, so no client env vars are needed in the image.

Set secrets first:

```bash
fly secrets set ATLAS_CONNECTION='mongodb+srv://…' \
                JWT_SECRET='…' \
                ADMIN_USER='admin' \
                ADMIN_PASSWORD_HASH='$2b$12$…' \
                CORS_ORIGIN='https://your-app.fly.dev'
```

## Installing it on a phone

No wrapper is needed — no Capacitor, no store listing. `client/public/manifest.json`
makes the deployed site installable, and it opens without browser chrome.

- **iPhone / iPad:** open the site in Safari, Share → *Add to Home Screen*.
- **Android:** Chrome offers *Install app*, or use ⋮ → *Add to Home screen*.

Three details make the difference between that and a bookmark:

- **`apple-touch-icon.png` is opaque and square.** iOS composites a transparent
  icon onto black and then applies its own rounded mask, so an icon carrying its
  own rounded corners shows black wedges outside them. iOS uses only this file —
  it ignores the manifest icons for the home screen.
- **`icon-maskable-512.png` is separate.** Android crops a maskable icon to a
  circle of 80% of the frame, which would clip an icon drawn to the edges, so the
  maskable copy keeps its glyph inside that safe zone while `icon-192`/`icon-512`
  keep the rounded-rect silhouette for everywhere nothing masks them.
- **`safe-top` / `safe-bottom` / `safe-x` in `index.css`.** Installed, the page
  is drawn edge to edge, under the status bar and the home indicator. These use
  `env(safe-area-inset-*)`, which is 0 in a normal tab, so the same CSS is right
  in both.

To regenerate the icons after a rebrand, redraw `favicon.svg` and produce from
it: `apple-touch-icon.png` (180×180, opaque, square), `icon-maskable-512.png`
(512×512, opaque, glyph within the middle 80%) and `icon-192`/`icon-512`
(rounded, transparent corners).

## Data model

| Model | Notes |
| --- | --- |
| `User` | A member. Name and membership status. |
| `Committee` | Payout amount, term, draw schedule (day/hour/minute/timezone), lifecycle status, and participants. Each participant has a `contributionLimit` — the number of shares they hold, which is both how much they pay per month and how many payouts they may receive. |
| `Contribution` | One payment by a member toward a committee in a given month. |
| `DrawRecord` | One payout awarded to a member, with the eligible pool, payout amount and round key kept so the draw can be replayed. |
| `Transaction` | Defined but not currently used by any route. |

`monthlyAmount` on a committee is derived: `totalPooledAmount / total shares`.
