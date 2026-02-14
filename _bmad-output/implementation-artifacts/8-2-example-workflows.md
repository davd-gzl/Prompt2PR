# Story 8.2: Example Workflows

**Status:** complete

## Story

5 ready-to-use workflow files for common maintenance tasks.

## Implementation

### Example Files

| File                            | Purpose                                 |
| ------------------------------- | --------------------------------------- |
| `examples/fix-dead-links.yml`   | Detect and fix broken links in markdown |
| `examples/update-copyright.yml` | Update copyright year                   |
| `examples/sync-readme.yml`      | Sync README with code                   |
| `examples/scan-secrets.yml`     | Scan for committed secrets              |
| `examples/cleanup-todos.yml`    | Clean up resolved TODO comments         |

### Common Structure

Each example includes:

- `schedule` trigger (cron) + `workflow_dispatch` (manual)
- Appropriate `permissions` block
- Inline comments explaining configuration
- Appropriate `paths` scoping for the task

### Design Goals

Users can copy any example, adjust the cron schedule and paths, and have a
working maintenance workflow immediately.

## File List

| File                            | Status |
| ------------------------------- | ------ |
| `examples/fix-dead-links.yml`   | new    |
| `examples/update-copyright.yml` | new    |
| `examples/sync-readme.yml`      | new    |
| `examples/scan-secrets.yml`     | new    |
| `examples/cleanup-todos.yml`    | new    |

## Requirements Traced

- FR: Example workflows for common use cases
