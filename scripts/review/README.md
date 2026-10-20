# Bounded workflow / financial review

This tooling uses the isolated synthetic review database only. It never imports
fixtures or sessions into `medframe_django`, changes existing passwords/MFA, sends
messages or moves money. A private, previously prepared `station-kiosk.json`
synthetic provider/branch base fixture is required in
`~/.local/share/medframe/ui-review/`. Do not commit that directory.

1. Run `prepare_workflow_finance.py` through `run_isolated.py` with the API uv
   environment and `PYTHONPATH=services/api`. Its database assertion runs before
   mutation. It creates fresh patients, revisions, service scenarios and scoped
   native staff/portal sessions, then writes current metadata with mode 0600.
2. Run the review API on port 8001 through the same wrapper and the built web app
   on 3001 with `BACKEND_URL=http://127.0.0.1:8001` and
   `WEB_ORIGIN=http://localhost:3001`. Do not run a review worker/scheduler.
3. `python3 scripts/review/build_workflow_run.py --output /tmp/workflow-review.js`
   creates a private callback from the current metadata. Use the installed
   Playwright CLI's `run-code` with this callback in an open local browser session.
   Each group gets a separate scoped context and reports independently. There are
   no hidden retries. `--groups name1,name2` restricts a permitted confirmation.
4. Run `python3 scripts/review/inspect_downloads.py` after the browser callback.
   It parses files saved from actual Download events, checks the selected exact
   clinical revision and excludes the unpublished amendment. Never inspect an
   attachment using `response.text()`. Remove prior output files before a fresh
   complete pass if reusing this tooling in a later phase.
5. Review the returned group results, page exceptions, responsive captures and
   printed PDF under ignored `output/playwright/improvements12/`. Record failures
   as harness errors, acceptance gaps or reproduced product defects. Preserve
   initial evidence when performing at most one narrow confirmation.

The financial long-history scenario has 24 native payments. Its oldest payment
is outside the first 20 displayed entries and remains independently selectable
for a refund. The test checks retained original amounts and current refund totals
on the confirmation. No live provider or physical printer is exercised.
