---
name: steward
description: PR posture for this repo — push only converged updates, and watch by event, never by timer.
---

# PR stewardship

Watch PRs by event, never by timer. Subscribe to PR activity, then end the turn — ending the turn *is* how you wait, and CI failures, review comments, and merge conflicts wake the session on their own. Act on each event when it arrives.

Never arm a scheduled check-in to re-poll a PR: no `send_later` (denied in `.claude/settings.json`), no `create_trigger` Routine, no `/loop`, no foreground `sleep`. A tick that finds nothing changed costs a full context window, once per open PR. If events dry up, say so rather than arming a timer.

## Pushing to a PR

Every push reruns CI and redeploys staging; once the PR is ready, it also buys a full Copilot review. Push only converged updates: review the whole diff until a pass finds nothing, pass every CI check that can run locally, and send one push per round of findings (CI resolved, staging verified, and once ready, Copilot's review posted), never one per fix. Open new PRs as drafts, verify on staging where there is one, then mark ready.

Fix every real finding whatever round it arrives in; decline only on the merits, with a reason on the thread. Treat each finding as a miss: sweep the diff for its class. If rounds keep coming, step back (split the PR, or rethink the approach) instead of patching again. Merge the base in only for a conflict, a branch rule that requires it, or a change that needs the current base.
