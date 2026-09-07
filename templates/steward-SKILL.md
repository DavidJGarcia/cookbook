---
name: steward
description: PR watching posture for this repo — event-driven only, never arm scheduled check-ins.
---

# PR stewardship

Watch PRs by event, never by timer. Subscribe to PR activity, then end the turn — ending the turn *is* how you wait, and CI failures, review comments, and merge conflicts wake the session on their own. Act on each event when it arrives.

Never arm a scheduled check-in to re-poll a PR: no `send_later` (denied in `.claude/settings.json`), no `create_trigger` Routine, no `/loop`, no foreground `sleep`. A tick that finds nothing changed costs a full context window, once per open PR. If events dry up, say so rather than arming a timer.
