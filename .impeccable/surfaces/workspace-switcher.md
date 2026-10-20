# Header workspace switcher

Mode: Operate. Keep the existing white/navy/teal shell, typography and shared
shadcn/Radix controls. The account menu owns Clinic & branches. Remove the former
sidebar organization selector; maintain breadcrumbs and existing navigation.

The modal stages authorized clinic selection, lists only the current clinic's
permitted branches and applies through WorkspaceProvider.switchOrganization.
Branch lists are informational: existing operations/finance pages retain their
branch-filter owners. Cancel/Escape leave the active clinic unchanged; closing
returns focus to the account menu. Changing clinics returns to Patients through
the existing unsaved-change guard. No new global branch context or authorization.

One bounded browser round passes responsive/focus, authorized switching and
Keep editing/Discard groups. Existing semantic tokens, Dialog, FormSelect and
SafetyProvider remain authoritative. See the header-workspace verification record.
