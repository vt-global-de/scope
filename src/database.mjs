import postgres from "postgres";
import { runMigrations } from "./migrations.mjs";

function disabledDatabase() {
  return {
    enabled: false,
    async initialize() {},
    async health() { return { status: "disabled" }; },
    async syncConnections() {},
    async recordLaunch() {},
    async recordStatuses() { return []; },
    async statusHistory() { return { summary: { total: 0, up: 0, down: 0 }, events: [], targets: [], timeline: [] }; },
    async pruneHistory() {},
    async countUsers() { return 0; },
    async createInitialUser() { throw new Error("Benutzerkonten benötigen PostgreSQL."); },
    async createUser() { throw new Error("Benutzerkonten benötigen PostgreSQL."); },
    async findUserByUsername() { return null; },
    async userExists() { return false; },
    async listUsers() { return []; },
    async updateUserPassword() {},
    async setUserActive() {},
    async createUserSession() { throw new Error("Benutzersitzungen benötigen PostgreSQL."); },
    async findUserBySession() { return null; },
    async deleteUserSession() {},
    async deleteExpiredUserSessions() {},
    async getUserPreferences() { return {}; },
    async setUserPreferences() { throw new Error("Benutzereinstellungen benötigen PostgreSQL."); },
    async getNotificationChannelStates() { return {}; },
    async setNotificationChannelEnabled() { throw new Error("Benachrichtigungseinstellungen benötigen PostgreSQL."); },
    async getLoginAttempt() { return null; },
    async recordLoginFailure() { return { blocked: false, retryAfterSeconds: 0 }; },
    async clearLoginAttempt() {},
    async recordAudit() {},
    async auditHistory() { return []; },
    async currentTargetStatuses() { return {}; },
    async enqueueNotification() { return false; },
    async pendingNotifications() { return []; },
    async cancelPendingNotifications() {},
    async markNotificationDelivered() {},
    async markNotificationCancelled() {},
    async markNotificationFailed() {},
    async notificationHistory() { return []; },
    async activeMaintenance() { return false; },
    async listMaintenanceWindows() { return []; },
    async createMaintenanceWindow() { throw new Error("Wartungsfenster benötigen PostgreSQL."); },
    async deleteMaintenanceWindow() {},
    async resetAdminAccount() { throw new Error("Admin-Recovery benötigt PostgreSQL."); },
    async close() {}
  };
}

export function createDatabase(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) return disabledDatabase();

  let lastSyncSignature;
  let statusWriteQueue = Promise.resolve();
  const sql = postgres(databaseUrl, {
    max: Number.parseInt(process.env.DATABASE_POOL_SIZE ?? "10", 10),
    connect_timeout: 10,
    idle_timeout: 30,
    max_lifetime: 60 * 30
  });

  return {
    enabled: true,
    async initialize() {
      await runMigrations(sql);
      await this.pruneHistory();
      await this.deleteExpiredUserSessions();
    },
    async health() {
      await sql`SELECT 1`;
      return { status: "ok" };
    },
    async syncConnections(connections) {
      const syncSignature = JSON.stringify(connections.map((connection) => ({
        id: connection.id,
        name: connection.name,
        protocol: connection.protocol,
        environment: connection.environment ?? "Allgemein"
      })));
      if (syncSignature === lastSyncSignature) return;

      await sql.begin(async (transaction) => {
        await transaction`UPDATE remote_connection SET active = FALSE`;
        for (const connection of connections) {
          await transaction`
            INSERT INTO remote_connection (id, name, protocol, environment, active, synced_at)
            VALUES (${connection.id}, ${connection.name}, ${connection.protocol}, ${connection.environment ?? "Allgemein"}, TRUE, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              protocol = EXCLUDED.protocol,
              environment = EXCLUDED.environment,
              active = TRUE,
              synced_at = NOW()
          `;
        }
      });
      lastSyncSignature = syncSignature;
    },
    async recordLaunch({ connectionId, username, protocol }) {
      await sql`
        INSERT INTO remote_session_audit (connection_id, username, protocol)
        VALUES (${connectionId}, ${username}, ${protocol})
      `;
    },
    async recordStatuses(entries) {
      const normalized = entries.filter((entry) => entry && ["up", "down"].includes(entry.status)).map((entry) => ({
        targetType: String(entry.targetType).slice(0, 40),
        targetId: String(entry.targetId).slice(0, 240),
        name: String(entry.name || entry.targetId).slice(0, 240),
        status: entry.status,
        detail: String(entry.detail || "").replace(/[\r\n\t]+/g, " ").slice(0, 500),
        observedAt: new Date()
      }));
      if (!normalized.length) return [];
      const write = async () => sql.begin(async (transaction) => {
        const transitions = [];
        for (const entry of normalized) {
          const [previous] = await transaction`
            SELECT status FROM status_target_state
            WHERE target_type = ${entry.targetType} AND target_id = ${entry.targetId}
            FOR UPDATE
          `;
          await transaction`
            INSERT INTO status_target_state (
              target_type, target_id, name, status, detail, first_observed_at,
              status_changed_at, last_checked_at, check_count
            ) VALUES (
              ${entry.targetType}, ${entry.targetId}, ${entry.name}, ${entry.status}, ${entry.detail},
              NOW(), NOW(), NOW(), 1
            )
            ON CONFLICT (target_type, target_id) DO UPDATE SET
              name = EXCLUDED.name,
              status = EXCLUDED.status,
              detail = EXCLUDED.detail,
              status_changed_at = CASE
                WHEN status_target_state.status IS DISTINCT FROM EXCLUDED.status THEN NOW()
                ELSE status_target_state.status_changed_at
              END,
              last_checked_at = NOW(),
              check_count = status_target_state.check_count + 1
          `;
          await transaction`
            INSERT INTO status_sample (target_type, target_id, status)
            VALUES (${entry.targetType}, ${entry.targetId}, ${entry.status})
          `;
          if (!previous || previous.status !== entry.status) {
            await transaction`
              INSERT INTO status_event (target_type, target_id, name, status, previous_status, detail, observed_at)
              VALUES (${entry.targetType}, ${entry.targetId}, ${entry.name}, ${entry.status}, ${previous?.status ?? null}, ${entry.detail}, ${entry.observedAt})
            `;
            if (previous) transitions.push({ ...entry, observedAt: entry.observedAt.toISOString(), previousStatus: previous.status });
          }
        }
        return transitions;
      });
      statusWriteQueue = statusWriteQueue.then(write, write);
      return statusWriteQueue;
    },
    async statusHistory({ limit = 20 } = {}) {
      const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
      const [counts, events, targets, timeline] = await Promise.all([
        sql`
          SELECT status, COUNT(*)::INTEGER AS count
          FROM status_target_state
          WHERE last_checked_at >= NOW() - INTERVAL '10 minutes'
          GROUP BY status
        `,
        sql`
          SELECT target_type, target_id, name, status, previous_status, detail, observed_at
          FROM status_event
          ORDER BY observed_at DESC
          LIMIT ${safeLimit}
        `,
        sql`
          WITH availability AS (
            SELECT target_type, target_id,
                   ROUND(100 * AVG((status = 'up')::INTEGER) FILTER (WHERE observed_at >= NOW() - INTERVAL '24 hours'), 1) AS availability_24h,
                   ROUND(100 * AVG((status = 'up')::INTEGER), 1) AS availability_7d
            FROM status_sample
            WHERE observed_at >= NOW() - INTERVAL '7 days'
            GROUP BY target_type, target_id
          ), outages AS (
            SELECT target_type, target_id, MAX(observed_at) AS last_outage_at
            FROM status_event WHERE status = 'down'
            GROUP BY target_type, target_id
          )
          SELECT state.target_type, state.target_id, state.name, state.status, state.detail,
                 state.status_changed_at, state.last_checked_at,
                 availability.availability_24h, availability.availability_7d, outages.last_outage_at
          FROM status_target_state state
          LEFT JOIN availability USING (target_type, target_id)
          LEFT JOIN outages USING (target_type, target_id)
          ORDER BY state.name
        `,
        sql`
          SELECT target_type, target_id, date_trunc('hour', observed_at) AS bucket,
                 COUNT(*)::INTEGER AS total,
                 COUNT(*) FILTER (WHERE status = 'up')::INTEGER AS up
          FROM status_sample
          WHERE observed_at >= NOW() - INTERVAL '24 hours'
          GROUP BY target_type, target_id, bucket
          ORDER BY bucket
        `
      ]);
      const summary = { total: 0, up: 0, down: 0 };
      for (const row of counts) {
        summary[row.status] = row.count;
        summary.total += row.count;
      }
      return {
        summary,
        events: events.map((event) => ({
          targetType: event.target_type,
          targetId: event.target_id,
          name: event.name,
          status: event.status,
          previousStatus: event.previous_status,
          detail: event.detail,
          observedAt: event.observed_at.toISOString()
        })),
        targets: targets.map((target) => ({
          targetType: target.target_type,
          targetId: target.target_id,
          name: target.name,
          status: target.status,
          detail: target.detail,
          statusChangedAt: target.status_changed_at.toISOString(),
          lastCheckedAt: target.last_checked_at.toISOString(),
          availability24h: target.availability_24h === null ? null : Number(target.availability_24h),
          availability7d: target.availability_7d === null ? null : Number(target.availability_7d),
          lastOutageAt: target.last_outage_at?.toISOString() ?? null
        })),
        timeline: timeline.map((point) => ({
          targetType: point.target_type,
          targetId: point.target_id,
          bucket: point.bucket.toISOString(),
          total: point.total,
          up: point.up
        }))
      };
    },
    async pruneHistory() {
      const configured = Number.parseInt(process.env.STATUS_HISTORY_RETENTION_DAYS ?? "90", 10);
      const days = Number.isInteger(configured) && configured > 0 ? configured : 90;
      await Promise.all([
        sql`DELETE FROM status_event WHERE observed_at < NOW() - (${days} * INTERVAL '1 day')`,
        sql`DELETE FROM status_sample WHERE observed_at < NOW() - (${days} * INTERVAL '1 day')`,
        sql`DELETE FROM audit_event WHERE occurred_at < NOW() - (365 * INTERVAL '1 day')`,
        sql`DELETE FROM notification_outbox WHERE created_at < NOW() - (${days} * INTERVAL '1 day')`,
        sql`DELETE FROM login_attempt WHERE updated_at < NOW() - INTERVAL '1 day'`,
        sql`DELETE FROM maintenance_window WHERE ends_at < NOW() - INTERVAL '30 days'`
      ]);
    },
    async countUsers() {
      const [row] = await sql`SELECT COUNT(*)::INTEGER AS count FROM app_user`;
      return row.count;
    },
    async createInitialUser({ username, displayName, passwordHash }) {
      return sql.begin(async (transaction) => {
        await transaction`SELECT pg_advisory_xact_lock(193674)`;
        const [existing] = await transaction`SELECT COUNT(*)::INTEGER AS count FROM app_user`;
        if (existing.count > 0) return null;
        const [row] = await transaction`
          INSERT INTO app_user (username, display_name, password_hash, role)
          VALUES (${username}, ${displayName}, ${passwordHash}, 'admin')
          RETURNING id, username, display_name, role
        `;
        return { id: row.id, username: row.username, displayName: row.display_name, role: row.role };
      });
    },
    async createUser({ username, displayName, passwordHash, role = "viewer" }) {
      const [row] = await sql`
        INSERT INTO app_user (username, display_name, password_hash, role)
        VALUES (${username}, ${displayName}, ${passwordHash}, ${role})
        RETURNING id, username, display_name, role
      `;
      return { id: row.id, username: row.username, displayName: row.display_name, role: row.role };
    },
    async findUserByUsername(username) {
      const [row] = await sql`
        SELECT id, username, display_name, password_hash, role
        FROM app_user WHERE LOWER(username) = LOWER(${username}) AND active = TRUE
      `;
      return row ? { id: row.id, username: row.username, displayName: row.display_name, passwordHash: row.password_hash, role: row.role } : null;
    },
    async userExists(username) {
      const [row] = await sql`SELECT EXISTS(SELECT 1 FROM app_user WHERE LOWER(username) = LOWER(${username})) AS exists`;
      return row.exists;
    },
    async listUsers() {
      const rows = await sql`SELECT id, username, display_name, role, active, created_at FROM app_user ORDER BY username`;
      return rows.map((row) => ({
        id: row.id, username: row.username, displayName: row.display_name,
        role: row.role, active: row.active, createdAt: row.created_at.toISOString()
      }));
    },
    async updateUserPassword(userId, passwordHash) {
      await sql.begin(async (transaction) => {
        await transaction`UPDATE app_user SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${userId}`;
        await transaction`DELETE FROM user_session WHERE user_id = ${userId}`;
      });
    },
    async setUserActive(userId, active) {
      await sql.begin(async (transaction) => {
        await transaction`UPDATE app_user SET active = ${active}, updated_at = NOW() WHERE id = ${userId}`;
        if (!active) await transaction`DELETE FROM user_session WHERE user_id = ${userId}`;
      });
    },
    async createUserSession({ tokenHash, userId, expiresAt }) {
      await sql`
        INSERT INTO user_session (token_hash, user_id, expires_at)
        VALUES (${tokenHash}, ${userId}, ${expiresAt})
      `;
    },
    async findUserBySession(tokenHash) {
      const [row] = await sql`
        UPDATE user_session session
        SET last_seen_at = NOW()
        FROM app_user account
        WHERE session.token_hash = ${tokenHash}
          AND session.user_id = account.id
          AND session.expires_at > NOW()
          AND account.active = TRUE
        RETURNING account.id, account.username, account.display_name, account.role, session.expires_at
      `;
      if (!row) await sql`DELETE FROM user_session WHERE token_hash = ${tokenHash}`;
      return row ? {
        id: row.id, username: row.username, displayName: row.display_name,
        role: row.role, expiresAt: row.expires_at.toISOString()
      } : null;
    },
    async deleteUserSession(tokenHash) {
      await sql`DELETE FROM user_session WHERE token_hash = ${tokenHash}`;
    },
    async deleteExpiredUserSessions() {
      await sql`DELETE FROM user_session WHERE expires_at <= NOW()`;
    },
    async getUserPreferences(userId) {
      const [row] = await sql`SELECT preferences FROM user_preference WHERE user_id = ${userId}`;
      return row?.preferences ?? {};
    },
    async setUserPreferences(userId, preferences) {
      const [row] = await sql`
        INSERT INTO user_preference (user_id, preferences)
        VALUES (${userId}, ${sql.json(preferences)})
        ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = NOW()
        RETURNING preferences
      `;
      return row.preferences;
    },
    async getNotificationChannelStates(channelIds = []) {
      const requested = new Set(channelIds);
      const rows = await sql`SELECT channel_id, enabled FROM notification_channel_state`;
      return Object.fromEntries(rows
        .filter((row) => requested.size === 0 || requested.has(row.channel_id))
        .map((row) => [row.channel_id, row.enabled]));
    },
    async setNotificationChannelEnabled(channelId, enabled) {
      const [row] = await sql`
        INSERT INTO notification_channel_state (channel_id, enabled)
        VALUES (${channelId}, ${enabled})
        ON CONFLICT (channel_id) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()
        RETURNING channel_id, enabled
      `;
      return { channelId: row.channel_id, enabled: row.enabled };
    },
    async getLoginAttempt(attemptKey) {
      const [row] = await sql`
        SELECT failure_count, window_started_at, blocked_until
        FROM login_attempt WHERE attempt_key = ${attemptKey}
      `;
      if (!row) return null;
      return {
        failureCount: row.failure_count,
        windowStartedAt: row.window_started_at,
        blockedUntil: row.blocked_until
      };
    },
    async recordLoginFailure(attemptKey, { maximumAttempts = 5, windowMs = 900000 } = {}) {
      const now = new Date();
      const windowStart = new Date(now.getTime() - windowMs);
      const blockedUntil = new Date(now.getTime() + windowMs);
      const [row] = await sql`
        INSERT INTO login_attempt (attempt_key, failure_count, window_started_at, blocked_until, updated_at)
        VALUES (${attemptKey}, 1, ${now}, NULL, ${now})
        ON CONFLICT (attempt_key) DO UPDATE SET
          failure_count = CASE
            WHEN login_attempt.window_started_at < ${windowStart} THEN 1
            ELSE login_attempt.failure_count + 1
          END,
          window_started_at = CASE
            WHEN login_attempt.window_started_at < ${windowStart} THEN ${now}
            ELSE login_attempt.window_started_at
          END,
          blocked_until = CASE
            WHEN (CASE WHEN login_attempt.window_started_at < ${windowStart} THEN 1 ELSE login_attempt.failure_count + 1 END) >= ${maximumAttempts}
              THEN ${blockedUntil}
            ELSE NULL
          END,
          updated_at = ${now}
        RETURNING failure_count, blocked_until
      `;
      return {
        blocked: Boolean(row.blocked_until && row.blocked_until.getTime() > now.getTime()),
        retryAfterSeconds: row.blocked_until
          ? Math.max(1, Math.ceil((row.blocked_until.getTime() - now.getTime()) / 1000)) : 0
      };
    },
    async clearLoginAttempt(attemptKey) {
      await sql`DELETE FROM login_attempt WHERE attempt_key = ${attemptKey}`;
    },
    async recordAudit({ actor = "system", action, targetType = "", targetId = "", detail = {}, remoteAddress = "" }) {
      await sql`
        INSERT INTO audit_event (actor, action, target_type, target_id, detail, remote_address)
        VALUES (${String(actor).slice(0, 200)}, ${String(action).slice(0, 120)},
          ${String(targetType).slice(0, 80)}, ${String(targetId).slice(0, 240)},
          ${sql.json(detail)}, ${String(remoteAddress).slice(0, 120)})
      `;
    },
    async auditHistory({ limit = 100 } = {}) {
      const safeLimit = Math.min(500, Math.max(1, Number.parseInt(limit, 10) || 100));
      const rows = await sql`
        SELECT id, actor, action, target_type, target_id, detail, remote_address, occurred_at
        FROM audit_event ORDER BY occurred_at DESC LIMIT ${safeLimit}
      `;
      return rows.map((row) => ({
        id: row.id, actor: row.actor, action: row.action, targetType: row.target_type,
        targetId: row.target_id, detail: row.detail, remoteAddress: row.remote_address,
        occurredAt: row.occurred_at.toISOString()
      }));
    },
    async currentTargetStatuses(targetType, targetIds = []) {
      if (!targetIds.length) return {};
      const rows = await sql`
        SELECT target_id, status FROM status_target_state
        WHERE target_type = ${targetType} AND target_id IN ${sql(targetIds)}
      `;
      return Object.fromEntries(rows.map((row) => [row.target_id, row.status]));
    },
    async enqueueNotification({ dedupeKey, channelId, payload }) {
      const rows = await sql`
        INSERT INTO notification_outbox (dedupe_key, channel_id, payload)
        VALUES (${dedupeKey}, ${channelId}, ${sql.json(payload)})
        ON CONFLICT (dedupe_key) DO NOTHING RETURNING id
      `;
      return rows.length > 0;
    },
    async pendingNotifications({ limit = 20 } = {}) {
      const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
      const rows = await sql`
        SELECT id, channel_id, payload, attempts FROM notification_outbox
        WHERE state = 'pending' AND next_attempt_at <= NOW()
        ORDER BY created_at LIMIT ${safeLimit}
      `;
      return rows.map((row) => ({ id: row.id, channelId: row.channel_id, payload: row.payload, attempts: row.attempts }));
    },
    async cancelPendingNotifications(targetType, targetId, status = "down") {
      await sql`
        UPDATE notification_outbox SET state = 'cancelled', last_error = 'Cancelled after target recovery'
        WHERE state = 'pending'
          AND payload->'event'->>'targetType' = ${targetType}
          AND payload->'event'->>'targetId' = ${targetId}
          AND payload->'event'->>'status' = ${status}
      `;
    },
    async markNotificationDelivered(id) {
      await sql`
        UPDATE notification_outbox SET state = 'delivered', delivered_at = NOW(),
          attempts = attempts + 1, last_error = '' WHERE id = ${id}
      `;
    },
    async markNotificationCancelled(id, reason = "Channel unavailable") {
      await sql`
        UPDATE notification_outbox SET state = 'cancelled', last_error = ${String(reason).slice(0, 1000)}
        WHERE id = ${id}
      `;
    },
    async markNotificationFailed(id, error, { maximumAttempts = 6 } = {}) {
      const [row] = await sql`SELECT attempts FROM notification_outbox WHERE id = ${id}`;
      if (!row) return;
      const attempts = row.attempts + 1;
      const delaySeconds = Math.min(3600, 15 * (2 ** Math.min(attempts - 1, 8)));
      await sql`
        UPDATE notification_outbox SET
          state = ${attempts >= maximumAttempts ? "failed" : "pending"},
          attempts = ${attempts}, last_error = ${String(error).slice(0, 1000)},
          next_attempt_at = NOW() + (${delaySeconds} * INTERVAL '1 second')
        WHERE id = ${id}
      `;
    },
    async notificationHistory({ limit = 50 } = {}) {
      const safeLimit = Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 50));
      const rows = await sql`
        SELECT id, channel_id, payload, state, attempts, last_error, created_at, delivered_at
        FROM notification_outbox ORDER BY created_at DESC LIMIT ${safeLimit}
      `;
      return rows.map((row) => ({
        id: row.id, channelId: row.channel_id, event: row.payload?.event ?? {}, state: row.state,
        attempts: row.attempts, lastError: row.last_error, createdAt: row.created_at.toISOString(),
        deliveredAt: row.delivered_at?.toISOString() ?? null
      }));
    },
    async activeMaintenance(targetType, targetId, at = new Date()) {
      const [row] = await sql`
        SELECT EXISTS(SELECT 1 FROM maintenance_window
          WHERE target_type = ${targetType} AND target_id = ${targetId}
            AND starts_at <= ${at} AND ends_at > ${at}) AS active
      `;
      return row.active;
    },
    async listMaintenanceWindows({ activeOnly = false } = {}) {
      const rows = activeOnly
        ? await sql`SELECT * FROM maintenance_window WHERE ends_at > NOW() ORDER BY starts_at`
        : await sql`SELECT * FROM maintenance_window ORDER BY starts_at DESC LIMIT 200`;
      return rows.map((row) => ({
        id: row.id, targetType: row.target_type, targetId: row.target_id, reason: row.reason,
        startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString(),
        createdBy: row.created_by, createdAt: row.created_at.toISOString()
      }));
    },
    async createMaintenanceWindow({ targetType, targetId, reason = "", startsAt = new Date(), endsAt, createdBy }) {
      const [row] = await sql`
        INSERT INTO maintenance_window (target_type, target_id, reason, starts_at, ends_at, created_by)
        VALUES (${targetType}, ${targetId}, ${reason}, ${startsAt}, ${endsAt}, ${createdBy})
        RETURNING id
      `;
      return row.id;
    },
    async deleteMaintenanceWindow(id) {
      const rows = await sql`DELETE FROM maintenance_window WHERE id = ${id} RETURNING id`;
      return rows.length > 0;
    },
    async resetAdminAccount({ username, displayName, passwordHash }) {
      return sql.begin(async (transaction) => {
        const [row] = await transaction`
          INSERT INTO app_user (username, display_name, password_hash, role, active)
          VALUES (${username}, ${displayName}, ${passwordHash}, 'admin', TRUE)
          ON CONFLICT (username) DO UPDATE SET display_name = EXCLUDED.display_name,
            password_hash = EXCLUDED.password_hash, role = 'admin', active = TRUE, updated_at = NOW()
          RETURNING id, username
        `;
        await transaction`DELETE FROM user_session WHERE user_id = ${row.id}`;
        return row;
      });
    },
    async close() {
      await statusWriteQueue.catch(() => {});
      await sql.end({ timeout: 5 });
    }
  };
}
