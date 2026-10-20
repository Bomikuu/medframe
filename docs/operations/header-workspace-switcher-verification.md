# Header clinic and branch selector — October20,2026

Active locally on codex/header-workspace-switcher, implementation2774b59,
artifact .next-header-workspace. Baseline582d5ad and
checkpoint/pre-header-workspace-2026-10-20, plus .next-patient-overview retained.
Native implementation/review; no agents or separate chats.

## Delivered contract

Removed the sidebar OrganizationSwitcher from ClinicFrame. The header Account
menu now has Clinic & branches, opening the shared shadcn/Radix Dialog. The modal
stages an authorized clinic choice with canonical FormSelect, shows current
permitted branch names, and uses Cancel/Done/Switch clinic. Escape/Cancel leave
context unchanged and focus returns to the Account menu trigger. Dropdown focus
handoff suppresses its competing autofocus only while opening the modal.

Source inspection established that the former sidebar control selected an
organization, with informational branch names; it did not select a global branch.
That fact was explicitly explained during implementation. The new modal preserves
that behavior and labels the branch list accordingly, directing branch filtering
to its existing page owners. It does not create an effective global branch filter,
expand permissions or pretend that a branch was selected. Switching still calls
WorkspaceProvider.switchOrganization, invokes SafetyProvider.guard and returns
to the selected clinic's patient directory. Current query/permission owners,
branding, authentication and clinical data remain unchanged. The preserved former
OrganizationSwitcher module is no longer mounted by the clinic shell.

The existing user-owned main layout block remains byte-identical. Authorized
header/sidebar changes were staged using a separate index blob with the original
committed main block; the width edit stays unstaged. Its diff hunk line offsets
changed because the authorized header grew; original/current patches are both
saved privately. No unrelated source cleanup or user-edit commit.

## Tools and scope

Impeccable incumbent Operate context and craft-floor plus upstream frontend-design
and Frontend Design Premium product/admin canonical ownership and resilience
contracts were applied. Existing PRODUCT/DESIGN/UX-CONTRACT and frontend AGENTS
remain authoritative. No world/theme/font replacement, generated images, dependency
upgrade or generic project-wide audit. Shared owner mapping: Dialog/DropdownMenu,
FormSelect, WorkspaceProvider, SafetyProvider, existing tokens/locale provider.
UX-CONTRACT and .impeccable/surfaces/workspace-switcher.md record the interaction.

Graphify first queried the existing frontend-patient-overview graph with
ClinicFrame OrganizationSwitcher switchOrganization, budget900:186 reached,
34 shown,152 truncated. Actual source was inspected. Refreshed deterministic AST
graph frontend-header-workspace:390 TS/TSX files,1922 nodes,9010 directed edges,
48 communities, zero external extraction tokens. app/features/components/lib only;
generated GraphQL, tests/scripts/docs/assets/private data and proxy.ts excluded.
Known partial station-entry.tsx line150 and symbol-free icons module remain.
Explain ClinicSwitcherDialog reports14 extracted connections including ClinicFrame,
useWorkspace, FormSelect and canonical Dialog owners. Backend not refreshed because
no backend source changed. Graph connections are not runtime/authorization proof.

Jev0.7.0 key availability established earlier, never printed. Two sanitized generic
engineering-only choice calls, modeljev-1.13.0: move_existing at1.0 confidence,
400 input/34 output tokens; preserve_guard at1.0,414/38. No patient information,
private fixtures, credentials or attachments submitted. These informed scope and
bounded priorities, not evidence of correctness. Local outputs:
/tmp/medframe-header-workspace-jev.json and
/tmp/medframe-header-workspace-review-jev.json.

## Bounded verification

Production build/TypeScript pass, BUILD_ID Dlv6ZDBYZ6dBFjdop23aK.
Scoped ESLint for shell/dialog:0 errors,1 unused theme binding warning, deferred
as HEADER-WORKSPACE-001 in error-log.md. Authored supported changes formatted with
Prettier; the user-owned main layout block restored verbatim after formatting.
No new backend tests, migrations or broad suite. No repairs or second browser run.

One isolated synthetic browser run passes all three groups:

- Modal opens from account menu; sidebar selector absent;1440/1024/390 viewport
  bounds, current branch list, Escape focus return and Cancel preservation pass.
- Authorized second clinic selection returns to its patient directory; reopening
  shows its actual permitted branch; Done preserves context.
- Unsaved history entries trigger the existing prompt on clinic switch. Keep
  editing retains original clinic and text; Discard changes permits navigation.

No page exceptions. Review fixture adds a synthetic second-clinic receptionist
membership to an existing synthetic actor in the isolated review database only;
no original credentials/MFA/roles altered, no patient writes, fixture import or
external delivery. Logs /tmp/medframe-header-workspace-{build,lint,browser}.log;
three captures under output/playwright/header-workspace/. Existing unrelated
favicon404 is not repaired. This does not claim every role, stale-membership,
dark theme, large organization list or short landscape device was browser tested.
Older patient-profile/Station/editor/other deferred findings remain out of scope.

## Preservation and runtime

Root services stopped for the checkpoint window. Fresh encrypted checkpoint,
verified Git bundle, private configuration and isolated restored database:
/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261020-144849-2774b59;
clone medframe_django_header_workspace_activation_20261020,154 tables verified.
Every6600 original row across154 tables matches capture/check fingerprints before
traffic resumes. Manifest private:
/home/micxsz/.local/share/medframe/checkpoints/header-workspace-original-fingerprints-20261020.json.
No schema changes; manage.py migrate --check passes. Independent encrypted storage
checkpoint/isolated bucket restore verifies51 original objects, originals not
written: private header-workspace-storage-20261020 directory and
medframe-review-header-workspace-preservation-20261020 bucket. No clone restored
over original, database reset or password/MFA changes. Original/current user layout
patches retained0600 in checkpoint directory.

Activated with ./medframe start --production --dist-dir .next-header-workspace:
web3000 PID2799652, API8000 PID2799516, worker2799650, scheduler2799651;
original medframe_django. web.json confirms artifact; login3000 and API readiness
both HTTP200. This is service-health confirmation, not an additional original-user
logged-in test. Review listeners8001/3001 stopped and browser closed after evidence.
No push, public deployment, live messages/payments or AI integration. UI/source
rollback artifacts are preserved; switching them never implies database restore.
