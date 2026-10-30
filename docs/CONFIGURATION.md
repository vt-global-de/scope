# Inventory configuration

Scope uses one YAML inventory with `version: 1`. The canonical example is `config/inventory.yaml`; `config/inventory.schema.json` provides editor completion and structural validation.

For VS Code or a compatible YAML language server, keep this first line in the inventory:

```yaml
# yaml-language-server: $schema=./inventory.schema.json
```

Validate a file before deployment:

```sh
npm run config:check -- /path/to/inventory.yaml
```

Stable IDs are part of the configuration contract. Do not change group, category, service or server IDs merely to rename their visible labels, because IDs connect dependencies, status history and personal layouts.

The version 1 schema remains backward compatible throughout Scope 1.x. Removed or renamed fields require a new inventory version and an explicit migration guide.
