# ZD-27 checkpoint QA log

**Status: BLOCKED pending human-run QA.** The required checks need a deployed
preview and human-operated phones; they were not performed in this automated
session. No checkpoint below is passed.

## Procedure and acceptance criteria

Run the full manual script against the deployed preview on a real phone. Record
English at H6 and H12; starting at H12, also record two additional languages
at each checkpoint. Use an older/low-end phone as well when available. At H12
and H18, repeat the required cases with airplane mode enabled and record which
cases were exercised offline. Log bugs with severity, owner, and ETA, then
triage ownership and ETAs at stand-up.

At H18, the checkpoint is acceptable only when there are no blockers and all
major bugs are fixed or explicitly documented as known limitations. Record
evidence and reviewer details; do not mark a checkpoint passed without a human
run and review.

The requested procedure references `tests/fixtures/cases.json` and the phone
manual script. Neither exists in this branch, so this log does not reproduce
or invent case IDs or steps. Locate and follow the authoritative case list and
script before running QA; the automated unit tests are not a substitute for
the manual acceptance run. The README also notes that this branch has no
deployed service, complete user flow, or implemented offline mode.

## Checkpoint records

For each checkpoint, replace the not-run status only after the human-run
checks are complete. Duplicate the record fields as needed for each device,
locale, or network condition.

### H6

**Checkpoint status: NOT RUN - requires deployed preview and human-operated phones**

| Field | Record |
| --- | --- |
| Time (include timezone) | |
| Preview URL | |
| Device / OS (identify older/low-end device if used) | |
| Locale | English |
| Case IDs | |
| Network / offline condition | Online |
| Results / evidence | |
| Bug IDs, severity, owner, ETA | |
| Blocker status | |
| Major bug status / known limitations | |
| Stand-up triage notes | |
| Reviewer | |

### H12

**Checkpoint status: NOT RUN - requires deployed preview and human-operated phones**

Create records for English and two additional languages, and for the required
online and airplane-mode runs.

| Field | Record |
| --- | --- |
| Time (include timezone) | |
| Preview URL | |
| Device / OS (identify older/low-end device if used) | |
| Locale | English / additional language 1 / additional language 2 |
| Case IDs | |
| Network / offline condition (include airplane-mode confirmation) | |
| Results / evidence | |
| Bug IDs, severity, owner, ETA | |
| Blocker status | |
| Major bug status / known limitations | |
| Stand-up triage notes | |
| Reviewer | |

### H18

**Checkpoint status: NOT RUN - requires deployed preview and human-operated phones**

Re-run English and the two additional languages, including airplane-mode
checks, and record final blocker and major-bug disposition.

| Field | Record |
| --- | --- |
| Time (include timezone) | |
| Preview URL | |
| Device / OS (identify older/low-end device if used) | |
| Locale | English / additional language 1 / additional language 2 |
| Case IDs | |
| Network / offline condition (include airplane-mode confirmation) | |
| Results / evidence | |
| Bug IDs, severity, owner, ETA | |
| Blocker status (must be none to accept H18) | |
| Major bug status (fixed or known limitation) | |
| Stand-up triage notes | |
| Reviewer | |
