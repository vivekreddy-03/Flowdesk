# Deploy Flowdesk — Render Blueprint

This repository contains a Docker-based Render Blueprint for the Node.js + SQLite full-stack application.

## Before deploying

- The repository must be accessible to your Render account.
- Review Render's current web-service and persistent-disk pricing before creating resources.
- The service needs a persistent disk mounted at `/var/data`; SQLite data stored in an ephemeral container filesystem can be lost during redeploys.
- The Blueprint generates `SESSION_SECRET` and sets `NODE_ENV=production`, `PORT=3000` and `DATA_DIR=/var/data`.

## Create the service

1. Sign in to Render.
2. Choose **New → Blueprint**.
3. Select the `vivekreddy-03/Flowdesk` GitHub repository and its `main` branch.
4. Review the Blueprint's service type, instance plan and persistent disk size/cost.
5. Confirm the generated `SESSION_SECRET` is present and do not replace it with a public or committed value.
6. Approve creation and wait for the Docker build and health check to complete.

The health-check endpoint is `/api/health`. The application listens on the Render-provided port (the Blueprint currently sets port 3000).

## Post-deployment verification

Use fictional test data only until all checks pass.

- Open the deployed HTTPS URL and confirm the login/register screen loads.
- Register a test account; sign out and sign back in.
- Add, edit, search and delete a booking in Service Business.
- Add a client and a transaction; confirm income, expenses and net cash flow update.
- Switch to Creator Hub; add a brand deal and a transaction.
- Confirm records do not leak between workspaces.
- Create a second account and confirm it cannot read, edit or delete the first account's records.
- Restart/redeploy the service and confirm records persist on the mounted disk.
- Run a backup and perform a restore test before considering real customer data.

## Operational requirements before real users

- Configure an off-site backup schedule and test restore procedures.
- Monitor application logs and service availability.
- Decide how account recovery, password resets and support requests will work; these are not implemented in the current pilot.
- Establish a privacy policy, terms, retention policy and incident response process before collecting personal/customer data.
- Review rate limits, database growth and backup retention as usage increases.

## What this guide does not claim

A committed Blueprint is deployment configuration, not proof of a live service. A successful build or health check alone does not prove that registration, data persistence, authorization and browser workflows work. Record the public URL and test date only after completing the post-deployment checks above.
