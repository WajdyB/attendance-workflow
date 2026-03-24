# attendance-workflow

Attendance Workflow internship project.

## Monorepo Commands

From repository root:

- `npm install`
- `npm run dev` starts backend and frontend together
- `npm run build` builds backend and frontend
- `npm run lint` runs backend and frontend lint checks
- `npm run test` runs backend unit + e2e tests

## Ports

- Frontend (Next.js): `3000`
- Backend (NestJS): `3001`

Frontend API URL is configured in `FrontEnd/.env.local`.

## Project Structure

- `backend/src/modules/` contains feature modules (`auth`, `roles`, `users`)
- `FrontEnd/app/` contains pages/routes only
- `FrontEnd/src/components`, `FrontEnd/src/context`, `FrontEnd/src/utils` contain UI logic and shared client code
