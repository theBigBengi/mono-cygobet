# Product Manifest

## What Is This

Cygobet is a social sports prediction platform. Users create prediction groups around football matches, invite friends, and compete by guessing match results — no real money, just points and bragging rights.

The app is aimed at football fans who want to add a social, competitive layer to watching games. Day to day, a user opens the app, checks upcoming fixtures, submits predictions for their groups, and sees how their guesses stack up against friends after matches end.

## What the User Feels They Are Doing

The central experience is predicting match outcomes and competing with friends. The main recurring action is opening the app before match day, scrolling through upcoming fixtures in a group, and submitting score predictions (home goals, away goals). What brings the user back is the social pressure and curiosity — did I beat my friends? Was I right? The pull is strongest right before kickoff (submit predictions) and right after final whistle (see results and points).

## What the Server Does

The mobile app cannot work alone because it depends on accurate, up-to-date sports data that comes from external providers (leagues, fixtures, results, teams). The server is responsible for:

- **Data truth**: fixture results, scores, and states are authoritative on the server. The mobile never decides whether a match ended or what the score was.
- **Fairness**: predictions must be timestamped and locked before kickoff. Only the server can enforce this.
- **Scoring logic**: point calculations based on prediction accuracy must be consistent and tamper-proof.
- **Group lifecycle**: publishing a group, settling predictions, and determining winners are server decisions.
- **Sync**: the server pulls live sports data from third-party APIs and keeps the local database current.
- **Security**: authentication, authorization, and who can see or modify what.

The mobile must never decide on its own whether a prediction is valid, whether a match has finished, or how many points a guess is worth.

## Core Concepts

- **User** — a person with an account, a username, and a profile. Can create and join groups.
- **Group** — a prediction competition built around a set of matches. Has a creator, rules, members, and a lifecycle (draft, active, ended). This is the central organizing concept.
- **Fixture** — a single football match between two teams, at a specific time, in a specific league and round. Has a state (not started, live, finished, cancelled).
- **Prediction** — a user's guess for a specific fixture within a specific group. Contains predicted home and away scores.
- **League** — an organized competition (Premier League, Champions League, etc.). Contains seasons and fixtures.
- **Team** — a football club that plays in fixtures.
- **Season** — a time-bounded period within a league. Fixtures belong to seasons.
- **Member** — a user's participation in a group, with a role (owner, admin, member).

Relationships: a group contains fixtures. A user joins a group as a member. A member submits predictions for the group's fixtures. When fixtures finish, predictions are scored. The group creator selects fixtures by choosing individual games, teams, or entire leagues.

## User vs Admin

The regular user is a player — they predict, compete, and consume. The admin is an operator — they ensure the system has accurate data and runs correctly. The admin's responsibility is to sync sports data from external providers, monitor background jobs, manage users, and handle data corrections when something goes wrong (a match is postponed, a result is corrected, etc.).

The admin is more dangerous because their actions affect all users at once. If an admin triggers a bad sync, corrupts fixture data, or accidentally deletes results, every group and every prediction tied to that data is affected. A user mistake affects only their own predictions.

## The Problem This Solves

Football fans already predict match results informally — in WhatsApp groups, Excel sheets, or by word of mouth. These methods are manual, error-prone, and tedious. Nobody wants to track scores by hand, calculate points, or argue about who predicted what before kickoff.

Existing prediction platforms are either too complex (full fantasy football with transfers and budgets), too commercial (tied to real-money betting), or too generic (not built for friend groups).

Cygobet's value is that it is simple, social, and focused. Create a group, pick matches, invite friends, predict scores, see who wins. No money, no complexity, no bloat.

## What This Is NOT

- **Not a betting app.** There is no real money involved. No deposits, no payouts, no gambling regulation concerns.
- **Not a fantasy football platform.** Users do not manage squads, make transfers, or deal with player-level mechanics. The unit of prediction is a match, not a player.
- **Not a live sports streaming or news app.** The app does not show live match video, commentary, or news articles. It uses match data for prediction purposes only.

## Priority Order

1. **Data reliability** — if predictions are lost, scores are wrong, or groups break, the product has zero value. Trust in the system is the foundation.
2. **User experience** — the app must be fast, intuitive, and frictionless. Submitting a prediction should feel instant. Checking results should feel satisfying.
3. **Security** — predictions must be tamper-proof and timestamped. Auth must be solid. Users must not see each other's predictions before matches (if rules require it).
4. **Development speed** — the product is evolving. The architecture must support fast iteration without breaking what works.
5. **Performance** — important but secondary. The data volumes are modest (hundreds of fixtures, not millions). Performance problems are unlikely to be the bottleneck.

## How Mobile and Server Work Together

The mobile initiates all user-facing actions: creating groups, submitting predictions, browsing fixtures. The server decides everything that matters: whether a prediction is valid, how many points it earns, whether a group can be published, and what the current match state is.

The true state lives on the server. The mobile holds a cached view of that state (via React Query) and optimistically updates the UI for responsiveness, but the server is always the authority. If there is a conflict between what the mobile thinks and what the server says, the server wins.

The server also initiates actions that no user triggers: syncing fixture data from external providers, running scheduled jobs to settle predictions, and cleaning up expired sessions.

## The One Thing Every Developer Must Know

The group is the product — everything else (auth, fixtures, leagues, teams, predictions) exists to serve the creation, operation, and resolution of prediction groups.
