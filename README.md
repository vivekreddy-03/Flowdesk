# Flowdesk

**A full-stack operations workspace for independent service businesses and content creators.**

> **Recruiter demo:** [Open the interactive Flowdesk demo](https://vivekreddy-03.github.io/Flowdesk/?demo=1) — no account required. Recruiters can add, edit, delete, search and export fictional sample records in both workspaces. Demo changes are saved in that browser's local storage only; they are not sent to a server or shared with other visitors.

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
| Deployment | Docker, Render Blueprint, GitHub Pages demo |
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

## Deployment

### Recruiter demo (interactive browser preview)

The GitHub Pages workflow publishes only the `public/` frontend directory. The demo is available at:

**https://vivekreddy-03.github.io/Flowdesk/?demo=1**

It loads fictional records in the browser so a recruiter can explore the Service Business and Creator Hub dashboards, metrics, chart and navigation without creating an account. Add, edit and delete actions work against browser-local demo data; changes update the dashboard and persist in that browser using local storage. The reset demo data action restores the original samples. This is a client-side demonstration only: changes are not stored on a server, shared across visitors, or connected to the Node.js API.

### Full-stack application

The full application runs locally with the Node.js HTTP server and SQLite database, including real server-side authentication and account-scoped CRUD. The repository includes a Dockerfile and a Render Blueprint, but a hosted full-stack service has **not** been verified. Render's service-creation API returned a billing-information-required error in this workspace, even with the Free plan selected.

The Render free filesystem is ephemeral, so SQLite records can be lost on restarts, redeploys or sleep. Do not use that configuration for real customer data. A durable hosted full-stack deployment needs a host/database combination that supports persistent storage and has been verified before it is described as live.

GitHub Pages cannot execute the Node.js API or SQLite database; it hosts only the recruiter-facing static demo.

## Project documentation

- [Full-stack setup and architecture](README-FULLSTACK.md)
- [Deployment and post-deployment checklist](DEPLOYMENT-STEP6.md)
- [Controlled pilot guide](PILOT-GUIDE.md)

## Resume project description

**Flowdesk — Full-Stack Business Operations Dashboard**  
Built a responsive multi-workspace business management application using HTML, CSS, JavaScript, Node.js and SQLite. Implemented secure account authentication, account-scoped REST APIs, CRUD workflows for bookings, clients, brand deals and transactions, financial summaries, monthly cash-flow charts, JSON export, Docker deployment configuration and automated integration tests with GitHub Actions.

## Current project status

The full-stack codebase and interactive browser-based recruiter demo are in this repository. Do not describe the public demo as a live full-stack deployment or claim external customer usage.

## License

MIT — see [LICENSE](LICENSE).
