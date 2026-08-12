# Stable workflow contract

This document records the production workflow frozen by the `stable-v1-workflow` checkpoint. Changes to shared navigation, authentication, tables, modals, drawers, storage, or consultation components must run `npm run test:regression`, lint, typecheck, Next build, and OpenNext build before deployment.

## Route roles

- `/consultations/[id]`: integrated customer workflow detail.
- `/consultations/[id]/checklist`: read-only rendering of the submitted checklist payload.
- `/consultations/[id]/session`: internal in-person consultation review, checks, and notes.
- `/api/consultations/[id]/files/[fileId]/open`: workspace-scoped Drive file opening, including the archived checklist PDF.
- `/c/[shortCode]`: real public Workspace checklist; `/consult/demo` is isolated demo UI.

These destinations must stay distinct. Search all `Link`, `router.push`, and click handlers before changing any of them.

## Authorization roles

- MEMBER: ordinary Workspace work and personal profile settings.
- OWNER: MEMBER work plus team management and `/analytics`.
- SUPER ADMIN: independent platform privilege, currently identified by the immutable server-side SUPER ADMIN check; only this privilege grants `/admin`.

`/settings/team`, `/analytics`, and `/admin` enforce their corresponding role server-side. Display job titles never grant a role. Every consultation and file lookup must include the active `workspace_id`.

## Data ownership

- D1 is the source of truth for structured workflow data.
- Google Drive stores PDFs, images, quote documents, and other binary files.
- Google Sheets is a mirror, not the source of truth.
- `form_payload_json` is immutable customer-submitted source data.
- Consultation-session checks and notes use separate review tables.
- Binary files and Google tokens must not be stored as ordinary D1 workflow values or exposed to browsers.
- Existing Drive folder names and applied migration files are compatibility contracts and must not be renamed or rewritten.
- Cloudflare deployment keeps existing variables and secrets with `keep_vars`.

## Demo isolation

`/demo` and `/consult/demo` use demo-mode components and local fixture data. They must not call production submission APIs, create D1 consultations, create Drive resources, or append Sheets rows.

## Change procedure

1. Confirm the stable behavior and enumerate consumers of affected shared components.
2. Identify affected routes, APIs, permissions, and persistence.
3. Make the smallest scoped change.
4. Run regression checks and builds.
5. Deploy with the existing keep-vars policy and verify production smoke responses.
