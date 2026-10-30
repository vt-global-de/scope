export const migrations = [
  {
    version: 1,
    name: "baseline",
    async up(sql) {
      await sql`CREATE TABLE IF NOT EXISTS remote_connection (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, protocol TEXT NOT NULL,
        environment TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
        synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS remote_session_audit (
        id BIGSERIAL PRIMARY KEY, connection_id TEXT NOT NULL, username TEXT NOT NULL,
        protocol TEXT NOT NULL, launched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS remote_session_audit_launched_at_idx ON remote_session_audit (launched_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS status_target_state (
        target_type TEXT NOT NULL, target_id TEXT NOT NULL, name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('up', 'down')), detail TEXT NOT NULL DEFAULT '',
        first_observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), check_count BIGINT NOT NULL DEFAULT 1,
        PRIMARY KEY (target_type, target_id)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS status_event (
        id BIGSERIAL PRIMARY KEY, target_type TEXT NOT NULL, target_id TEXT NOT NULL,
        name TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('up', 'down')),
        previous_status TEXT CHECK (previous_status IN ('up', 'down')),
        detail TEXT NOT NULL DEFAULT '', observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS status_event_observed_at_idx ON status_event (observed_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS status_sample (
        target_type TEXT NOT NULL, target_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('up', 'down')),
        observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS status_sample_target_time_idx ON status_sample (target_type, target_id, observed_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS app_user (
        id BIGSERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS user_session (
        token_hash TEXT PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS user_session_expires_at_idx ON user_session (expires_at)`;
      await sql`CREATE TABLE IF NOT EXISTS user_preference (
        user_id BIGINT PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
        preferences JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS notification_channel_state (
        channel_id TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
    }
  },
  {
    version: 2,
    name: "release-readiness",
    async up(sql) {
      await sql`ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_role_check`;
      await sql`UPDATE app_user SET role = 'operator' WHERE role = 'user'`;
      await sql`ALTER TABLE app_user ALTER COLUMN role SET DEFAULT 'viewer'`;
      await sql`ALTER TABLE app_user ADD CONSTRAINT app_user_role_check CHECK (role IN ('admin', 'operator', 'viewer'))`;
      await sql`CREATE TABLE IF NOT EXISTS login_attempt (
        attempt_key TEXT PRIMARY KEY, failure_count INTEGER NOT NULL DEFAULT 0,
        window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        blocked_until TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS login_attempt_updated_at_idx ON login_attempt (updated_at)`;
      await sql`CREATE TABLE IF NOT EXISTS audit_event (
        id BIGSERIAL PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL,
        target_type TEXT NOT NULL DEFAULT '', target_id TEXT NOT NULL DEFAULT '',
        detail JSONB NOT NULL DEFAULT '{}'::jsonb, remote_address TEXT NOT NULL DEFAULT '',
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS audit_event_occurred_at_idx ON audit_event (occurred_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS notification_outbox (
        id BIGSERIAL PRIMARY KEY, dedupe_key TEXT NOT NULL UNIQUE, channel_id TEXT NOT NULL,
        payload JSONB NOT NULL, state TEXT NOT NULL DEFAULT 'pending'
          CHECK (state IN ('pending', 'delivered', 'failed', 'cancelled')),
        attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_error TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        delivered_at TIMESTAMPTZ
      )`;
      await sql`CREATE INDEX IF NOT EXISTS notification_outbox_due_idx
        ON notification_outbox (state, next_attempt_at) WHERE state = 'pending'`;
      await sql`CREATE TABLE IF NOT EXISTS maintenance_window (
        id BIGSERIAL PRIMARY KEY, target_type TEXT NOT NULL, target_id TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '', starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ends_at TIMESTAMPTZ NOT NULL, created_by TEXT NOT NULL DEFAULT 'system',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (ends_at > starts_at)
      )`;
      await sql`CREATE INDEX IF NOT EXISTS maintenance_window_target_idx
        ON maintenance_window (target_type, target_id, starts_at, ends_at)`;
    }
  }
];

export async function runMigrations(sql) {
  await sql`CREATE TABLE IF NOT EXISTS schema_migration (
    version INTEGER PRIMARY KEY, name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  for (const migration of migrations) {
    await sql.begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(${830000 + migration.version})`;
      const [existing] = await transaction`SELECT EXISTS(SELECT 1 FROM schema_migration WHERE version = ${migration.version}) AS applied`;
      if (existing.applied) return;
      await migration.up(transaction);
      await transaction`INSERT INTO schema_migration (version, name) VALUES (${migration.version}, ${migration.name})`;
    });
  }
}
