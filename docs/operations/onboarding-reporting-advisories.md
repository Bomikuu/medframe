# Phase5 dependency and runtime inventory — October20,2026

Read-only inventory; package manifests/lockfiles and delivery/channel behavior
unchanged. Not a general production-security certification.

## Dependencies

npm audit:12 high dependency-tree entries,0 critical; all follow the same braces
advisory through development GraphQL codegen/Next ESLint/glob tooling. Production
scan with --omit=dev reports0 known advisories. npm suggests major backward moves
(codegen3.2.0/config14.2.35), not a compatible patch for the installed codegen7/
Next16 toolchain; no automatic audit fix/downgrade was applied.

Upstream [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
reviewedOctober2: affected braces<=3.0.3; no patched version listed when checked.
The advisory concerns stack exhaustion from deeply nested patterns. Developer
tooling exposure is distinct from an established application exploit. Do not
feed untrusted patterns into tooling; a supported upstream patch needs its own
minimal change/affected-flow checks. No speculative vendor patch in this phase.

Python production requirements exported from the locked uv project, audited once
with pip-audit --no-deps --disable-pip: no known vulnerabilities reported. Scanner
warns about lack of full hashes in exported requirements. No dependency install
inside the product environment; uvx runs its isolated scanner environment.
Raw inventory /tmp/medframe-phase5-{npm-audit,npm-production-audit,python-packages,
python-audit}.json; Python export/audit logs retained. An initial uv-run pip-list
probe failed because pip was absent; uv pip list --python uses the actual project
environment. Do not claim the failed command performed a scan.

## Separate runtime probes

Retained root API log contains redis.exceptions.TimeoutError in the Operations
WebSocket channel receive, and Django's sync-file/asynchronous-stream warning.
Bounded probe script scripts/review/probe_runtime_warnings.py uses a synthetic
26-byte BytesIO FileResponse; asynchronous consumption reproduces the exact
warning. This tests the mechanism, not the entire protected download path.

A separate RedisChannelLayer instance copies incumbent configuration with a
unique phase5-probe prefix and fresh channel, no production group/branch/socket.
An8-second bounded idle receive reproduces redis.exceptions.TimeoutError before
the outer deadline. No messages or clinical data are sent, no settings modified.
The original timeout and streaming behavior remain deferred; this phase does
not suppress warnings or change authority checks/reconnect behavior.

Evidence /tmp/medframe-phase5-runtime-probes.{jsonl,log}. Old log entries are
historical evidence, not a claim that the newly started runtime reproduced both
through complete browser workflows. Any repair should target one mechanism and
its affected authenticated path, without a blanket dependency upgrade.
