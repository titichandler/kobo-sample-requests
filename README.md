# Sample Request Kobo UK (Next.js)

A clean internal web app for submitting and reviewing lab sample requests.  
Uses **Next.js + React + Tailwind** on the front end and **Neon Postgres** as the database.

This is a **new project**, separate from the Streamlit app in `../streamlit/`.

## Features

- **New request** — multi-sample batch submit with request numbers (`KUK-SR-0001`, …)
- **All requests** — searchable table with filters
- **Request detail** — all sample lines in a batch
- **No Excel / Power Automate** — everything lives in the app + Neon

## Prerequisites

1. [Node.js 20+](https://nodejs.org/) (includes `npm`)
2. A [Neon](https://neon.tech) Postgres database (you can reuse the same one from the Streamlit app)

## Deploy to Vercel (go online)

### 1. Push to GitHub

Create a **new** repo on GitHub (e.g. `sample-request-kuk`), then:

```powershell
cd c:\Users\kobop\Documents\Sample-Request-Projects\nextjs
git add .
git commit -m "Initial Next.js sample request app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sample-request-kuk.git
git push -u origin main
```

### 2. Import on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub  
2. **Add New → Project** → import `sample-request-kuk`  
3. Framework: **Next.js** (auto-detected)  
4. **Environment variables** → add:
   - `DATABASE_URL` = your Neon connection string (same as Streamlit)  
5. **Deploy**

You will get a live URL like `https://sample-request-kuk.vercel.app`.

### 3. Import formulas (one time)

From your PC, with `DATABASE_URL` set:

```powershell
cd c:\Users\kobop\Documents\Sample-Request-Projects\nextjs
$env:DATABASE_URL = "postgresql://..."
npm run seed:formulas
```

This reads `EU FORMULAS DATABASE.xlsx` from the parent `Sample-Request-Projects` folder (columns: code, name, type).

### 4. Test the live app

1. Open your Vercel URL  
2. **New request** → submit a test  
3. **All requests** → confirm it appears  
4. Check Neon if needed: `SELECT * FROM sample_requests ORDER BY id DESC LIMIT 5;`

### 5. Retire Streamlit (when ready)

When the new app works, you can stop or delete the Streamlit Cloud deployment.

---

## Local development

```powershell
cd c:\Users\kobop\Documents\Sample-Request-Projects\nextjs
copy .env.example .env.local
```

Edit `.env.local` and set your Neon connection string:

```
DATABASE_URL=postgresql://...
```

Install and run:

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

1. Push this folder to a **new GitHub repo**
2. Import the repo at [vercel.com](https://vercel.com)
3. Add environment variable: `DATABASE_URL` = your Neon connection string
4. Deploy

## Formula library

Formulas are read from the `formula_library` table in Neon.  
If empty, users can still enter formulas manually.

To import from your Excel file later, run `npm run seed:formulas` (imports `formula_code`, `formula_name`, `formula_type`).

## Project structure

```
sample-request-kuk/
├── src/
│   ├── app/
│   │   ├── api/requests/     # REST API
│   │   ├── request/new/      # Submit form
│   │   ├── requests/         # List + detail pages
│   │   └── page.tsx          # Home
│   ├── components/           # UI components
│   └── lib/                  # DB + business logic
├── .env.example
└── package.json
```

## Relation to the old Streamlit app

| Old (Streamlit) | New (Next.js) |
|-----------------|---------------|
| Streamlit Cloud | Vercel |
| Same Neon DB possible | Same tables |
| Excel / Power Automate | Not used |
| View data in Neon only | View in app |

You can keep both running during migration, then retire Streamlit when ready.
