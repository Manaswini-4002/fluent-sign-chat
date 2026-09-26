# SignBridge AI

Two-way communication between a sign-language user and a speaking user, running in the browser.

## What is actually implemented (and what is not)

| Feature | Reality |
| --- | --- |
| Sign recognition | Real MediaPipe Hands landmark detection (21 points/hand) + a **geometric rule classifier** with temporal buffering. It is **not** a trained ASL neural network. 12 signs only. |
| Confidence | Derived from how well geometry/motion match the documented handshape. Low-confidence or unknown handshapes are reported as unsupported. |
| Speech output | Browser `speechSynthesis`. |
| Speech input | Browser `SpeechRecognition` (Chrome/Edge/Safari). Typed input is always available as fallback. |
| Avatar | Three.js / React Three Fiber procedural humanoid driven by **hand-authored keyframe clips**, one per supported sign. Words with no clip are skipped and labelled, never faked. |
| GPS | Real `navigator.geolocation`. On failure the event stores the error, never a fake position. |
| Map | Real Leaflet + OpenStreetMap tiles. |
| SMS/email alerts | Real Twilio / Resend calls **only** when credentials are configured. Otherwise: "Demo mode — notification not sent". |

## Vocabulary

HELLO, THANK YOU, YES, NO, HELP, STOP, WATER, FOOD, HOSPITAL, WHERE, YOU, ME.
Each sign's required handshape/motion is documented in `src/lib/signs.ts` and shown in the app on the Translate page.

## Routes

- `/` landing
- `/login`, `/register`
- `/dashboard` (auth)
- `/translate` (auth) — Sign → Speech and Speech → Sign
- `/conversation` (auth) — both participants + transcript
- `/emergency` (auth) — contacts, gesture setup, test, armed detection
- `/emergency/:token` — public shareable alert page (map, timestamp, accuracy)
- `/settings` (auth)

## Stack

React 19 + TypeScript + Vite (TanStack Start), Tailwind CSS v4, Lovable Cloud (PostgreSQL + Auth) — no extra microservices. Recognition, speech and 3D all run client-side.

## Database schema

`drizzle/migrations/0000_signbridge_core.sql`

- `profiles` — user profile, chosen emergency gesture, location-sharing preference
- `emergency_contacts` — per-user contacts (RLS: owner only)
- `emergency_events` — event with coordinates, accuracy, timestamp, share token, notification status (owner full access; anonymous read for the share link)
- `conversation_messages` — transcript rows per session (RLS: owner only)

## Setup

1. `bun install`
2. Copy `.env.example` to `.env`. In Lovable the backend variables are injected automatically.
3. `bun run dev` and open the app over **https or localhost** — camera, microphone and geolocation require a secure context.
4. Register an account, confirm the email link, then open `/dashboard`.

### Enabling real emergency notifications

Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (SMS) and/or `RESEND_API_KEY`, `EMERGENCY_FROM_EMAIL` (email) as server secrets. The emergency page shows which providers are configured; with none, alerts are recorded and shareable but explicitly not sent.

## Demos

- **Camera demo:** `/translate` → Start camera → hold an open palm still (STOP), wave it (HELLO), point (YOU) → Speak.
- **Microphone demo:** `/translate` → Speech → Sign → "where is the hospital" → avatar plays WHERE + HOSPITAL and marks "is"/"the" as unsupported.
- **Emergency demo:** `/emergency` → add a contact → choose HELP → Test gesture → Arm → perform the gesture 3 times → 5-second cancellable countdown → event, map, share link.

## Safety limitations

This is an accessibility prototype. It is not a certified emergency service and must not replace calling local emergency numbers.
