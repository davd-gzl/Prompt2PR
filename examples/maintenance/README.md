# Maintenance Examples

Workflows that handle routine cleanup and housekeeping tasks. Run these on a
schedule to keep your codebase tidy without manual intervention.

## Workflows

### improve-logging.yml

Replaces `console.log` with structured logging: appropriate log levels (debug,
info, warn, error), contextual information (function name, IDs), and stack
traces on errors. Does not change application logic.

**Trigger:** Manual dispatch

### cleanup-todos.yml

Finds todo, FIXME, HACK, and XXX comments in source code. Reads the surrounding
code to judge whether each one has been addressed. Removes resolved comments and
leaves unresolved ones in place. Note: the LLM cannot check your issue tracker.

**Trigger:** Weekly cron (Friday) + manual dispatch

### fix-dead-links.yml

Scans Markdown files for broken or dead links (HTTP 404, 410, or unreachable
URLs). For each broken link, either updates it to the correct URL or removes it
with a note. Internet access depends on the model — some can verify URLs live,
others rely on pattern recognition and training knowledge.

**Trigger:** Weekly cron (Monday) + manual dispatch
