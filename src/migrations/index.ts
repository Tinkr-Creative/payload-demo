import * as migration_20250929_111647 from './20250929_111647'
import * as migration_20261124_142947_add_reset_password_requested_at from './20261124_142947_add_reset_password_requested_at'

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20261124_142947_add_reset_password_requested_at.up,
    down: migration_20261124_142947_add_reset_password_requested_at.down,
    name: '20261124_142947_add_reset_password_requested_at',
  },
]
