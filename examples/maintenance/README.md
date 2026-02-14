# Maintenance Examples

Workflows that handle routine cleanup and housekeeping tasks. Run these on a
schedule to keep your codebase tidy without manual intervention.

## Workflows

### cleanup-todos.yml

Finds TODO, FIXME, HACK, and XXX comments in source code. Determines whether
each one has been resolved by the surrounding code. Removes resolved comments
and leaves unresolved ones in place.

**Trigger:** Weekly cron (Friday) + manual dispatch

### improve-logging.yml

Replaces `console.log` with structured logging: appropriate log levels (debug,
info, warn, error), contextual information (function name, IDs), and stack
traces on errors. Does not change application logic.

**Trigger:** Manual dispatch

### fix-dead-links.yml

Scans markdown files for broken or dead links (404, 410, unreachable). Updates
broken links to the correct URL or removes them with a note.

**Trigger:** Weekly cron (Monday) + manual dispatch
