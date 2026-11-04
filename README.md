# MediStock

MediStock is a pharmacy operations dashboard built with React, Express, and MongoDB. It includes inventory and batch tracking, low-stock and expiry alerts, supplier records, billing with stock deduction, JWT authentication, and sales reports.

## Requirements

- Node.js 18 or newer
- MongoDB running locally or a MongoDB connection string

## Run locally

1. In `backend`, copy `.env.example` to `.env`, set `MONGO_URI`, and replace `JWT_SECRET` with a long random value.
2. Install and start the API. For a local MongoDB instance, use `dev:local`; to use the configured `MONGO_URI` (for example, MongoDB Atlas), use `dev`:

   ```sh
   cd backend
   npm install
   npm run dev:local
   ```

3. In a second terminal, install and start the frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

4. Open the Vite URL (usually `http://localhost:5173`). The first visitor can create the administrator account. Admins can add administrator or staff accounts from the **Team** page; each teammate uses the same sign-in screen.

Set `VITE_API_URL` in `frontend/.env` to the API's `/api` URL if it is not `http://localhost:5000/api`. Set `CLIENT_URL` in the backend environment to the frontend origin when deploying.

The local database command uses `mongodb://127.0.0.1:27017/medistock` and does not change `MONGO_URI` in `.env`. The regular `dev` and `start` commands use the configured `MONGO_URI`; the database must be reachable for authentication and other API operations.

## API overview

- `POST /api/auth/setup`, `POST /api/auth/login`, `GET /api/auth/me`
- `/api/medicines` — search, create, update, and delete inventory
- `/api/suppliers` — create, update, list, and delete suppliers
- `/api/sales` — create bills and list transactions
- `GET /api/dashboard`, `GET /api/reports` — analytics and sales reporting

All API routes except health checks and initial setup/sign-in require a bearer JWT. Passwords are hashed before storage. Creating a sale validates available stock and deducts quantities before recording the transaction.
