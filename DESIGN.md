---
name: Medframe Clinical Workspace
description: A restrained clinical workspace built for focused patient care.
colors:
  navy: "#0f2d4a"
  primary: "#087e7d"
  medical-teal: "#0ea5a4"
  soft-teal: "#22c1b6"
  background: "#f8fafc"
  surface: "#fcfdfe"
  muted: "#edf2f6"
  supporting-text: "#475569"
  border: "#d5dfe8"
  input-border: "#a4b5c5"
  danger: "#b4233b"
  dark-background: "#101e2c"
  dark-surface: "#152637"
  dark-text: "#e8f0f6"
  dark-supporting-text: "#acbfce"
typography:
  headline:
    fontFamily: "Inter Variable, Inter, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter Variable, Inter, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  label:
    fontFamily: "Inter Variable, Inter, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  control: "8px"
  panel: "12px"
spacing:
  compact: "8px"
  control-gap: "16px"
  form-gap: "24px"
  panel: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.control}"
    height: "44px"
  input:
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    height: "44px"
---

## Runtime and amendment status

The frontmatter and runtime mapping below describe the preserved implementation at `77bf229`. The user's Django Edition amendment changes the target defaults to white/light, slate text, navy actions, configurable organization/user tokens, and Lucide. Those runtime changes have not yet been implemented. Follow `docs/superpowers/specs/2026-10-18-medframe-django-amendment.md` and the integrated Batch 1 plan; update the token map/sidecar together with actual CSS and components during implementation, rather than claiming target tokens are already live.

## Overview

**Creative North Star: "A focused clinical desk"**

Medframe gives clinicians a quiet, legible work surface. Patient context and the current task will carry future screens; this foundation establishes familiar authentication and organization access. The supplied navy, teal, and Inter identity is preserved. Expression lives in precise type, restrained color, consistent controls, and careful state feedback.

**Key Characteristics:** a single workhorse sans, cool neutral surfaces, a sparingly used teal action color, clear section spacing, and flat panels with subtle borders. The app is an Operate surface, not a marketing landing page. The approved medical symbol remains pending; the text name identifies the app.

## Colors

The frontmatter mirrors the canonical CSS variables in `apps/web/app/globals.css` (runtime ownership model B). The path is CSS primitives -> semantic custom properties -> Tailwind `@theme inline` -> shared shadcn/Radix components. No separate JavaScript theme duplicates values.

Navy is the light-theme foreground. The supplied medical/soft teals remain brand primitives. A deeper teal is the small-text action background in light mode so the label has sufficient contrast. Dark mode uses soft teal actions on navy foreground, with slate-blue surfaces and pale supporting text. Semantic danger is separate from branding. System preference controls one consistent theme across routes.

**The Context Rule.** Use color to convey action, selection, focus, or a semantic state, not to decorate every region.

## Typography

Inter Variable is self-hosted through Fontsource. The same family serves headings, labels, navigation, and body text. The authentication context heading uses a larger 40/48px scale only on desktop; clinical pages use the headline token. OTP/recovery values use a monospace presentation for transcription, not as a general visual motif. Prose remains comfortably bounded and controls never use all-caps decoration.

## Layout

The sign-in surface pairs a muted clinic-access explanation with a bounded 448px form; below 1024px the context pane drops out and the form remains primary. The clinic uses a 264px desktop sidebar and a flexible main area capped at 1152px; mobile places organization and navigation in document flow. Forms use 24px vertical gaps and visible labels. Short codes use a compact input; email/password controls take their form width. Later patient forms group identity/contact/medical content and size fields for expected input.

## Elevation & Depth

Surfaces are flat at rest. Subtle borders distinguish organization context, panels, and form controls. The Radix select uses a small popup shadow to communicate an actual overlay. Do not build nested card stacks or glow effects. State transitions are short and reduced-motion preference suppresses them.

## Shapes

Controls use gently rounded corners from the control token. Panels use the panel radius. Avatar/profile upload previews use circles only when that real upload feature is introduced. Medical photographs, X-rays, and document previews retain complete framing and aspect ratio.

## Components

### Buttons

The shared Button owns primary, outline, secondary, ghost, destructive, and link variants. Primary form actions have a 44px height, a non-wrapping label, a clear busy label, and disabled duplicate submission. Visible focus is a teal outline/ring. Icon buttons have accessible labels. The same action retains its wording across screens.

### Inputs / Fields

The shared Input and FormField own 44px controls, labels above, hints/errors below, border/focus states, and semantic types. PasswordInput adds a show/hide action. Forms disable native validation bubbles and use associated inline errors. Passwords remain masked by default and support paste/password managers.

### Navigation

Clinical navigation uses a muted teal selection with an icon and text. The organization chooser uses the shared Radix Select, rendered through a portal, with keyboard selection and focus restoration. The header contains context, staff identity, and sign-out. No later module is presented as a functioning navigation target.

### Cards / Containers

The organization panel groups real authorized organization/branch information. Loading skeletons match its proportions. Empty and denied states explain how to recover; no fake patient counts fill missing functionality.

## Do's and Don'ts

### Do:

- **Do** preserve the approved Inter, navy, and teal identity and semantic token mapping.
- **Do** prioritize the clinician's task and keep readable, focused components.
- **Do** verify light/dark, keyboard, failure, and mobile states with real API data.

### Don't:

- **Don't** invent a substitute medical symbol or unverified product/compliance claims.
- **Don't** expose fake working controls or patient metrics for modules not yet implemented.
- **Don't** crop clinical imagery into profile-avatar shapes.

## Patient surfaces

Patient management inherits the existing Operate world. The directory uses a compact search toolbar and a read-oriented table with stacked mobile rows. Registration uses a bounded, naturally scrolling form with separated identity, contact, emergency-contact, and guardian fieldsets; short date/sex/phone controls do not stretch to the full content width. The patient overview keeps identity and reference visible before demographics, medical history, and authorized access management. Medical records use flat sections and a chronological event list rather than nested cards. Shared loading/error/status and confirmation owners are recorded in UX-CONTRACT.md.

## Approved Django Batch 1 visual target

The established clinical Operate language remains: readable Inter, restrained borders, clear groups, type-appropriate inputs, accessible state feedback, and focused records. The approved amendment makes white the dominant page/sidebar/header/card background, with slate text and navy primary actions; muted `#F8FAFC` is a secondary surface rather than the entire dashboard. Default mode is light, independent of the operating system. Dark and system modes are saved explicit options.

One effective-theme resolver combines platform defaults, validated organization branding, and allowed user preferences. Appearance, font/radius/component/density presets, sidebar/header layout, and known dashboard widget order/sizes persist and preview without a reload. Organization administrators own clinic branding; personal preferences cannot override record permissions. Logo/profile controls become active only with the real protected asset pipeline. Lucide replaces the prior icon family coherently through a shared owner.
