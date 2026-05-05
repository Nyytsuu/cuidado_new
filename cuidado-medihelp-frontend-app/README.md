# Cuidado Medihelp Frontend App

This is the frontend-only application folder. It uses the same backend/API as the website instead of carrying another backend copy.

That is not bad practice. It is usually the preferred setup:

- one backend owns the database and business rules
- one or more frontends call that backend through API endpoints
- updates to schedules, clinics, appointments, voice assistant, and profiles stay in one database

## Backend requirement

Run the existing backend from the main project or from `cuidado-medihelp-application/backend`.

Default backend URL:

```text
http://localhost:5000
```

## Configure API URL

Create `.env` from the example:

```bash
copy .env.example .env
```

For local preview, keep:

```text
VITE_API_BASE_URL=http://localhost:5000
```

If testing from a phone on the same Wi-Fi, replace `localhost` with your computer IP, for example:

```text
VITE_API_BASE_URL=http://192.168.1.20:5000
```

## Run

```bash
npm install
npm run dev
```

Open the Vite URL, usually:

```text
http://localhost:5173
```

## Production preview

```bash
npm run build
npm run preview
```

The frontend keeps the existing API calls, but `src/sharedBackendFetch.ts` redirects old `http://localhost:5000` calls to `VITE_API_BASE_URL`. A future cleanup would replace each API call with one shared API helper.
