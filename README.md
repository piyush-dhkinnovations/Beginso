# Onboarding Platform - Frontend

This is the Next.js 15 App Router frontend application for the Onboarding Platform.

## Prerequisites

- **Node.js**: `^20.0.0` or `^22.0.0` (Recommended)
- **NPM**: `^10.0.0`
- **Shell**: PowerShell (Windows) or any bash-compatible shell

> [!NOTE]
> On Windows, if running script execution policies block Node commands in PowerShell, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force` in a terminal as Administrator, or execute commands explicitly via their CMD wrappers (e.g. `npm.cmd`).

---

## Installation

Install dependencies using NPM:

```bash
npm install
```

---

## Environment Configuration

Configure the application environment using a `.env.local` file at the root. You can copy the example file:

```bash
cp .env.local.example .env.local
```

### Environment Variables

| Variable | Default Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | The backend API base URL |
| `NEXT_PUBLIC_USE_MOCK` | `true` | When set to `"true"`, mocks API responses locally |

---

## Available NPM Scripts

Use the following NPM scripts to manage the project:

- **Start Development Server**: Runs Next.js dev server on port 3000.
  ```bash
  npm run dev
  ```
- **Build for Production**: Compiles the TypeScript and Next.js project into optimized static/server bundles.
  ```bash
  npm run build
  ```
- **Start Production Server**: Serves the compiled production bundle.
  ```bash
  npm run start
  ```
- **Run ESLint**: Checks the project code for syntax issues and style conventions.
  ```bash
  npm run lint
  ```
