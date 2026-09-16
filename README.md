> # SUPERSEDED, 17 September 2026
>
> **This app is not in use and is not maintained. Do not deploy it, and do not build on it.**
>
> Reference checking was rebuilt inside the Assemble Vincere connector on **14 September
> 2026** and lives at `/cockpit/refs`, with the public referee pages at `/r/*`, on the App
> Service `assemble-vincere` in `rg-assemble-vincere-prod`. That version sits behind the same
> Entra sign-in as the rest of the operating system, keeps its data next to the candidate
> record it belongs to, and needs no separate database, mail provider or hosting account.
>
> This repository is kept as a record of the design: the reference form's wording, the
> defence rule that it never asks for a clearance number, the referee token flow and the
> PDF layout all started here and were carried across. **The code is not the record, the
> form design is.**
>
> One thing did not carry across: the connector version cannot send its own email yet, so it
> stages an outbox rather than sending. That is a Microsoft Graph `Mail.Send` permission
> decision, not a reason to revive this app.
>
> Everything below this line describes the retired app and is left unchanged.

---

# Assemble Solutions — Reference Check App

An internal web app where candidates nominate referees, the referees receive an
emailed link to a defence-suitable reference form, and completed references are
stored, emailed to Assemble Solutions, and downloadable as PDF. Admins can also
share read-only views with hiring managers via expiring links.

- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind, Prisma + Postgres
  (Neon), Resend for email, `@react-pdf/renderer` for PDFs, `otpauth` for
  TOTP-based 2FA. Deploys to Vercel.
- **Roles:** Admin (Assemble Solutions staff, **mandatory 2FA**), Candidate
  (self-signup), Referee (no login — unique token link sent by email).
- **Defence note:** The reference form intentionally **does not** ask for any
  security clearance numbers or classified information.

## Features

- ✅ Candidate self-signup and referee management
- ✅ Defence-suitable reference form (long-form, with declaration & consent)
- ✅ Email notifications via Resend (invite, reminder, completion)
- ✅ **PDF download** of completed references (admin)
- ✅ **2-day reminder emails** to referees who haven't submitted (up to 3 reminders, then auto-expire at 30 days)
- ✅ **Two-factor auth (TOTP)** required for all admin accounts, with 8 backup codes
- ✅ **Share with hiring manager** — generate revocable, expiring read-only links

---

## What you need to deploy (no local Node required)

You need accounts on four free services:

1. **GitHub** — to host the code (https://github.com)
2. **Vercel** — to host the app (https://vercel.com)
3. **Neon** — to host the Postgres database (https://neon.tech)
4. **Resend** — to send emails (https://resend.com)

Git is already installed on your PC. You do **not** need Node.js installed
locally — Vercel builds the app in the cloud.

---

## One-time setup (about 30 minutes)

### 1. Put the code on GitHub

Open PowerShell in `C:\Users\bgroy\assemble-references` and run:

```powershell
git init
git add .
git commit -m "Initial commit"
```

Then on GitHub:
- Create a new **private** repository called `assemble-references` (do not add a
  README — the project already has one).
- Copy the two `git remote add origin ...` / `git push -u origin main` commands
  that GitHub shows you and paste them into PowerShell.

### 2. Create the database on Neon

- Sign in to https://neon.tech and create a new project (region: pick the one
  closest to your users — likely **AWS Sydney**).
- In the Connection Details panel, copy the **Pooled connection string** (it
  contains `-pooler` in the host). It looks like:
  `postgresql://user:pass@ep-xxx-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require`
- Keep this tab open — you'll paste this into Vercel in step 4.

### 3. Set up Resend (email)

- Sign up at https://resend.com.
- Go to **Domains** → **Add Domain** → enter `assemblesolutions.com.au`.
- Resend will give you a few DNS records (SPF, DKIM, optionally DMARC). Add
  these to your domain's DNS host (e.g. GoDaddy, Cloudflare, Squarespace).
- Wait for the domain to show **Verified** (usually < 30 minutes).
- Go to **API Keys** → **Create API Key**, give it a name, and copy the key
  (starts with `re_`).

> **Shortcut for testing:** if you want to try the app first without verifying
> your domain, use the sender `onboarding@resend.dev` and only send to your own
> verified email address.

### 4. Deploy on Vercel

- Sign in to https://vercel.com with your GitHub account.
- Click **Add New → Project**, select the `assemble-references` repository,
  and click **Import**.
- Before clicking Deploy, expand **Environment Variables** and add:

  | Name                  | Value                                                                    |
  | --------------------- | ------------------------------------------------------------------------ |
  | `DATABASE_URL`        | (paste the Neon pooled connection string from step 2)                    |
  | `AUTH_SECRET`         | A long random string (generate at https://generate-secret.vercel.app/32) |
  | `RESEND_API_KEY`      | (paste the Resend API key from step 3)                                   |
  | `EMAIL_FROM`          | `Assemble Solutions <references@assemblesolutions.com.au>`               |
  | `ADMIN_NOTIFY_EMAIL`  | `ben@assemblesolutions.com.au` (comma-separate for multiple recipients)  |
  | `NEXT_PUBLIC_APP_URL` | Leave blank for now — you'll fill it in after first deploy               |
  | `CRON_SECRET`         | **A second** long random string (different from `AUTH_SECRET`)           |

- Click **Deploy**. Wait ~2 minutes.
- After it deploys, Vercel gives you a URL like
  `https://assemble-references.vercel.app`. Copy it.
- Go to **Project → Settings → Environment Variables**, edit
  `NEXT_PUBLIC_APP_URL` to that exact URL (no trailing slash), and on the
  Deployments tab click **Redeploy** on the latest deployment.

### 5. Create your admin account

The app's signup form creates **Candidate** accounts only. To create the first
**Admin** account:

1. Open the app's URL → **Sign up** with your email and a strong password.
2. In Neon, open the **SQL Editor** and run:
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'ben@assemblesolutions.com.au';
   ```
3. Sign out of the app and sign back in.
4. You'll be sent to the **Set up two-factor authentication** page. Scan the QR
   code with an authenticator app (Google Authenticator, 1Password, Authy, etc.)
   and enter the 6-digit code to activate 2FA.
5. **Save your 8 backup codes** — they're shown once. Each can be used once to
   sign in if you lose access to your authenticator.

From then on, signing in as an admin requires both password and a 6-digit code.

### 6. (Optional) Use your own domain

- In Vercel → **Settings → Domains** → add e.g. `references.assemblesolutions.com.au`.
- Vercel shows the DNS record to add (a `CNAME` to `cname.vercel-dns.com`).
- Add it at your DNS host.
- Update `NEXT_PUBLIC_APP_URL` to the new URL and redeploy.

---

## How it works (user flow)

### Candidate
1. Signs up at the app's URL → lands on **My referees**.
2. Clicks **+ Add referee**, fills in referee details + context → clicks
   **Send reference request**.
3. Sees status of each request (Awaiting referee / Completed / Expired).

### Referee
4. Receives an email from `references@assemblesolutions.com.au` with a unique
   link valid for 30 days.
5. If no submission after **2 days**, gets a reminder email. Up to 3 reminders
   are sent. After 30 days, the request auto-expires.
6. Opens the link → fills out the defence-suitable reference form → submits.

### On submission
- The reference is stored in Postgres.
- An email notification is sent to `ADMIN_NOTIFY_EMAIL` with a link to view the
  completed reference.
- The referee sees a "Submitted" confirmation page.

### Admin (you)
7. Signs in (email + password + 2FA code) → sees the dashboard of all reference
   requests across all candidates.
8. Clicks into a completed reference to view it in full. From there can:
   - **Download PDF** (formatted, A4, paginated, marked "Confidential")
   - **Print** to PDF via the browser
   - **Share with hiring manager** — generates a token-based link with a chosen
     expiry (7/14/30/60/90 days), optionally emails it to the recipient, and
     tracks view count. Links can be revoked at any time.

---

## The reference form

The questions are grouped into:

- **Your details** (referee identity)
- **Relationship to candidate** (capacity, duration, frequency of contact)
- **Role performance** (duties, strengths, areas to improve, work quality,
  reliability, teamwork, leadership, response to stress)
- **Character & suitability** (honesty, trustworthiness, discretion, loyalty,
  financial responsibility, substance concerns, legal concerns, foreign
  influence concerns, vulnerabilities to coercion)
- **Overall recommendation** (re-engage, recommend for trusted role,
  additional comments)
- **Declaration** (truthfulness, consent, typed-name signature)

It explicitly tells the referee **not** to include any security clearance
numbers or classified information.

To change the questions, edit `src/app/reference/[token]/page.tsx` (the form),
`src/lib/validation.ts` (the validation schema), and `src/lib/pdf.tsx` (the PDF
output). If you add new fields, also add them to the Prisma `ReferenceResponse`
model in `prisma/schema.prisma`, commit, push — Vercel will run the database
migration automatically on the next deploy.

---

## Cron / reminder schedule

A Vercel Cron job calls `/api/cron/reminders` daily at **22:00 UTC** (08:00 or
09:00 AEST/AEDT). Each run:

1. Marks any PENDING request past its 30-day expiry as EXPIRED.
2. Sends a reminder email to any referee whose request has been pending ≥ 2
   days since the last contact, capped at 3 reminders per request.

The endpoint requires the `CRON_SECRET` header (set automatically by Vercel
Cron). To trigger a run manually for testing, run:

```powershell
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app-url/api/cron/reminders
```

To change the schedule, edit `vercel.json` (uses standard cron syntax). Note:
Vercel's free Hobby plan limits cron to once per day.

---

## Admin 2FA — operational notes

- **All admins must use 2FA.** On first login, they're forced to set it up
  before they can access any admin pages.
- Backup codes are shown once at setup. If lost AND the authenticator is also
  lost, an existing admin can reset 2FA for the user by clearing the relevant
  fields in Neon:
  ```sql
  UPDATE "User"
  SET "totpEnabled" = false, "totpSecret" = NULL, "backupCodeHashes" = '{}'
  WHERE email = 'admin@example.com';
  ```
  The user will then be sent through setup again on next login.

---

## Running locally (optional)

If you want to run it on your PC for testing:

```powershell
# Install Node 20+ from https://nodejs.org, then:
npm install
copy .env.example .env
notepad .env       # fill in DATABASE_URL, AUTH_SECRET, etc.
npx prisma db push # push schema to your dev DB
npm run dev        # http://localhost:3000
```

---

## Costs

At low volume, all four services have free tiers that should cover this:
- Vercel Hobby: free (includes daily cron)
- Neon free plan: 0.5 GB storage
- Resend free plan: 3,000 emails/month, 100/day
- Domain (if you use a custom one): you already own it

You only start paying if/when usage grows.
