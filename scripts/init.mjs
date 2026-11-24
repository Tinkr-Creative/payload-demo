#!/usr/bin/env node
/**
 * Turn a fresh copy of this template into a new project.
 *
 *   pnpm run init:project <name> [options]
 *
 * What it does:
 *   - renames the project in package.json and wrangler.jsonc (worker, D1 database, R2 bucket)
 *   - resets the D1 database_id to a placeholder (or the real id with --create-resources)
 *   - creates .env with a fresh PAYLOAD_SECRET if you don't have one
 *   - with --create-resources, creates the D1 database and R2 bucket via wrangler
 *
 * Options:
 *   --description "text"   set the package.json description
 *   --create-resources     create the D1 database + R2 bucket (needs `pnpm wrangler login`)
 *   --dry-run              print what would change without writing anything
 */
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PLACEHOLDER_DB_ID = 'REPLACE_WITH_D1_DATABASE_ID'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}
const valueIndexes = new Set(['--description'].map((n) => args.indexOf(n) + 1).filter((i) => i > 0))
const name = args.find((a, i) => !a.startsWith('--') && !valueIndexes.has(i))
const dryRun = flag('--dry-run')

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

if (!name) {
  fail(
    'Usage: pnpm run init:project <name> [--description "text"] [--create-resources] [--dry-run]',
  )
}
// Valid for npm package names, Worker names, D1 database names and R2 bucket names.
if (!/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])$/.test(name)) {
  fail(
    `"${name}" is not a valid name. Use 3-63 lowercase letters, numbers and hyphens (e.g. my-new-site).`,
  )
}

const read = (file) => readFileSync(join(root, file), 'utf8')
const write = (file, contents) => {
  if (dryRun) return console.log(`  [dry-run] would write ${file}`)
  writeFileSync(join(root, file), contents)
  console.log(`  ✔ updated ${file}`)
}

// --- package.json -----------------------------------------------------------
const pkgRaw = read('package.json')
const pkg = JSON.parse(pkgRaw)
const oldName = pkg.name
if (oldName === name) fail(`Project is already named "${name}". Nothing to do.`)

console.log(`\nInitialising "${oldName}" → "${name}"${dryRun ? ' (dry run)' : ''}\n`)

pkg.name = name
const description = option('--description')
if (description) pkg.description = description
write('package.json', JSON.stringify(pkg, null, 2) + '\n')

// --- wrangler.jsonc ---------------------------------------------------------
// wrangler.jsonc contains comments, so edit it as text rather than parsing it.
let wrangler = read('wrangler.jsonc')
const replaceKey = (key) => {
  const re = new RegExp(`("${key}"\\s*:\\s*)"${oldName}"`, 'g')
  wrangler = wrangler.replace(re, `$1"${name}"`)
}
;['name', 'database_name', 'bucket_name', 'preview_bucket_name'].forEach(replaceKey)

// Put bucket_name / preview_bucket_name on their own lines (the template had them joined).
wrangler = wrangler.replace(
  /("bucket_name":\s*"[^"]+"),\s*("preview_bucket_name")/,
  '$1,\n      $2',
)

let databaseId = PLACEHOLDER_DB_ID

// --- Cloudflare resources ---------------------------------------------------
const wranglerBin = (cmdArgs) =>
  execFileSync('pnpm', ['exec', 'wrangler', ...cmdArgs], { cwd: root, encoding: 'utf8' })

if (flag('--create-resources')) {
  if (dryRun) {
    console.log(`  [dry-run] would run: wrangler d1 create ${name}`)
    console.log(`  [dry-run] would run: wrangler r2 bucket create ${name}`)
  } else {
    try {
      console.log(`  … creating D1 database "${name}"`)
      const out = wranglerBin(['d1', 'create', name])
      const id = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0]
      if (!id) throw new Error(`Could not find a database id in wrangler output:\n${out}`)
      databaseId = id
      console.log(`  ✔ D1 database created (${id})`)

      console.log(`  … creating R2 bucket "${name}"`)
      wranglerBin(['r2', 'bucket', 'create', name])
      console.log('  ✔ R2 bucket created')
    } catch (err) {
      // Still write the renamed config so the user only has to fix the resource step.
      console.error(`\n⚠ Resource creation failed: ${err.stderr || err.message}`)
      console.error(
        '  Run `pnpm wrangler login`, then create the resources manually (see README).\n',
      )
    }
  }
}

wrangler = wrangler.replace(/("database_id"\s*:\s*)"[^"]*"/, `$1"${databaseId}"`)
write('wrangler.jsonc', wrangler)

// --- .env -------------------------------------------------------------------
if (existsSync(join(root, '.env'))) {
  console.log('  • .env already exists, leaving it alone')
} else if (dryRun) {
  console.log('  [dry-run] would create .env with a new PAYLOAD_SECRET')
} else {
  const example = read('.env.example')
  const secret = randomBytes(32).toString('hex')
  write('.env', example.replace(/^PAYLOAD_SECRET=.*$/m, `PAYLOAD_SECRET=${secret}`))
}

// --- next steps -------------------------------------------------------------
console.log(`
Done. Next steps:
${
  databaseId === PLACEHOLDER_DB_ID
    ? `  1. Create the Cloudflare resources and put the D1 id in wrangler.jsonc:
       pnpm wrangler login
       pnpm wrangler d1 create ${name}
       pnpm wrangler r2 bucket create ${name}
`
    : '  1. Cloudflare resources are created and wrangler.jsonc is updated.\n'
}  2. pnpm install
  3. pnpm run generate:types
  4. pnpm dev
  5. pnpm run deploy   (applies migrations to D1, then deploys)
`)
