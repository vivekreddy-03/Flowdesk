# Flowdesk

Flowdesk is a responsive, mobile-first workspace for independent service businesses and creators.

## Features
- Switch between Service Business and Creator Hub workspaces
- Dashboard metrics and activity charts
- Manage bookings, clients, transactions, and brand deals
- Search records and update statuses
- Export data as JSON
- Local browser storage for demo persistence
- Responsive interface using Flowdesk's navy, teal, soft-white, and gold design system

## Run locally
Open `index.html` in a browser. No build step is required.

## Deployment
The repository includes a GitHub Pages workflow at `.github/workflows/pages.yml`. In GitHub, open Settings → Pages and select GitHub Actions as the deployment source.

## Important limitations
This is a front-end prototype. Data is stored in the current browser using localStorage; there is no server database, user authentication, or cross-device synchronization. Use sample data for demos and do not store sensitive customer information.

## License
See [LICENSE](LICENSE).