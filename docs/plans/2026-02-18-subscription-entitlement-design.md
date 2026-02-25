# Subscription & Feature Entitlement System — Design Document

**Application:** Multi-Tenant Document Management System
**Date:** 2026-02-18
**Stack:** MERN (MongoDB Atlas, Express, React, Node.js) + Tailwind CSS + ES6+
**Approach:** Centralized Middleware Chain

---

## 1. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│              (Tailwind CSS, Axios, React Router)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │  Auth UI  │  │  Doc Mgmt │  │  Sharing  │  │  Admin/Plans │  │
│  └──────────┘  └──────────┘  └───────────┘  └──────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP (REST API)
┌─────────────────────────▼───────────────────────────────────────┐
│                     Express.js Backend                          │
│                                                                 │
│  ┌────────────────── Middleware Chain ──────────────────────┐   │
│  │                                                          │   │
│  │  authenticate ──► attachSubscription ──► checkFeature    │   │
│  │       │                   │                    │         │   │
│  │  Verify JWT        Load org's active      Verify plan   │   │
│  │  Extract user      subscription + plan    has feature    │   │
│  │  + org context     from DB (cached)       enabled        │   │
│  │                                                          │   │
│  │                              checkUsageLimit             │   │
│  │                                    │                     │   │
│  │                             Compare current              │   │
│  │                             usage vs plan limit          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ Auth API  │  │  Doc API  │  │ Share API │  │Subscription  │  │
│  │ /auth/*   │  │ /docs/*   │  │ /share/*  │  │  API /subs/* │  │
│  └──────────┘  └──────────┘  └───────────┘  └──────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    MongoDB Atlas                                │
│  ┌───────┐ ┌──────┐ ┌──────┐ ┌──────────────┐ ┌────────────┐  │
│  │ Users │ │ Orgs │ │Plans │ │Subscriptions │ │ Documents  │  │
│  └───────┘ └──────┘ └──────┘ └──────────────┘ └────────────┘  │
│                                ┌──────────────┐                 │
│                                │ UsageRecords │                 │
│                                └──────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

### Entitlement Decision Flow

```
Incoming Request
       │
       ▼
 ┌─────────────┐    401
 │ authenticate │──────────► Unauthorized
 │  (JWT)       │            "Invalid or missing token"
 └──────┬──────┘
        │ req.user = { userId, orgId, role }
        ▼
 ┌──────────────────┐    403
 │ attachSubscription│──────► Forbidden
 │                   │        "No active subscription"
 └──────┬───────────┘
        │ req.subscription = { plan, features, limits, status }
        ▼
 ┌──────────────┐    403
 │ checkFeature  │──────────► Forbidden
 │ ('sharing')   │            "Feature not available in your plan.
 └──────┬───────┘             Upgrade to Pro."
        │
        ▼
 ┌───────────────┐    429
 │ checkUsageLimit│─────────► Too Many Requests
 │ ('documents') │            "Document limit reached (10/10).
 └──────┬────────┘             Upgrade or wait for monthly reset."
        │
        ▼
   Route Handler
   (business logic)
```

### Tenant Isolation Strategy

Every database query is scoped by `orgId`. The `authenticate` middleware extracts the user's `orgId` from the JWT and attaches it to `req.user`. All downstream queries filter by this `orgId` — a tenant can never access another tenant's data. There is no shared data between tenants except the `plans` collection (which is global/read-only for tenants).

---

## 2. Database Schema Design

### ER Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   Plan       │       │  Organization    │       │     User        │
├──────────────┤       ├──────────────────┤       ├─────────────────┤
│ _id          │       │ _id              │       │ _id             │
│ name         │◄──┐   │ name             │◄──┐   │ name            │
│ features[]   │   │   │ slug             │   │   │ email           │
│ limits       │   │   │ createdAt        │   │   │ password (hash) │
│ price        │   │   │ updatedAt        │   │   │ orgId ──────────┼──► Organization
│ isActive     │   │   └──────────────────┘   │   │ role            │
│ createdAt    │   │                           │   │ createdAt       │
└──────────────┘   │                           │   └─────────────────┘
                   │                           │
                   │   ┌──────────────────┐    │
                   │   │  Subscription    │    │
                   │   ├──────────────────┤    │
                   └───┤ planId ──────────┼────┘
                       │ orgId ───────────┼──► Organization
                       │ status           │
                       │ startDate        │
                       │ endDate          │
                       │ createdAt        │
                       └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│   Document       │       │  UsageRecord     │
├──────────────────┤       ├──────────────────┤
│ _id              │       │ _id              │
│ title            │       │ orgId ───────────┼──► Organization
│ description      │       │ metric           │
│ fileName         │       │ count            │
│ fileSize         │       │ periodStart      │
│ mimeType         │       │ periodEnd        │
│ orgId ───────────┼──►Org │ lastResetAt      │
│ uploadedBy ──────┼──►User│ updatedAt        │
│ sharedWith[]     │       └──────────────────┘
│ versions[]       │
│ currentVersion   │
│ createdAt        │
│ updatedAt        │
└──────────────────┘
```

### Collection Schemas

**Plans** — Global, not tenant-scoped. Seed data.

```js
{
  _id: ObjectId,
  name: "Pro",                          // "Free" | "Pro" | "Enterprise"
  features: ["doc_crud", "sharing", "versioning"],
  limits: {
    maxDocuments: 200                   // -1 for unlimited (Enterprise)
  },
  price: 29.99,
  isActive: true,
  createdAt: ISODate
}
```

**Organizations**

```js
{
  _id: ObjectId,
  name: "Acme Corp",
  slug: "acme-corp",
  createdAt: ISODate,
  updatedAt: ISODate
}
```

**Users**

```js
{
  _id: ObjectId,
  name: "John Doe",
  email: "john@acme.com",
  password: "$2b$10$...",              // bcrypt hash
  orgId: ObjectId,                     // → Organization
  role: "admin",                       // "admin" | "member"
  createdAt: ISODate
}
```

**Subscriptions** — One active subscription per org at a time.

```js
{
  _id: ObjectId,
  orgId: ObjectId,                     // → Organization (indexed)
  planId: ObjectId,                    // → Plan
  status: "active",                    // "active" | "expired"
  startDate: ISODate,
  endDate: ISODate,
  createdAt: ISODate
}
```

**UsageRecords** — Tracks document count per org per billing period.

```js
{
  _id: ObjectId,
  orgId: ObjectId,
  metric: "documents",
  count: 8,
  periodStart: ISODate("2026-02-01"),
  periodEnd: ISODate("2026-02-28"),
  lastResetAt: ISODate,
  updatedAt: ISODate
}
```

**Documents**

```js
{
  _id: ObjectId,
  title: "Q4 Report",
  description: "Quarterly financial report",
  fileName: "q4-report.pdf",
  fileSize: 2048576,
  mimeType: "application/pdf",
  orgId: ObjectId,
  uploadedBy: ObjectId,
  sharedWith: [ObjectId],             // Pro+ feature
  versions: [                          // Pro+ feature
    {
      versionNumber: 1,
      fileName: "q4-report-v1.pdf",
      fileSize: 1948576,
      uploadedBy: ObjectId,
      uploadedAt: ISODate
    }
  ],
  currentVersion: 2,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### Indexes

| Collection | Index | Purpose |
|---|---|---|
| Users | `{ email: 1 }` unique | Login lookup |
| Users | `{ orgId: 1 }` | List users in org |
| Subscriptions | `{ orgId: 1, status: 1 }` | Fast active subscription lookup |
| UsageRecords | `{ orgId: 1, metric: 1, periodStart: 1 }` unique | One record per org/metric/period |
| Documents | `{ orgId: 1 }` | Tenant-scoped document queries |
| Documents | `{ orgId: 1, title: "text" }` | Advanced search (Enterprise) |
| Organizations | `{ slug: 1 }` unique | Slug lookup |

---

## 3. Feature-to-Plan Entitlement Matrix

```
┌─────────────────────┬──────────┬──────────┬────────────┐
│ Feature             │   Free   │   Pro    │ Enterprise │
├─────────────────────┼──────────┼──────────┼────────────┤
│ doc_crud            │    ✓     │    ✓     │     ✓      │
│ sharing             │    ✗     │    ✓     │     ✓      │
│ versioning          │    ✗     │    ✓     │     ✓      │
│ advanced_search     │    ✗     │    ✗     │     ✓      │
├─────────────────────┼──────────┼──────────┼────────────┤
│ maxDocuments        │    10    │   200    │     -1     │
│ price ($/mo)        │    0     │  29.99   │   99.99    │
└─────────────────────┴──────────┴──────────┴────────────┘
```

---

## 4. Middleware Design

### Middleware Functions

```
authenticate(req, res, next)
├── Extract token from Authorization: Bearer <token>
├── Verify JWT, decode { userId, orgId, role }
├── Attach req.user = { userId, orgId, role }
└── Fail → 401 { error: "Authentication required" }

attachSubscription(req, res, next)
├── Query Subscription { orgId: req.user.orgId, status: "active" }
├── Populate planId → get full plan with features + limits
├── Check if endDate < now → mark expired, block
├── Attach req.subscription = { plan, status, endDate }
└── Fail → 403 { error: "No active subscription" }

checkFeature(featureName) → returns middleware function
├── Read req.subscription.plan.features
├── Check features.includes(featureName)
└── Fail → 403 { error: "Feature not available in your plan", upgrade: "Pro" }

checkUsageLimit(metric) → returns middleware function
├── Read req.subscription.plan.limits[metric]
├── Query UsageRecord for current period
├── Compare count vs limit (-1 = unlimited, skip check)
└── Fail → 429 { error: "Document limit reached", currentUsage, limit, resetsAt }
```

### Route-Middleware Composition

```js
// All plans
router.get('/docs',       authenticate, attachSubscription, getAllDocs);
router.post('/docs',      authenticate, attachSubscription, checkFeature('doc_crud'), checkUsageLimit('maxDocuments'), uploadDoc);

// Pro+
router.post('/docs/:id/share',   authenticate, attachSubscription, checkFeature('sharing'), shareDoc);
router.post('/docs/:id/version', authenticate, attachSubscription, checkFeature('versioning'), checkUsageLimit('maxDocuments'), uploadVersion);

// Enterprise
router.get('/docs/search', authenticate, attachSubscription, checkFeature('advanced_search'), searchDocs);
```

---

## 5. API Route Map

| Method | Route | Middleware | Description |
|---|---|---|---|
| POST | `/api/auth/register` | none | Register org + admin user |
| POST | `/api/auth/login` | none | Login, receive JWT |
| GET | `/api/auth/me` | authenticate | Get current user profile |
| GET | `/api/org` | auth, attachSub | Get org details + subscription info |
| POST | `/api/org/users` | auth, attachSub, adminOnly | Invite user to org |
| GET | `/api/docs` | auth, attachSub | List org's documents |
| POST | `/api/docs` | auth, attachSub, checkFeature, checkUsageLimit | Upload document |
| GET | `/api/docs/:id` | auth, attachSub | Get document detail |
| DELETE | `/api/docs/:id` | auth, attachSub | Delete document |
| POST | `/api/docs/:id/share` | auth, attachSub, checkFeature('sharing') | Share doc with users |
| POST | `/api/docs/:id/version` | auth, attachSub, checkFeature('versioning'), checkUsageLimit | Upload new version |
| GET | `/api/docs/search` | auth, attachSub, checkFeature('advanced_search') | Full-text search |
| GET | `/api/subscription` | auth, attachSub | Get current subscription + usage |
| POST | `/api/subscription/change` | auth, adminOnly | Change plan |
| GET | `/api/plans` | none | List all available plans |

### HTTP Response Codes

| Scenario | Code | Response Body |
|---|---|---|
| No/invalid JWT | 401 | `{ error: "Authentication required" }` |
| Subscription expired | 403 | `{ error: "Subscription expired", expiredAt: "..." }` |
| Feature not in plan | 403 | `{ error: "Feature 'sharing' not available in Free plan", upgrade: "Pro" }` |
| Usage limit exceeded | 429 | `{ error: "Document limit reached (10/10)", resetsAt: "..." }` |
| Success | 200/201 | Resource data |

---

## 6. Usage Reset Logic & Subscription Lifecycle

### Monthly Usage Reset — Lazy Strategy

When `checkUsageLimit` middleware runs:
1. Query UsageRecord for orgId + metric
2. If `periodEnd < now` → reset count to 0, set new period boundaries
3. Proceed with limit check against fresh count

No cron jobs needed. Inactive orgs don't waste cycles. Reset is atomic with the check.

### Subscription Lifecycle

```
  ┌──────────┐   plan change    ┌──────────┐
  │  ACTIVE  ├─────────────────►│  ACTIVE  │
  │ (Plan A) │  (new sub)       │ (Plan B) │
  └────┬─────┘                  └────┬─────┘
       │ endDate passes              │ endDate passes
       ▼                             ▼
  ┌──────────┐                  ┌──────────┐
  │ EXPIRED  │                  │ EXPIRED  │
  └────┬─────┘                  └──────────┘
       │ admin re-subscribes
       ▼
  ┌──────────┐
  │  ACTIVE  │
  └──────────┘
```

### Expired Subscription Behavior

| Action | Active | Expired |
|---|---|---|
| View/list documents | Yes | Yes (read-only) |
| Upload new document | Yes | Blocked |
| Share document | Yes (Pro+) | Blocked |
| Upload version | Yes (Pro+) | Blocked |
| Search | Yes (Enterprise) | Blocked |
| Delete document | Yes | Yes |
| Change plan | Yes | Yes (re-activates) |

---

## 7. Frontend Architecture

### Page Structure

```
src/
├── pages/
│   ├── Login.jsx, Register.jsx
│   ├── Dashboard.jsx          # Usage stats, subscription status
│   ├── Documents.jsx          # Document list, upload, delete
│   ├── DocumentDetail.jsx     # View, share, version history
│   ├── Search.jsx             # Enterprise feature
│   ├── Plans.jsx              # View/change plans
│   └── OrgSettings.jsx       # Org details, manage users
├── components/
│   ├── Layout.jsx, UpgradeBanner.jsx, UsageBar.jsx
│   ├── FeatureGate.jsx        # Wraps UI elements by plan
│   ├── PlanBadge.jsx, SubscriptionStatus.jsx
├── context/
│   ├── AuthContext.jsx        # User + org + JWT
│   └── SubscriptionContext.jsx# Plan, features, usage
├── middleware/
│   └── api.js                 # Axios + 403/429 interceptors
└── utils/
    └── features.js            # hasFeature(), isWithinLimit()
```

Frontend uses subscription context for UX gating only. The backend remains the single source of truth.

---

## 8. Project Directory Structure

```
docsvault/
├── server/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/         # Plan, Organization, User, Subscription, Document, UsageRecord
│   │   ├── middleware/     # authenticate, attachSubscription, checkFeature, checkUsageLimit, adminOnly
│   │   ├── routes/         # auth, org, doc, subscription, plan
│   │   ├── controllers/    # auth, org, doc, subscription, plan
│   │   ├── seeds/plans.seed.js
│   │   ├── utils/usageTracker.js
│   │   └── app.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── client/
│   ├── src/
│   │   ├── pages/, components/, context/, middleware/, utils/
│   │   └── App.jsx
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

---

## 9. Design Rationale

### Why this schema design?

MongoDB's flexible schema matches the DMS domain naturally — documents with embedded versions avoid joins, and the `features` array on Plan enables simple `includes()` checks without a separate join table. The schema is normalized where relationships matter (User → Org, Subscription → Plan) and denormalized where performance matters (versions embedded in Document). Plans are stored in DB rather than hardcoded, so adding a new plan or toggling a feature is a data operation, not a code deployment.

### How the system scales to a large number of tenants

Every tenant-scoped query filters by indexed `orgId`, so query performance is O(log n) regardless of total tenant count. The middleware chain adds constant overhead per request. For high scale: subscription lookups can be cached in-memory (or Redis) with TTL since plans change infrequently. Usage counters use `findOneAndUpdate` with `$inc` — an atomic operation that avoids read-modify-write races. MongoDB Atlas handles horizontal scaling via sharding on `orgId` as the shard key.

### How to prevent race conditions in usage updates

Usage count is updated via MongoDB's atomic `$inc` operator:

```js
UsageRecord.findOneAndUpdate(
  { orgId, metric, periodStart },
  { $inc: { count: 1 } },
  { new: true }
)
```

The returned document contains the post-increment count. If it exceeds the limit, the operation is rolled back (document deleted). This prevents two concurrent uploads from both reading count=9 (limit 10) and both succeeding. The atomicity is guaranteed at the MongoDB engine level.

### How to support plan upgrades/downgrades (conceptually)

Upgrades are immediate: expire the current subscription, create a new one with the higher plan. Features unlock instantly. Downgrades are deferred: schedule the downgrade to take effect at `endDate` of the current period (user paid for it). At that point, if usage exceeds the new plan's limit, the user can still read but can't create until they're under the limit. Proration and refunds would be handled by an external billing system (Stripe).

### How to extend the system for new features

1. Add the feature string to the relevant plans in the `plans` collection
2. Add `checkFeature('new_feature')` middleware to the new route
3. No business logic changes, no redeployment of existing code
4. New usage metrics: add metric to Plan's `limits` object and use `checkUsageLimit('newMetric')` on the relevant route

The system is fully data-driven — plans, features, and limits are all database records, not code constants.
