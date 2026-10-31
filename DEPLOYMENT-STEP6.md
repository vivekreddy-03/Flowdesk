# Deploy Flowdesk — Render Free Pilot

This repository contains a Docker-based Render Blueprint for the Node.js + SQLite full-stack application.

## Free-tier deployment trade-off

The Blueprint is configured for Render's free web-service plan and does **not** attach a persistent disk. SQLite will use the container's local filesystem. This is suitable only for a temporary portfolio/demo deployment with fictional data: data can be lost when the free service restarts, is redeployed, or its instance is replaced. Do not use this configuration for real customer data or as a durable production service.

A persistent disk is a paid Render feature. If durable storage is needed later, switch to a paid service with a persistent disk or migrate the database to an appropriate managed database.

## Before deploying

- The repository must be accessible to your Render account.
- Confirm the service plan is **Free** in the Render dashboard before creating it.
- The Blueprint generates a unique `SESSION_SECRET` and sets `NODE_ENV=production` and `PORT=3000`.
- Render's deployment API currently returned a billing-information-required error even when the Free plan was selected. If the dashboard asks for billing details, review its terms yourself; do not select a paid plan or approve paid add-ons.

## Create the service

1. Sign in to Render.
2. Choose **New → Blueprint**.
3. Select the `vivekreddy-03/Flowdesk` GitHub repository and its `main` branch.
4. Confirm the service plan is **Free** and that no disk or other paid resource is being added.
5. Confirm the generated `SESSION_SECRET` is present and do not replace it with a public or committed value.
6. Create the service and wait for the Docker build and health check to complete.

The health-check endpoint is `/api/health`. The application listens on port 3000.

## Post-deployment verification

Use fictional test data only.

- Open the deployed HTTPS URL and confirm the login/register screen loads.
- Register a test account; sign out and sign back in.
- Add, edit, search and delete a booking in Service Business.
- Add a client and a transaction; confirm income, expenses and net cash flow update.
- Switch to Creator Hub; add a brand deal and a transaction.
- Confirm records do not leak between workspaces.
- Create a second account and confirm it cannot read, edit or delete the first account's records.
- Remember that records may disappear after a restart or redeploy on the free plan.

## Operational requirements before real users

- Move to durable storage and configure off-site backups with tested restore procedures.
- Monitor application logs and service availability.
- Decide how account recovery, password resets and support requests will work; these are not implemented in the current pilot.
- Establish a privacy policy, terms, retention policy and incident response process before collecting personal/customer data.
- Review rate limits, database growth and backup retention as usage increases.

## What this guide does not claim

A committed Blueprint is deployment configuration, not proof of a live service. A successful build or health check alone does not prove that registration, authorization and browser workflows work. Record the public URL and test date only after completing the post-deployment checks above.
