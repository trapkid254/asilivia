# Silvia Backend (Express + MongoDB)

This is the backend API for the Silvia app. It is designed to run on Render and connect to MongoDB Atlas.

## Endpoints

- GET `/api/health` — health check
- CRUD `/api/products`
- CRUD `/api/orders`
- CRUD `/api/bookings`
- CRUD `/api/customers`

## Environment Variables

Copy `.env.example` to `.env` for local development and set:

- `MONGODB_URI` — MongoDB Atlas connection string
- `CORS_ORIGIN` — Comma-separated allowed origins, e.g. `https://<your-netlify-site>.netlify.app,https://your-domain.com`
- `PORT` — Default 8080 (Render provides one automatically)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run in dev mode:
   ```bash
   npm run dev
   ```
3. The API will run at `http://localhost:8080`. Health check at `http://localhost:8080/api/health`.

## Deploy to Render

1. Commit and push your repository.
2. In Render, create a new Web Service:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. Add Environment Variables:
   - `MONGODB_URI` — your MongoDB Atlas URI
   - `CORS_ORIGIN` — your Netlify site URL (and any custom domains)
4. After deploy, copy the public URL (e.g., `https://silvia-backend.onrender.com`).

## Netlify Proxy (Frontend)

Update your Netlify `netlify.toml` to proxy `/api/*` to the Render backend URL. Example:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://<your-render-service>.onrender.com/:splat"
  status = 200
  force = true
  headers = { X-Forwarded-By = "Netlify" }
```

Deploy the frontend to Netlify after updating the `netlify.toml` so `/api/...` calls go to the backend.
