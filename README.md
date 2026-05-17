# AI Landing Starter

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
