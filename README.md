# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4d3e573f-8493-4098-8e02-1ef31b368b68

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4d3e573f-8493-4098-8e02-1ef31b368b68) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Backend API integration

This app includes a ready-to-use Axios client and React Query hooks to connect to a DRF backend using JWT.

Setup:

1) Copy `.env.example` to `.env` and set the API base URL (must include `/api/v1/`):

```
VITE_API_BASE=http://localhost:8000/api/v1/
```

2) Start the app:

```
npm run dev
```

Client:

- Axios instance: `src/lib/apiClient.ts` (adds `Authorization: Bearer <access_token>` and auto-refreshes on 401)
- Service wrappers: `src/lib/api.ts` (endpoints for auth, users, clients, pets, medical cards, schedules, usages, payments)
- Hooks: `src/hooks/api.ts` (e.g., `useLogin`, `useClients`, `useCreateMedicalCard`)
- Protected routes: `src/components/ProtectedRoute.tsx`

Example usage:

```ts
import { useLogin } from "@/hooks/api";

const { mutate: login, isPending } = useLogin();
login({ phone_number: "+15551234567", password: "secret123" });
```

Notes:

- On successful login, `access_token` and `refresh_token` are stored in `localStorage`.
- The Axios interceptor refreshes tokens via `POST auth/jwt/token/refresh/` when a 401 is encountered and retries the request.
- Set `VITE_LOGOUT_REDIRECT` in `.env` to change the route used after token refresh failure (default: `/auth`).

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4d3e573f-8493-4098-8e02-1ef31b368b68) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
