# Crypto Reco — Website + Lead Pipeline

A responsive marketing site with a complete lead pipeline:

```
Website Form  ─▶  Database / CRM (Supabase)  ─▶  Automated Workflow (email + Slack)
```

Plus a protected **Leads CRM dashboard** at `/admin` to view and move leads through the pipeline.

---

## What's in here

| Path | What it is |
|---|---|
| `index.html` | The website (served at `/`) |
| `styles.css`, `app.js` | Site styles + interactivity (form wiring lives here) |
| `netlify/functions/lead.js` | **POST** endpoint: validate → store → run workflow |
| `netlify/functions/leads.js` | Admin API: list leads + update status (token-protected) |
| `admin/index.html` | Leads CRM dashboard (served at `/admin`) |
| `supabase/schema.sql` | Database table to run once in Supabase |
| `.env.example` | All environment variables you need to set |
| `netlify.toml`, `package.json` | Deploy config (`/api/*` redirects) + dependencies |

---

## Deploy in ~15 minutes (all free tier)

### 1. Database — Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` *(keep this secret — server only)*

### 2. Email — Resend  *(the "automated workflow")*
1. Create an account at [resend.com](https://resend.com).
2. Create an API key → `RESEND_API_KEY`.
3. `SALES_EMAIL` is where new-lead alerts go (set to `golu65dehuni@gmail.com`).
4. `MAIL_FROM` can stay `Crypto Reco <onboarding@resend.dev>` for testing. **For production, verify your own domain in Resend** and use an address on it (Resend's test sender only reliably delivers to the address you signed up with).
5. *(Optional)* Add a Slack Incoming Webhook URL → `SLACK_WEBHOOK_URL`.

### 3. Admin access
- Set `ADMIN_TOKEN` to a long random string. You'll paste it once into the `/admin` login.

### 4. Host — Netlify (auto-deploys from GitHub)
1. Push this repo to GitHub.
2. At [netlify.com](https://netlify.com) → **Add new site → Import an existing project** → pick the repo.
3. Build settings: leave the **build command empty**, **publish directory** `.` — `netlify.toml` already sets functions + redirects, so just confirm.
4. Add every variable from `.env.example` under **Site settings → Environment variables**.
5. **Deploy.** Your site is live; every future `git push` redeploys automatically.

---

## How the pipeline works

1. **Form** — `app.js` POSTs the form as JSON to `/api/lead` (with a hidden honeypot field to block bots).
2. **Database** — `api/lead.js` validates, then inserts a row into the `leads` table with status `new`.
3. **Workflow** — `netlify/functions/lead.js` then, in parallel:
   - emails your `SALES_EMAIL` with the lead details,
   - sends the lead an auto-confirmation email,
   - posts to Slack (if configured).
4. **CRM** — open `/admin`, enter your `ADMIN_TOKEN`, and work leads through `new → contacted → qualified → won / lost`.

## Swapping in a real CRM later
`runWorkflow()` in `netlify/functions/lead.js` is the single place to add a HubSpot / Salesforce / Pipedrive API call — just add another task alongside the email step.

## Local note
Opening `index.html` directly (no server) shows the full site, but the form needs the deployed functions to actually submit. Run `netlify dev` locally (Netlify CLI) to test the endpoints end-to-end.
