# Flowdesk — Full-Stack Pilot

Flowdesk is a Node.js application with two workspaces: Service Business and Creator Hub. It provides account authentication, workspace-scoped records, transaction tracking, dashboard summaries, JSON APIs and a SQLite database.

## Requirements
- Node.js 22.5 or newer (uses the built-in `node:sqlite` module).

## Local setup
1. Copy `.env.example` to `.env`.
2. Set a unique `SESSION_SECRET` of at least 32 characters before production.
3. Run `npm start`.
4. Open http://localhost:3000.

No third-party npm runtime dependencies are required.

## Commands
- `npm run check` — syntax checks.
- `npm test` — automated tests.
- `npm run backup` — create and verify a local SQLite backup.

## Deployment
See [DEPLOYMENT-STEP6.md](DEPLOYMENT-STEP6.md). Configure persistent storage mounted at `/var/data` and verify `/api/health` after deployment.

## Pilot status
This is a controlled-pilot codebase, not a fully production-proven SaaS. Test browser workflows, backup restore, production security and cross-account isolation before entering real customer data.
