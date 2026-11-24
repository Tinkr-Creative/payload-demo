import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'

export default {
  ...defineCloudflareConfig({}),
  // `pnpm build` is `opennextjs-cloudflare build`, which by default shells out to
  // `pnpm run build` for the Next build. That would recurse, so point it at the
  // plain Next build instead.
  buildCommand: 'pnpm run build:next',
}
