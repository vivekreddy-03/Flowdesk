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

## Integration test coverage

The automated suite in `tests/server.test.js` launches the actual HTTP server with a temporary SQLite database and exercises:
- Health and security response headers
- Static application delivery
- Account registration, duplicate registration and login
- Invalid payload and impossible calendar-date rejection
- Production same-origin write enforcement
- Authenticated record creation, search, update and deletion
- Service/creator workspace separation and account-to-account authorization
- Demo-data insertion, logout and oversized request rejection

Run the suite with `npm test`. The GitHub Actions workflow runs it on pushes to `main` and pull requests targeting `main`.

## Scope and known limitations

This is a portfolio-grade full-stack pilot, not a claim of a fully production-hardened SaaS. Password reset/account recovery, email verification, billing, audit logs, scheduled off-site backups, privacy/legal pages and customer support workflows are not implemented. The SQLite + persistent-disk deployment is a single-instance setup; plan a managed database migration before horizontal scaling or handling significant customer workloads.
