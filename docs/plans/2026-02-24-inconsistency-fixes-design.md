# Inconsistency Fixes Design

Fixes all identified inconsistencies between the assessment task requirements, the README documentation, and the actual implementation across backend and frontend.

## Problem Statement

Deep analysis of the codebase revealed 16 inconsistencies across backend (9) and frontend (7). The most critical ones violate the assessment requirement that "frontend-only restriction is not acceptable" — several document routes skip the feature check middleware entirely, and race conditions exist in the usage tracking and subscription change flows.

## Execution Plan — 4 Incremental Commits

### Commit 1: Middleware & Route Gaps (Assessment-Critical)

**Why:** The assessment requires "centralized backend middleware that validates subscription status and validates feature entitlement." Four document routes bypass `checkFeature`.

| Route | Current Middleware | Fix |
|-------|-------------------|-----|
| `GET /docs` | authenticate, attachSubscription | Add `checkFeature('doc_crud')` |
| `GET /docs/:id` | authenticate, attachSubscription | Add `checkFeature('doc_crud')` |
| `GET /docs/:id/download` | authenticate, attachSubscription | Add `checkFeature('doc_crud')` |
| `DELETE /docs/:id` | authenticate, attachSubscription | Add `checkFeature('doc_crud')` |

**File:** `server/src/routes/doc.routes.js`

**Design decision:** Use `doc_crud` (not a separate `doc_read`) because all plans already include `doc_crud`. This completes the middleware chain without breaking existing behavior.

---

### Commit 2: Race Conditions & Data Integrity

**Why:** The assessment asks "How to prevent race conditions in usage updates." Three race conditions exist in the code.

#### 2a. Lazy reset race in `usageTracker.js`

**Problem:** `getOrCreateUsageRecord` (lines 28-35) uses read-check-then-save to reset stale periods. Two concurrent requests in a new period could both reset, losing any increment that happens between the two saves.

**Fix:** Replace read-modify-save with atomic `findOneAndUpdate`:
```js
await UsageRecord.findOneAndUpdate(
  { orgId, metric, periodEnd: { $lt: new Date() } },
  { $set: { count: 0, periodStart, periodEnd, lastResetAt: new Date() } }
);
```

Then query for the current-period record.

#### 2b. Duplicate active subscriptions in `changePlan`

**Problem:** `subscription.controller.js` lines 55-75: `updateMany` (expire old) followed by `create` (new) is not atomic. Two concurrent plan changes can produce two active subscriptions.

**Fix:** Add a unique partial index on the Subscription model:
```js
subscriptionSchema.index(
  { orgId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
```

This prevents duplicate active subscriptions at the database level. The `changePlan` controller wraps the create in try-catch for duplicate key errors.

#### 2c. Missing storage usage initialization

**Problem:** `auth.controller.js` line 78 initializes `documents` usage record on register but not `storage`.

**Fix:** Add `await getOrCreateUsageRecord(newOrg._id, 'storage');` after the documents init. Not strictly a bug (upsert handles it lazily), but ensures consistent initial state for dashboard display.

**Files:** `server/src/utils/usageTracker.js`, `server/src/models/Subscription.js`, `server/src/controllers/subscription.controller.js`, `server/src/controllers/auth.controller.js`

---

### Commit 3: Error Handling & Security

#### 3a. Hardcoded JWT secret fallback

**Problem:** `authenticate.js` line 12 and `auth.controller.js` line 11 have `process.env.JWT_SECRET || 'test-secret-key'`. In production without the env var, all tokens use a known secret.

**Fix:** Remove the fallback. If `JWT_SECRET` is missing, the server should fail loudly.

#### 3b. Error message exposure

**Problem:** All controllers return `error.message` in 500 responses, exposing internal details (stack traces, MongoDB errors) to clients.

**Fix:** Replace with generic `{ error: 'Internal server error' }` and add `console.error(error)` for server-side logging.

**Files affected:** `auth.controller.js`, `doc.controller.js`, `org.controller.js`, `plan.controller.js`, `subscription.controller.js`

#### 3c. METRIC_CONFIG comment fix

**Problem:** Comment says "no other code changes needed" but non-count units (like bytes_to_mb) do require adding an entry.

**Fix:** Update comment to honestly describe what's extensible without code changes and what isn't.

#### 3d. Global error handler

**Problem:** `app.js` has no global error handler. Unhandled errors produce default Express HTML responses.

**Fix:** Add error handler middleware as the last middleware in `app.js`.

**Files:** `server/src/middleware/authenticate.js`, `server/src/controllers/*.js`, `server/src/middleware/checkUsageLimit.js`, `server/src/app.js`

---

### Commit 4: Frontend Fixes

#### F1. OrgSettings access control
- Hide Settings nav link for non-admin users in `Layout.jsx`
- Add role check in `OrgSettings.jsx` — show "Access denied" instead of making a failing API call

#### F2. Layout.jsx null crash
- Add optional chaining: `subscription?.plan?.features?.includes('advanced_search')`

#### F3. Documents.jsx premature "limit reached"
- Distinguish between `usage === null` (still loading) and actual limit reached
- Show loading indicator while usage loads, not the limit-reached message

#### F4. Dashboard.jsx inefficient doc counting
- Use `usage.documents` from SubscriptionContext instead of fetching all documents via `GET /docs`

#### F5. DocumentDetail.jsx missing download
- Add a download button that calls `GET /docs/:id/download`

#### F6. PlanBadge.jsx hardcoded colors
- Add fallback color for unknown plan names using a deterministic approach

#### F7. Login/Register loading state
- Add `loading` state variable, disable submit button and show spinner during API call

**Files:** `client/src/components/Layout.jsx`, `client/src/pages/OrgSettings.jsx`, `client/src/pages/Documents.jsx`, `client/src/pages/Dashboard.jsx`, `client/src/pages/DocumentDetail.jsx`, `client/src/components/PlanBadge.jsx`, `client/src/pages/Login.jsx`, `client/src/pages/Register.jsx`

---

## What We're NOT Doing (Design Rationale)

| Skipped | Reason |
|---------|--------|
| Moving METRIC_CONFIG to database | Current fallback handles count-based metrics without code changes. Only non-count units need METRIC_CONFIG. Trade-off documented for presentation. |
| Document pagination | Not assessment-relevant. Works at demo scale. |
| Toast notification system | UX polish, not a functional gap. |
| MongoDB transactions for changePlan | Unique partial index is simpler and more reliable than transactions for preventing duplicate active subscriptions. |
| Error boundaries | React feature, not assessment-relevant. |

## Assessment Alignment

| Assessment Requirement | Status Before | Status After |
|----------------------|---------------|--------------|
| API-level feature enforcement | Partial (4 routes skip checkFeature) | Complete |
| Usage limit enforcement | Works but race condition on period reset | Atomic and race-free |
| Subscription lifecycle | Works but can create duplicate actives | Unique constraint prevents duplicates |
| New plans without code changes | Partially true | Documented honestly |
| Proper HTTP error responses | Inconsistent, exposes internals | Standardized, generic 500s |
| Frontend reflects backend state | Several UX gaps | Consistent |
