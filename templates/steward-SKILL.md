---
name: steward
description: How agents watch pull requests in this repo — subscribe to PR activity and act on events as they arrive, never arm scheduled self check-ins.
---

# PR stewardship

Watching a PR here is **event-driven only**.

## Subscribe, then end the turn

After opening a PR, subscribe to its activity and end the turn. Ending the turn *is* how you wait — a CI failure, a review comment, or a merge-conflict notice wakes the session on its own. Never poll in the foreground with `sleep` or repeated status checks either.

## Never arm check-ins

Do **not** schedule a self check-in, wake-up, reminder, or recurring Routine to re-poll a PR: no `send_later`, no `create_trigger`, no `/loop`, no background watchdog. A timed re-check that finds nothing changed spends a whole context window to produce no work, and it repeats for every open PR. This repo would rather hear about a stalled PR late than pay that on a timer.

`send_later` is denied outright in `.claude/settings.json`, so the means is gone; the other mechanisms are off-limits by the same rule.

If an event never arrives and a PR goes quiet, the human pokes the session. That is the accepted trade — say so plainly in your last message rather than arming a timer to cover it.

## What you still owe a PR you opened

Dropping check-ins does not mean dropping the PR. On every event that *does* arrive, act on it before ending the turn:

- **Red CI** — root-cause and push a fix, or say once why the failure is not this PR's.
- **Merge conflict** — merge the base branch in, resolve, re-validate, push.
- **Review comments** — implement small, in-scope asks and push; reply on the rest.

That work happens when an event wakes you, not on a schedule.
