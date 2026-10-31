# Flowdesk

**A full-stack operations workspace for independent service businesses and content creators.**

Flowdesk brings client work, bookings, brand collaborations and cash flow into one responsive dashboard. It includes two separate workspaces—Service Business and Creator Hub—with account-based data isolation.

## Product capabilities

- Email/password registration, sign-in and sign-out
- Server-side sessions using HttpOnly, SameSite cookies
- Separate Service Business and Creator Hub workspaces
- Create, view, search, edit and delete bookings, clients, brand deals and transactions
- Income, expenses, net cash flow and monthly cash-flow visualization
- Demo data for safe product walkthroughs
- JSON workspace export
- SQLite persistence in local development and configurable data directory
- Responsive desktop and mobile interface
- Production security headers, request validation, rate limiting and same-origin write checks

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js 22, built-in HTTP server |
| API | REST-style JSON endpoints |
| Database | SQLite using Node's built-in `node:sqlite` |
| Authentication | Node.js crypto (scrypt password hashing, random session tokens, HMAC token hashes) |
| Testing | Node.js built-in test runner and HTTP integration tests |
| Deployment | Docker and Render Blueprint |
| CI | GitHub Actions |

No third-party runtime npm packages are required.

## Run locally

Requirements: Node.js **22.5 or newer**.

```bash
git clone https://github.com/vivekreddy-03/Flowdesk.git
cd Flowdesk
cp .env.example .env
```

Set `SESSION_SECRET` in `.env` to a unique random value of at least 32 characters. Then run:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database is created in `./data/flowdesk.sqlite` by default. Set `DATA_DIR` to use another directory.

## Development and quality checks

```bash
npm run check
npm test
npm run backup
```

- `npm run check` validates JavaScript syntax for the server, database, validation, browser app and tests.
- `npm test` starts an isolated production-mode server against a temporary SQLite database and tests health checks, static assets, authentication, validation, CRUD, workspace separation, cross-account isolation, same-origin write protection and logout.
- `npm run backup` creates a SQLite backup and runs an integrity check on the backup.

GitHub Actions runs the syntax checks and integration tests on pushes to `main` and pull requests.

## Deploy the full-stack application

The repository includes a Dockerfile and [Render Blueprint](render.yaml), configured for a **free Render web service**.

1. In Render, create a new Blueprint and select this repository.
2. Confirm the plan is **Free** and no paid disk or add-on is included.
3. Confirm Render generates a unique `SESSION_SECRET`.
4. After deployment, verify `/api/health` and complete the manual smoke-test checklist in [DEPLOYMENT-STEP6.md](DEPLOYMENT-STEP6.md).

**Free-tier limitation:** the free configuration has no persistent disk. SQLite data is stored in the container filesystem and may be lost on restarts or redeploys. Use fictional demo data only. Do not use this free deployment for real customer data or describe it as durable production hosting. Persistent storage requires a paid plan or a database architecture designed for the selected host.

**Deployment status:** configuration is committed; a live hosted deployment and browser smoke test must be completed and independently verified before describing the app as publicly deployed.

GitHub Pages can host static assets, but it cannot run the Node.js API or SQLite database. Use the Render-hosted web service for the full-stack product.

## Project documentation

- [Full-stack setup and architecture](README-FULLSTACK.md)
- [Deployment and post-deployment checklist](DEPLOYMENT-STEP6.md)
- [Controlled pilot guide](PILOT-GUIDE.md)

## Resume project description

**Flowdesk — Full-Stack Business Operations Dashboard**  
Built a responsive multi-workspace business management application using HTML, CSS, JavaScript, Node.js and SQLite. Implemented secure account authentication, account-scoped REST APIs, CRUD workflows for bookings, clients, brand deals and transactions, financial summaries, monthly cash-flow charts, JSON export, Docker deployment configuration and automated integration tests with GitHub Actions.

## Current project status

The full-stack codebase and deployment configuration are in this repository. Do not claim a live production deployment, external customer usage, or completed hosted smoke tests until those steps have actually been performed.

## License

MIT — see [LICENSE](LICENSE).
