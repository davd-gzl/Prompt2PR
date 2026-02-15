# Maintenance Examples

Workflows that handle routine cleanup and housekeeping tasks. Run these on a
schedule to keep your codebase tidy without manual intervention.

## Workflows

### cleanup-todos.yml

Finds TODO, FIXME, HACK, and XXX comments in source code. Reads the surrounding
code to judge whether each one has been addressed. Removes resolved comments and
leaves unresolved ones in place. Note: the LLM cannot check your issue tracker.

**Trigger:** Weekly cron (Friday) + manual dispatch

### improve-logging.yml

Replaces `console.log` with structured logging: appropriate log levels (debug,
info, warn, error), contextual information (function name, IDs), and stack
traces on errors. Does not change application logic.

**Trigger:** Manual dispatch

### fix-dead-links.yml

Scans markdown files for links that are likely broken: malformed URLs,
known-dead domains, relative links that don't match repository files, and
outdated versioned documentation URLs. Note: the LLM cannot make live HTTP
requests — it relies on pattern recognition and training knowledge.

**Trigger:** Weekly cron (Monday) + manual dispatch
