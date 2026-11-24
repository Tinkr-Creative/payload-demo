# Payload on Cloudflare — starter template

A base project for [Payload 3](https://payloadcms.com) running on Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare), with a D1 (SQLite) database and R2 file storage.

| Layer     | Choice                                        |
| --------- | --------------------------------------------- |
| CMS       | Payload 3.94                                  |
| Framework | Next.js 16, React 19                          |
| Runtime   | Cloudflare Workers (`@opennextjs/cloudflare`) |
| Database  | D1 via `@payloadcms/db-d1-sqlite`             |
| Storage   | R2 via `@payloadcms/storage-r2`               |
| Tooling   | pnpm 11, Node 24, Vitest, Playwright          |

**Requires the paid Workers plan** — the bundle exceeds the free plan's size limit.

## Start a new project from this template

1. On GitHub, click **Use this template → Create a new repository**, then clone your new repo.
   (Or `git clone` this repo and delete `.git`.)
2. Use the right Node version and install:

   ```bash
   nvm use          # reads .nvmrc (Node 24)
   corepack enable  # pnpm version is pinned in package.json
   pnpm install
   ```

3. Rename the project and create your Cloudflare resources:

   ```bash
   pnpm wrangler login
   pnpm run init:project my-new-site --create-resources
   ```

   This renames the project in `package.json` and `wrangler.jsonc`, creates a D1 database and R2 bucket named `my-new-site`, writes the new `database_id` into `wrangler.jsonc`, and creates `.env` with a fresh `PAYLOAD_SECRET`.

   Don't want it to touch Cloudflare yet? Leave off `--create-resources`; it sets a `REPLACE_WITH_D1_DATABASE_ID` placeholder and prints the `wrangler` commands to run yourself. Add `--dry-run` to preview changes, and `--description "..."` to set the package description.

4. Generate types and run it:

   ```bash
   pnpm run generate:types
   pnpm dev
   ```

   Open <http://localhost:3000/admin> and create your first user.

## Deploying

```bash
pnpm payload migrate:create   # after changing collections
pnpm run deploy               # runs migrations on D1, builds, deploys
```

`CLOUDFLARE_ENV` selects an environment; see the commented `env` example in `wrangler.jsonc`.

For Cloudflare Workers Builds (git-connected deploys), set the build command to `pnpm build` and the deploy command to `npx wrangler deploy`, and add `PAYLOAD_SECRET` as a secret. `pnpm build` runs `opennextjs-cloudflare build`, which `wrangler deploy` needs; a plain `next build` fails at the deploy step with "Could not find compiled Open Next config".

## Scripts

| Script                        | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `pnpm dev`                    | Local dev server (uses your Cloudflare bindings)   |
| `pnpm build`                  | OpenNext build (Next build + Worker bundle)        |
| `pnpm run build:next`         | Plain Next.js build (used by OpenNext internally)  |
| `pnpm run deploy`             | Migrate D1 and deploy to Cloudflare                |
| `pnpm preview`                | Build and preview in the Workers runtime           |
| `pnpm run generate:types`     | Regenerate Cloudflare and Payload types            |
| `pnpm run generate:importmap` | Regenerate the admin import map                    |
| `pnpm lint`                   | ESLint                                             |
| `pnpm test:int` / `test:e2e`  | Vitest / Playwright                                |
| `pnpm run init:project`       | Rename and set up a new project from this template |

## What's included

- **Collections:** `Users` (auth, admin access) and `Media` (uploads to R2).
- **Logging:** a console-based logger in `payload.config.ts`. Payload's default `pino-pretty` uses Node APIs unavailable in Workers (`fs.write is not implemented`). Production only; control the level with `PAYLOAD_LOG_LEVEL`.
- **`skipSafeFetch: true`** on `Media`, which avoids `undici` "diagnostic channel" errors on Workers. This is safe because Workers cannot reach private IP ranges.
- **Single build worker** (`experimental.cpus: 1` in `next.config.ts`). With remote bindings, parallel Next build workers each start a workerd that contends for the same local SQLite state (`SQLITE_BUSY`).

## Notes and gotchas

- **Remote bindings:** `wrangler.jsonc` sets `"remote": true` on D1, and builds use remote bindings, so `pnpm build` talks to your real D1 database. Run `wrangler login` first.
- **Peer deps:** keep `next` in a range accepted by both Payload and `@opennextjs/cloudflare`. Check both peer ranges before bumping Next.
- **GraphQL** may not be fully reliable on Workers until [workerd#5175](https://github.com/cloudflare/workerd/issues/5175) is fixed.
- **Observability logs** are off by default; [enable them](https://developers.cloudflare.com/workers/observability/logs/workers-logs/#enable-workers-logs) in the Cloudflare dashboard.
- You can enable D1 read replicas with `readReplicas: 'first-primary'` in the DB adapter ([docs](https://payloadcms.com/docs/database/sqlite#d1-read-replicas)).
