# Issue board

This is the ZD-01–ZD-30 status and dependency snapshot for `main`, not a
completion report for work on unmerged branches. Only ZD-01 is Done because
its scaffold PR is merged into `main`. ZD-03, ZD-04, and ZD-22 have closed,
unmerged feature PRs and remain Backlog. All other issues also remain Backlog
until their work is merged into `main`.

| Issue | Title | Status on `main` | Dependencies |
| --- | --- | --- | --- |
| ZD-01 | Skeleton, shared contract and repo rules | Done | — |
| ZD-02 | Web Worker bridge and integration | Backlog | ZD-01, ZD-08, ZD-12, ZD-14 |
| ZD-03 | PWA offline shell and Content Security Policy | Backlog | ZD-01 |
| ZD-04 | Encrypted storage helper | Backlog | ZD-01 |
| ZD-05 | Security pass | Backlog | — |
| ZD-06 | Deployment and release | Backlog | ZD-03, ZD-05 |
| ZD-07 | Design tokens, wireframes and Home screen | Backlog | ZD-01 |
| ZD-08 | Message check screen and result card | Backlog | ZD-07, ZD-02 |
| ZD-09 | Payment check screen | Backlog | ZD-07, ZD-18, ZD-19 |
| ZD-10 | Language selector and i18n wiring | Backlog | ZD-07, ZD-22 |
| ZD-11 | Accessibility pass | Backlog | ZD-08, ZD-09, ZD-10 |
| ZD-12 | Matching framework and English signals | Backlog | ZD-01, ZD-22 |
| ZD-13 | Link analysis | Backlog | ZD-12 |
| ZD-14 | Scoring, bands, overrides and scam type | Backlog | ZD-01 |
| ZD-15 | Multilingual lexicons integration | Backlog | ZD-12, ZD-24 |
| ZD-16 | Tuning, false-positive reduction and test hardening | Backlog | ZD-12–ZD-15, ZD-26 |
| ZD-17 | Transaction model, helpers and seed data | Backlog | ZD-01 |
| ZD-18 | Transaction rules v1 | Backlog | ZD-14, ZD-17 |
| ZD-19 | Cross-signal: message to payment | Backlog | ZD-18, ZD-08 |
| ZD-20 | Encrypted persistence | Backlog | ZD-04, ZD-17 |
| ZD-21 | Demo scenario and threshold tuning | Backlog | ZD-22 |
| ZD-22 | Key sheet and English strings | Backlog | — |
| ZD-23 | Six-language translation and review | Backlog | ZD-22 |
| ZD-24 | Seed lexicons per language | Backlog | ZD-22 |
| ZD-25 | Plain-language and fit review / optional scam library | Backlog | ZD-23 |
| ZD-26 | Test suite and bug board | Backlog | ZD-01 |
| ZD-27 | Checkpoint QA rounds | Backlog | ZD-26 |
| ZD-28 | Demo script, data and rehearsals | Backlog | ZD-21, ZD-27 |
| ZD-29 | Slides and competitor slide | Backlog | ZD-23, ZD-28 |
| ZD-30 | README, EXPLAIN.md and submission | Backlog | ZD-01–ZD-29 |

Case fixtures are invented test data. Fixture schema validation exists, but
the engine and application UI are still scaffold work, so detection behavior
and manual phone testing are TODO and no case or QA round is reported as
complete.
