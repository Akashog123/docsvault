# DocsVault Client

The frontend application for the DocsVault Multi-Tenant SaaS platform. Built with React 19, Vite, and Tailwind CSS.

## Overview

The client application provides a responsive, role-based dashboard for managing documents, subscriptions, and organization settings. It dynamically adapts its UI based on the user's role (`super_admin`, `admin`, `member`) and the organization's current subscription plan.

## Key Features

- **Role-Based Routing:**
  - `super_admin` sees platform-wide views (all organizations, plan configurations).
  - `admin` and `member` see tenant-specific dashboards.
- **Dynamic Feature Gating:**
  - The `<FeatureGate>` component automatically hides or locks UI elements (like Document Sharing or Version History) if the organization's plan lacks the required feature flag.
- **Onboarding Flow:**
  - First user setup flow for initializing the `super_admin`.
  - Organization registration for new tenants.
  - Member onboarding via unique `inviteCode` links.
- **Subscription Management:**
  - Admins can view and upgrade/downgrade plans directly from the UI.
  - Real-time usage bars tracking document and storage limits against plan quotas.
- **Document Management:**
  - Upload, download, and view documents.
  - Advanced search capabilities (for Enterprise plans).

## Tech Stack

- **Framework:** React 19
- **Bundler:** Vite 7
- **Styling:** Tailwind CSS v4, Lucide React (icons)
- **Routing:** React Router v7
- **State Management:** React Context (`AuthContext`, `SubscriptionContext`)
- **HTTP Client:** Axios (configured with interceptors to automatically handle 401, 403, and 429 API errors)

## Project Structure

```
client/src/
├── components/          # Reusable UI components (FeatureGate, UsageBar, etc.)
├── context/             # Global state (Auth, Subscription)
├── pages/               # Route components (Dashboard, Documents, Admin views, etc.)
├── utils/               # Helper functions (feature checking, formatting)
├── App.jsx              # Main routing and layout wrapper
└── main.jsx             # React DOM entry point
```

## Running Locally

Make sure the backend server is running first.

```bash
# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The app will be available at `http://localhost:5173`. API requests are proxied to `http://localhost:5000` as configured in `vite.config.js`.