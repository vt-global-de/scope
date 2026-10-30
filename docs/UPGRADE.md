# Upgrade and recovery

## Before upgrading

1. Pin the currently running image tag.
2. Back up PostgreSQL with `scripts/backup.sh` or an equivalent `pg_dump --format=custom` command.
3. Save the YAML inventory and deployment secrets separately.
4. Validate the inventory with `npm run config:check -- /path/to/inventory.yaml`.

The scripts require PostgreSQL client tools. With the supplied Compose stack, a dump can instead be streamed from its PostgreSQL container:

```sh
docker compose exec -T postgres pg_dump -U scope -d scope --format=custom --no-owner > scope.dump
```

## Upgrade

Scope applies forward-only, transactional database migrations before accepting traffic. Pull the new image, recreate the application container and watch its logs. `/livez` indicates a running process; `/readyz` succeeds only after inventory validation and a PostgreSQL health check.

Never roll an older Scope image back against a database that has already been migrated unless the release notes explicitly permit it. Restore the pre-upgrade database dump for a full rollback.

## Restore

Stop Scope, restore the dump with `scripts/restore.sh backup.dump`, then start the intended Scope version. Test login, status history, remote access and a notification before deleting the previous volume or backup.

For the supplied Compose stack:

```sh
docker compose stop scope
docker compose exec -T postgres pg_restore -U scope -d scope --clean --if-exists --no-owner --exit-on-error < scope.dump
docker compose start scope
```

## Administrator recovery

Run the recovery command inside a one-off Scope container with `DATABASE_URL`, `SCOPE_RECOVERY_USERNAME`, `SCOPE_RECOVERY_DISPLAY_NAME` and `SCOPE_RECOVERY_PASSWORD` set:

```sh
npm run admin:recover
```

The account is activated, promoted to administrator, assigned the supplied password and all of its existing sessions are revoked. Remove `SCOPE_RECOVERY_PASSWORD` immediately after the command.
