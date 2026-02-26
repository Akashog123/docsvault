# DocsVault

A full-stack multi-tenant SaaS application with a subscription-driven feature entitlement system. Organizations (tenants) are assigned subscription plans that control which features they can access and how many resources they can consume — all enforced at the API level.

Built with the MERN stack (MongoDB, Express.js, React, Node.js).

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Subscription Plans](#subscription-plans)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Design Rationale](#design-rationale)
- [Testing](#testing)
- [Deployment](#deployment)
- [TODO](#todo)

## Architecture Overview

### Diagrams

- **[System Architecture Diagram](docs/architecture-diagram.md)** — High-level architecture, entitlement decision flow, tenant isolation strategy
- **[ER Diagram](docs/er-diagram.md)** — Database schema, index strategy, feature-to-plan entitlement matrix

### Multi-Tenant Isolation

All tenants share a single MongoDB database. Isolation is enforced at the application layer:

- Every user belongs to an organization via `User.orgId` (except the Platform super_admin)
- Every document, subscription, and usage record is scoped by `orgId`
- The `authenticate` middleware extracts `orgId` and `role` from the JWT and attaches it to every request
- All database queries filter by `req.user.orgId` — tenants never see each other's data (except for Super Admin flows)

### Entitlement Middleware Chain

Every protected API route passes through a sequential middleware chain:

```
Request → authenticate → attachSubscription → checkFeature → checkUsageLimit → Controller
            (JWT)         (active? expired?)   (plan has it?)   (within quota?)
```

1. **`authenticate`** — Verifies the JWT, attaches `req.user` with `userId`, `orgId`, and `role`
2. **`attachSubscription`** — Loads the org's active subscription + plan from DB. If the subscription's `endDate` has passed, it transitions the status to `expired` and returns `403`
3. **`checkFeature(name)`** — Checks whether the plan's `features` array includes the requested feature. Returns `403` if not
4. **`checkUsageLimit(metric)`** — Reads the plan's `limits` object and compares against the org's current `UsageRecord`. Returns `429` if the limit is reached

### Subscription Lifecycle

The system supports two states: **active** and **expired**.

- Expiry is detected lazily — when a request hits `attachSubscription`, the middleware compares `endDate` against the current time
- If expired, the subscription's status is persisted as `expired` and a `403` is returned
- When an org admin changes plans, all existing active subscriptions are expired and a new one is created
- Free plans are assigned a 100-year `endDate` (effectively never expire)
- Paid plans default to a 1-month duration

### Roles & Permissions

The system enforces three distinct roles with clear separation of concerns:

| Role | Scope | Permissions |
|------|-------|-------------|
| `super_admin` | Platform-wide | Can view all organizations and users. Edit plan configurations (name, features, limits, price, color). Does not interact with tenant documents. |
| `admin` | Organization | Upgrade/downgrade org subscription, manage org members, generate invite codes. Cannot edit plan definitions. |
| `member` | Organization | Use features within the org's current plan. Read-only view of plans. Can join via invite code. |

**Middleware enforcement:**

| Middleware | Accepts | Protects |
|---|---|---|
| `superAdminOnly` | `super_admin` only | `POST /api/plans`, `PUT /api/plans/:id` |
| `adminOnly` | `admin` only | `POST /api/subscription/change`, `POST /api/org/users` |
| `authenticate` | Any authenticated user | All protected routes |

## Subscription Plans

Plans are stored in the database and loaded at runtime. The **super admin** can edit plan configurations (features, limits, pricing) through the UI or API. New plans can also be created via the API — no code changes required.

| | Free | Pro | Enterprise |
|---|---|---|---|
| **Price** | $0/mo | $29.99/mo | $99.99/mo |
| **Document CRUD** | Yes | Yes | Yes |
| **Document Sharing** | — | Yes | Yes |
| **Version Control** | — | Yes | Yes |
| **Advanced Search** | — | — | Yes |
| **Max Documents** | 10 | 200 | Unlimited |
| **Max Storage** | 100 MB | 1 GB | Unlimited |

### Extensibility

The plan schema uses dynamic types for both features and limits:

- **`features`**: `[String]` — no enum constraint. Add any feature name to a plan and gate a route with `checkFeature('new_feature')`
- **`limits`**: `Mixed` — any key-value pairs. Add a new limit key to a plan and enforce it with `checkUsageLimit('maxNewMetric')` after registering it in the `METRIC_CONFIG` object in `checkUsageLimit.js`

## Tech Stack

**Backend:**
- Node.js with Express.js v5
- MongoDB with Mongoose v9
- JWT authentication (jsonwebtoken)
- Password hashing (bcryptjs)
- File uploads (Multer with disk storage, 10 MB max)

**Frontend:**
- React 19 with Vite 7
- Tailwind CSS v4
- React Router v7
- Axios with response interceptors
- Context API (AuthContext, SubscriptionContext)

**Testing:**
- Jest 30 with ES modules
- MongoDB Memory Server
- Supertest for HTTP assertions
- Faker.js for test fixtures

## Project Structure

```
.
├── server/
│   ├── server.js                         # Entry point
│   ├── src/
│   │   ├── app.js                        # Express app setup, CORS, routes
│   │   ├── config/
│   │   │   └── db.js                     # MongoDB connection
│   │   ├── models/
│   │   │   ├── Organization.js           # Tenant: name, slug
│   │   │   ├── User.js                   # name, email, password, orgId, role
│   │   │   ├── Plan.js                   # name, features[], limits{}, price
│   │   │   ├── Subscription.js           # orgId, planId, status, dates
│   │   │   ├── Document.js              # title, file metadata, versions[], sharedWith[]
│   │   │   └── UsageRecord.js            # orgId, metric, count, period bounds
│   │   ├── middleware/
│   │   │   ├── authenticate.js           # JWT verification → req.user
│   │   │   ├── attachSubscription.js     # Load subscription, check expiry
│   │   │   ├── checkFeature.js           # Plan feature gate → 403
│   │   │   ├── checkUsageLimit.js        # Usage enforcement → 429
│   │   │   ├── adminOnly.js              # Org admin gate → 403
│   │   │   └── superAdminOnly.js         # Platform super admin gate → 403
│   │   ├── controllers/
│   │   │   ├── auth.controller.js        # register, login, getMe
│   │   │   ├── plan.controller.js        # list, create, update plans
│   │   │   ├── subscription.controller.js # get current, change plan
│   │   │   ├── doc.controller.js         # CRUD, share, version, search, download
│   │   │   └── org.controller.js         # get org, add user
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── plan.routes.js
│   │   │   ├── subscription.routes.js
│   │   │   ├── doc.routes.js
│   │   │   └── org.routes.js
│   │   ├── utils/
│   │   │   └── usageTracker.js           # Atomic increment/decrement, lazy reset
│   │   └── seeds/
│   │       ├── seed.js                   # Full seed: plans, orgs, users, subscriptions
│   │       └── plans.seed.js             # Seed plans only
│   └── tests/
│       ├── setup/
│       │   ├── fixtures.js               # Test data factories
│       │   └── helpers.js                # Mock request/response helpers
│       ├── unit/                         # 9 unit test suites
│       └── integration/                  # 3 integration test suites
│
├── client/
│   ├── src/
│   │   ├── App.jsx                       # Router with auth guards
│   │   ├── main.jsx                      # Entry point
│   │   ├── context/
│   │   │   ├── AuthContext.jsx           # User + org state, login/register/logout
│   │   │   └── SubscriptionContext.jsx   # Subscription + usage state
│   │   ├── middleware/
│   │   │   └── api.js                    # Axios instance with 401/403/429 interceptors
│   │   ├── utils/
│   │   │   └── features.js              # hasFeature, isWithinLimit, getUsagePercentage
│   │   ├── components/
│   │   │   ├── Layout.jsx                # Sidebar + navbar shell
│   │   │   ├── FeatureGate.jsx           # Render children only if plan has feature
│   │   │   ├── UsageBar.jsx              # Color-coded usage progress bar
│   │   │   ├── UpgradeBanner.jsx         # CTA banner linking to Plans page
│   │   │   ├── PlanBadge.jsx             # Plan name badge
│   │   │   └── SubscriptionStatus.jsx    # Status indicator
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx             # Subscription status, usage, quick links
│   │       ├── Documents.jsx             # List, upload, delete documents
│   │       ├── DocumentDetail.jsx        # View, share, version a document
│   │       ├── Search.jsx                # Enterprise-only full-text search
│   │       ├── Plans.jsx                 # View plans (member), change plan (admin), edit configs (super admin)
│   │       └── OrgSettings.jsx           # Org details, manage members (admin)
│   └── vite.config.js                    # Dev proxy /api → localhost:5000
│
├── docs/
│   ├── architecture-diagram.md           # Mermaid: system arch, entitlement flow, isolation
│   ├── er-diagram.md                     # Mermaid: ER schema, indexes, plan matrix
│   └── plans/                            # Design and implementation planning docs
│
├── vercel.json                           # Frontend deployment config
└── render.yaml                           # Backend deployment config
```

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (or local MongoDB)
- npm

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd docsvault

# 2. Install server dependencies
cd server
npm install

# 3. Configure environment variables
# Create server/.env with:
#   PORT=5000
#   MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/multitenant-dms
#   JWT_SECRET=<a-strong-random-string>
#   JWT_EXPIRES_IN=7d

# 4. Seed the database (plans + orgs + users + subscriptions)
npm run seed

# 5. Start the server
npm run dev

# 6. In a new terminal, install and start the client
cd ../client
npm install
npm run dev
```

Open **http://localhost:5173** in your browser and log in with one of the seeded accounts below.

## Demo Deployment Credentials

Use these credentials to test the live demo on Vercel:

| Account | Email | Password | Organization | Role |
|---------|-------|----------|--------------|------|
| Super Admin | `demo@docsvault.app` | `Demo@123` | Platform | `super_admin` |
| Acme Admin | `acme@docsvault.app` | `Demo@123` | Acme Corp | `admin` |
| Acme Member | `john.doe@docsvault.app` | `Demo@123` | Acme Corp | `member` |
| Globex Admin | `globex@docsvault.app` | `Demo@123` | Globex Inc | `admin` |
| Globex Member | `jane.doe@docsvault.app` | `Demo@123` | Globex Inc | `member` |

> **Note:** These credentials are for demo purposes only. In production, use strong, unique passwords.

---

## Local Development

### Seeded Test Accounts

`npm run seed` creates 3 plans, 3 organizations, 5 users, and Free subscriptions for all orgs:

| Account | Email | Password | Organization | Role |
|---------|-------|----------|--------------|------|
| Super Admin | `superadmin@platform.com` | `superadmin123` | Platform | `super_admin` |
| Acme Admin | `admin@acme.com` | `admin123` | Acme Corp | `admin` |
| Acme Member | `john@acme.com` | `member123` | Acme Corp | `member` |
| Globex Admin | `admin@globex.com` | `admin123` | Globex Inc | `admin` |
| Globex Member | `jane@globex.com` | `member123` | Globex Inc | `member` |

All organizations start on the **Free plan**. Org admins can upgrade/downgrade. The super admin can edit plan configurations.

**Seed scripts:**

| Command | Description |
|---------|-------------|
| `npm run seed` | Full seed — plans, orgs, users, subscriptions, usage records |
| `npm run seed:plans` | Plans only (Free, Pro, Enterprise) |

## API Reference

All endpoints return JSON. Protected routes require an `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Create org + admin user + Free subscription |
| `POST` | `/api/auth/login` | — | Returns JWT token |
| `GET` | `/api/auth/me` | JWT | Current user, org, subscription, usage |

### Plans

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/plans` | — | List all active plans |
| `POST` | `/api/plans` | JWT + Super Admin | Create a new plan |
| `PUT` | `/api/plans/:id` | JWT + Super Admin | Update plan configuration (features, limits, price) |

### Subscription

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/subscription` | JWT + Subscription | Current subscription + usage breakdown |
| `POST` | `/api/subscription/change` | JWT + Org Admin | Upgrade/downgrade plan (expires old, creates new) |

### Documents

| Method | Endpoint | Auth | Middleware | Description |
|--------|----------|------|------------|-------------|
| `GET` | `/api/docs` | JWT + Subscription | — | List org's documents |
| `GET` | `/api/docs/:id` | JWT + Subscription | — | Get document details |
| `GET` | `/api/docs/:id/download` | JWT + Subscription | — | Download document file |
| `POST` | `/api/docs` | JWT + Subscription | `doc_crud` + usage limits | Upload a document |
| `DELETE` | `/api/docs/:id` | JWT + Subscription | — | Delete a document |
| `GET` | `/api/docs/search?q=` | JWT + Subscription | `advanced_search` | Full-text search (Enterprise) |
| `POST` | `/api/docs/:id/share` | JWT + Subscription | `sharing` | Share with team members (Pro+) |
| `POST` | `/api/docs/:id/version` | JWT + Subscription | `versioning` + usage limits | Upload new version (Pro+) |

### Organization

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/org` | JWT + Subscription | Get organization details |
| `POST` | `/api/org/users` | JWT + Subscription + Org Admin | Add a user to the org |

### Error Responses

| Status | Meaning | When |
|--------|---------|------|
| `401` | Unauthorized | Missing/invalid/expired JWT |
| `403` | Forbidden | No active subscription, expired subscription, feature not in plan, wrong role |
| `429` | Too Many Requests | Document or storage limit reached |

## Design Rationale

### Why application-level tenancy?

All tenants share one database with `orgId`-scoped queries. This keeps the system simple to operate (one connection string, one deployment) while still providing full data isolation. The compound index on `{ orgId, status }` on subscriptions and `{ orgId, metric, periodStart }` on usage records keeps queries fast regardless of tenant count.

### How does the system scale?

- **Indexes**: Every tenant-scoped collection has an `orgId` index. Usage records have a compound unique index that combines `orgId`, `metric`, and `periodStart` for O(1) lookups
- **Atomic operations**: Usage tracking uses MongoDB's `$inc` operator, which is atomic — no read-modify-write race conditions
- **Lazy evaluation**: Subscription expiry and usage period resets happen on-demand, not via background jobs, eliminating the need for a scheduler process

### How to prevent race conditions in usage updates?

Usage increments and decrements use `findOneAndUpdate` with `$inc`, which is an atomic MongoDB operation. Two concurrent uploads for the same org will both atomically increment the counter without conflict. The decrement operation includes a guard (`count: { $gte: amount }`) to prevent negative values.

### How to support plan upgrades/downgrades?

The `changePlan` endpoint expires all active subscriptions for the org and creates a new one. Usage records are not reset on plan change — the org keeps its current period's usage. If downgrading to a plan with a lower limit, existing resources are preserved but no new ones can be created until usage drops below the new limit.

### How to extend the system with new features?

1. Add the feature name to the desired plan(s) in the database
2. Apply `checkFeature('new_feature')` middleware to the relevant route
3. No schema migrations or code changes to the Plan model needed

For a new usage limit type:
1. Add the limit key (e.g., `maxUsers: 50`) to the plan's `limits` object in the database
2. Register the metric mapping in `METRIC_CONFIG` in `checkUsageLimit.js`
3. Apply `checkUsageLimit('maxUsers')` middleware to the relevant route

## Testing

### Run Tests

```bash
cd server
npm test                    # All tests
npm run test:unit           # Unit tests only (9 suites)
npm run test:integration    # Integration tests only (3 suites)
npm run test:coverage       # With coverage report
```

### Test Results

```
Test Suites: 9 passed, 9 total (unit)
Tests:       120 passed, 120 total
```

### What's Covered

| Area | Suites | What's tested |
|------|--------|---------------|
| **Middleware** | `authenticate`, `attachSubscription`, `checkFeature`, `checkUsageLimit`, `adminOnly`, `superAdminOnly` | JWT validation, subscription loading + lazy expiry, feature gating, usage limit enforcement, org admin checks, super admin checks |
| **Models** | `User`, `Subscription` | Password hashing, field validation, enum constraints, indexes, timestamps |
| **Utils** | `usageTracker` | Atomic increment/decrement, lazy period reset, concurrent operations, metric handling |
| **Integration** | `auth`, `featureGating`, `multitenancy` | End-to-end registration, plan enforcement, tenant isolation |

### Test Infrastructure

- **Jest** with `--experimental-vm-modules` for native ES module support
- **MongoDB Memory Server** for isolated in-memory database per test suite
- **Supertest** for HTTP-level integration tests
- **Faker.js** for realistic test data generation

## Deployment

### Backend (Render)

1. Create a **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Set build command: `cd server && npm install`
4. Set start command: `cd server && npm start`
5. Add environment variables: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`
6. After first deploy, run the seed via Render shell: `cd server && npm run seed`

### Frontend (Vercel)

1. Import your repository on [Vercel](https://vercel.com)
2. Set **Root Directory** to `client`
3. Edit `vercel.json` — replace `your-backend-url.onrender.com` with your Render service URL
4. Deploy

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | `test-secret-key` | Secret for signing JWTs (change in production) |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiry duration |
| `PORT` | No | `5000` | Server port |

## TODO

- [x] Multi-tenant architecture with organization-based data isolation
- [x] Subscription plan modeling (database-driven: Free, Pro, Enterprise)
- [x] Feature-based access enforcement via backend middleware
- [x] Usage limit enforcement (document count + storage)
- [x] Subscription lifecycle handling (active / expired states)
- [x] JWT authentication with role-based access control
- [x] Three-tier role system (super_admin, admin, member) with separated permissions
- [x] Super admin plan configuration management (create, edit plans via UI + API)
- [x] Org admin subscription management (upgrade/downgrade via UI + API)
- [x] Seeded test data (super admin, 2 orgs with admins + members, Free subscriptions)
- [x] React frontend with subscription UI (plans, usage bars, feature gates)
- [x] API error handling (401, 403, 429 interceptors)
- [x] Monthly usage reset with lazy evaluation
- [x] Dynamic plan extensibility (add plans/features without code changes)
- [ ] Payment integration (Stripe/PayPal) for real billing
- [ ] Email notifications for subscription expiry warnings
- [ ] Grace period and downgrade logic for expired subscriptions
- [ ] File storage migration from disk to S3/cloud storage
- [ ] API rate limiting middleware
- [ ] Cron-based subscription expiry (supplement lazy check)

## License

MIT
