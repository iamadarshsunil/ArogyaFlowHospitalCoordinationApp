# ArogyaFlow

Interactive hackathon prototype for coordinated OPD queues, emergency pre-arrival preparation, accessibility assistance, and indoor hospital navigation.

## Run

```bash
pnpm install
pnpm dev
```

Production check: `pnpm build`

## Demo roles and workflows

- **Patient & family:** create an OPD booking, receive a reference/QR token, follow the computed queue, submit an emergency pre-arrival alert, request assistance, and view floor-wise directions.
- **Hospital operations:** manage the shared OPD queue, look up/check in a booking, register a walk-in, call patients, and manage emergency acknowledgement, assignment, preparation, arrival, and handover.
- **Facilities & assistance:** assign assistance requests and edit department floors, rooms, landmarks, and lift/route status.

Use **Reset demo** to restore the synthetic seed data. Changes persist in `localStorage` and sync between same-browser tabs using browser storage events.

## Architecture

- React + TypeScript + Vite + Tailwind CSS
- React Router for connected role routes
- Reducer/context store with a single normalized demo state
- `localStorage` persistence
- `qrcode.react` for booking-reference-only QR codes
- Lucide icons

## Important limitations

This is a front-end demonstration, not a deployed or approved hospital system. All people and records are synthetic. Payments, emergency alerts, staff actions, and notifications are simulated and contact no real service or hospital. QR camera scanning uses a manual reference fallback. Browser storage is not an authoritative database, and cross-device real-time synchronization, authentication, clinical triage, hospital APIs, WhatsApp delivery, audit logs, and production security require a validated backend and formal hospital integration.
