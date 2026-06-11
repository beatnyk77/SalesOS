# Deploying SalesOS

SalesOS deploys to **Vercel** (Next.js app) + **Supabase** (Postgres, Auth, Edge Functions).
Production deploys run automatically from the GitHub Actions pipeline on every push to `main`
(`.github/workflows/ci-cd.yml`): lint → build → DB migrations → smoke tests → Vercel deploy → Edge Function deploy.

## 1. One-time provisioning

| Service | What to create |
|---------|----------------|
| Supabase | A project. Note the project ref, anon key, service-role key, and DB password. |
| Vercel | A project linked to this repo. Note the org ID, project ID, and a deploy token. |
| Exa | API key (lead research). |
| Hunter | API key (email validation). |
| OpenAI and/or Anthropic | At least one LLM key. |
| Resend | API key (cold email sending, used by Edge Functions). |

## 2. GitHub Actions secrets (repo → Settings → Secrets)

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | `https://<ref>.supabase.co` — injected as `NEXT_PUBLIC_SUPABASE_URL` at build |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_PROJECT_REF` | Project ref for CLI linking |
| `SUPABASE_ACCESS_TOKEN` | Personal access token for the Supabase CLI |
| `SUPABASE_DB_PASSWORD` | For `supabase db push` |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Vercel CLI deploy |
| `EXA_API_KEY`, `HUNTER_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `WEBHOOK_SECRET` | Pushed to Supabase Edge secrets by `scripts/set-edge-secrets.sh` |
| `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` | Playwright smoke tests |

## 3. Vercel environment variables (project → Settings → Environment Variables)

| Variable | Scope |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | All environments |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All environments |
| `SUPABASE_SERVICE_ROLE_KEY` | Production + Preview (server-side only — never expose) |
| `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` | Production + Preview (at least one required) |
| `EXA_API_KEY` | Production + Preview |

## 4. Manual deploy (if you bypass CI)

```bash
pnpm install --frozen-lockfile
pnpm run lint && pnpm run build          # must pass locally
supabase link --project-ref <ref>
supabase db push --linked                # apply migrations
pnpm dlx vercel --prod                   # deploy app
```

Edge Functions deploy one at a time (see the workflow for the full list and JWT flags):

```bash
supabase functions deploy <name> --project-ref <ref> --use-api
```

## 5. Local development

```bash
cp .env.example .env.local   # fill in real values
pnpm install
pnpm dev                     # validates env vars, then starts Next.js
```

## Gotchas

- **Lockfile**: Vercel and CI install with `--frozen-lockfile`. If you change `package.json`,
  run `pnpm install` and commit the updated `pnpm-lock.yaml`, or the deploy fails before the build starts.
- **ESLint**: stay on ESLint 9 until `eslint-config-next` supports 10 (its plugin chain crashes on 10).
- **Package manager**: pnpm only. Don't commit a `package-lock.json`.
