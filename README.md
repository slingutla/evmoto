# AI Landing Starter

## Page views and hourly article refresh

The footer shows the shared home-page view count. Each page load records one view;
hourly counter reads and tab switches do not increment it. Counts begin at setup
and represent page loads, not unique visitors.

Run `supabase/page-views.sql` in the Supabase SQL editor, then set `SUPABASE_URL`
and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for `vercel dev` and in Vercel's
production environment. Redeploy after changing production environment variables.
The service role key stays server-side. Without storage configuration, the footer
shows "Page views: unavailable".

Both article lists load from Google News RSS through `/api/articles?topic=ev`
and `/api/articles?topic=moto`. Successful feeds are cached on Vercel for one hour.
The browser refreshes both lists and the view count hourly, and catches up when
returning to a suspended tab. Chat messages, drafts, and the selected tab remain
intact. Feed failures retain existing articles and show a refresh status.

## What this includes
- Simple landing page (`public/index.html`)
- Signup API (`api/signup.js`)
- AI recommendation prototype API (`api/recommend.js`)
- Vercel deployment config (`vercel.json`)

## 1) Create GitHub repo and push
```powershell
git add .
git commit -m "Initial landing page + signup + AI recommendation prototype"
gh repo create ai-landing-starter --public --source . --remote origin --push
```

If `gh` is not authenticated:
```powershell
gh auth login
```

## 2) Deploy to Vercel
```powershell
npm install
npm i -g vercel
vercel
vercel --prod
```

## 3) Configure email storage (start collecting emails)
Create a Supabase project and run:
```sql
create table if not exists public.waitlist (
  email text primary key,
  created_at timestamptz default now()
);
```
Add Vercel env vars:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Redeploy after env changes.

## 4) Point Route 53 domain to Vercel
In Vercel project:
- Add your domain (e.g. `example.com`, `www.example.com`)

In Route 53 hosted zone:
- Root (`example.com`): `A` alias to Vercel target shown in Vercel
- `www`: `CNAME` to `cname.vercel-dns.com`

## 5) Enable SSL
Vercel auto-issues SSL once DNS is correct. Confirm in Vercel Domain settings: `Valid Configuration` + certificate `Issued`.

## 6) AI recommendation prototype
`/api/recommend` uses a simple scoring model (budget + preference match). Replace this with a real model later via OpenAI API.
