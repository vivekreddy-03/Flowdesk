# Flowdesk

Flowdesk is a responsive, mobile-first workspace for independent service businesses and creators.

## Features
- Switch between Service Business and Creator Hub workspaces
- Dashboard metrics and cash-flow charts
- Manage bookings, clients, transactions, and brand deals
- Search records and update statuses
- Export workspace data as JSON
- Browser localStorage persistence for demo use
- Responsive layout with Flowdesk's navy, teal, soft-white, and warm-gold design system

## Run locally
Open `index.html` in a modern browser. No build step is required.

## Publish with GitHub Pages
A GitHub Actions workflow publishes the static site files to the `gh-pages` branch whenever `main` changes.

One-time repository setting:
1. Open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **gh-pages** and folder **/(root)**, then click **Save**.
4. Wait for GitHub Pages to finish publishing. The project URL will be `https://vivekreddy-03.github.io/Flowdesk/`.

The publishing workflow is available at `.github/workflows/pages.yml`.

## Important limitations
This is a front-end prototype. Data is stored in the current browser using localStorage; there is no server database, user authentication, or cross-device synchronization. Use sample data for demos and do not store sensitive customer information.

## License
See [LICENSE](LICENSE).

## Full-stack pilot version

The Node.js + SQLite application is in `src/` and its web interface is in `public/`. See [README-FULLSTACK.md](README-FULLSTACK.md) for local setup, [DEPLOYMENT-STEP6.md](DEPLOYMENT-STEP6.md) for deployment steps, and [PILOT-GUIDE.md](PILOT-GUIDE.md) for the controlled pilot checklist. The root-level static prototype remains available for GitHub Pages; GitHub Pages cannot run the full-stack API server.
