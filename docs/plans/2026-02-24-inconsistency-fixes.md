# Inconsistency Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 16 identified inconsistencies across backend middleware gaps, race conditions, error handling, and frontend UX — ensuring the codebase fully satisfies the assessment task requirements.

**Architecture:** Incremental fixes across 4 commits. Each commit targets one category of inconsistency. Backend fixes come first (assessment-critical), frontend fixes last. No new files created — all edits to existing files.

**Tech Stack:** Node.js/Express (backend), React 19 (frontend), MongoDB/Mongoose (database), Jest (tests)

---

### Task 1: Add missing checkFeature middleware to document routes

**Files:**
- Modify: `server/src/routes/doc.routes.js:33-38`

**Step 1: Edit doc.routes.js to add checkFeature('doc_crud') to all four routes**

In `server/src/routes/doc.routes.js`, change lines 33-38 from:

```js
router.get('/', authenticate, attachSubscription, getAllDocs);
router.get('/search', authenticate, attachSubscription, checkFeature('advanced_search'), searchDocs);
router.get('/:id', authenticate, attachSubscription, getDocById);
router.get('/:id/download', authenticate, attachSubscription, downloadDoc);
router.post('/', authenticate, attachSubscription, checkFeature('doc_crud'), checkUsageLimit('maxDocuments'), checkUsageLimit('maxStorage'), upload.single('file'), uploadDoc);
router.delete('/:id', authenticate, attachSubscription, deleteDoc);
```

To:

```js
router.get('/', authenticate, attachSubscription, checkFeature('doc_crud'), getAllDocs);
router.get('/search', authenticate, attachSubscription, checkFeature('advanced_search'), searchDocs);
router.get('/:id', authenticate, attachSubscription, checkFeature('doc_crud'), getDocById);
router.get('/:id/download', authenticate, attachSubscription, checkFeature('doc_crud'), downloadDoc);
router.post('/', authenticate, attachSubscription, checkFeature('doc_crud'), checkUsageLimit('maxDocuments'), checkUsageLimit('maxStorage'), upload.single('file'), uploadDoc);
router.delete('/:id', authenticate, attachSubscription, checkFeature('doc_crud'), deleteDoc);
```

**Step 2: Run existing tests to verify nothing breaks**

Run: `cd server && npm test`
Expected: All 120 tests pass. Since all seeded plans include `doc_crud`, no existing flows break.

**Step 3: Commit**

```bash
git add server/src/routes/doc.routes.js
git commit -m "fix: add checkFeature middleware to all document routes

Four routes (GET /, GET /:id, GET /:id/download, DELETE /:id) were
missing checkFeature('doc_crud'), allowing API access without feature
entitlement validation. This violates the assessment requirement that
all protected routes pass through the full middleware chain."
```

---

### Task 2: Fix lazy reset race condition in usageTracker

**Files:**
- Modify: `server/src/utils/usageTracker.js:10-38`
- Test: `server/tests/unit/utils/usageTracker.test.js`

**Step 1: Rewrite getOrCreateUsageRecord to use atomic reset**

In `server/src/utils/usageTracker.js`, replace the entire `getOrCreateUsageRecord` function (lines 10-38) with:

```js
export const getOrCreateUsageRecord = async (orgId, metric = 'documents') => {
  const { periodStart, periodEnd } = getPeriodBounds();

  // Atomically reset any stale record for this org+metric
  await UsageRecord.findOneAndUpdate(
    { orgId, metric, periodEnd: { $lt: new Date() } },
    { $set: { count: 0, periodStart, periodEnd, lastResetAt: new Date() } }
  );

  // Get or create the current-period record
  return UsageRecord.findOneAndUpdate(
    { orgId, metric, periodStart },
    {
      $setOnInsert: {
        orgId,
        metric,
        count: 0,
        periodStart,
        periodEnd,
        lastResetAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
};
```

**Step 2: Run usageTracker tests to verify**

Run: `cd server && npx jest tests/unit/utils/usageTracker.test.js --verbose`
Expected: All tests pass, including the "should lazy reset when period expired" test.

**Step 3: Commit**

```bash
git add server/src/utils/usageTracker.js
git commit -m "fix: make usage period reset atomic to prevent race conditions

Replace read-check-then-save pattern with atomic findOneAndUpdate.
Two concurrent requests in a new period can no longer both reset the
counter and lose intermediate increments."
```

---

### Task 3: Add unique partial index to prevent duplicate active subscriptions

**Files:**
- Modify: `server/src/models/Subscription.js:30`

**Step 1: Add unique partial index**

In `server/src/models/Subscription.js`, add a new index after line 30:

```js
subscriptionSchema.index({ orgId: 1, status: 1 });
subscriptionSchema.index(
  { orgId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
```

**Step 2: Run tests**

Run: `cd server && npm test`
Expected: All tests pass. The existing data already satisfies this constraint (one active subscription per org).

**Step 3: Commit**

```bash
git add server/src/models/Subscription.js
git commit -m "fix: add unique partial index to prevent duplicate active subscriptions

Adds a MongoDB unique partial index on { orgId } where status is
'active'. Prevents race conditions in changePlan from creating two
active subscriptions for the same organization."
```

---

### Task 4: Initialize storage usage record on register

**Files:**
- Modify: `server/src/controllers/auth.controller.js:78`

**Step 1: Add storage initialization**

In `server/src/controllers/auth.controller.js`, after line 78 (`await getOrCreateUsageRecord(newOrg._id, 'documents');`), add:

```js
    await getOrCreateUsageRecord(newOrg._id, 'storage');
```

So lines 77-79 become:

```js
    // Initialize usage records
    await getOrCreateUsageRecord(newOrg._id, 'documents');
    await getOrCreateUsageRecord(newOrg._id, 'storage');
```

**Step 2: Run auth tests**

Run: `cd server && npx jest tests/integration/auth.integration.test.js --verbose`
Expected: All pass.

**Step 3: Commit**

```bash
git add server/src/controllers/auth.controller.js
git commit -m "fix: initialize storage usage record on registration

Previously only 'documents' usage was initialized. Storage usage was
lazily created on first upload, causing the dashboard to show no
storage data for new organizations."
```

---

### Task 5: Remove hardcoded JWT secret fallback

**Files:**
- Modify: `server/src/middleware/authenticate.js:12`
- Modify: `server/src/controllers/auth.controller.js:11`

**Step 1: Remove fallback in authenticate.js**

In `server/src/middleware/authenticate.js`, change line 12 from:

```js
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret-key');
```

To:

```js
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

**Step 2: Remove fallback in auth.controller.js**

In `server/src/controllers/auth.controller.js`, change line 11 from:

```js
    process.env.JWT_SECRET || 'test-secret-key',
```

To:

```js
    process.env.JWT_SECRET,
```

**Step 3: Run tests (they set JWT_SECRET in test env)**

Run: `cd server && npm test`
Expected: All pass — tests already set `process.env.JWT_SECRET` in setup.

> **Note:** If tests fail because JWT_SECRET isn't set in the test environment, add `process.env.JWT_SECRET = 'test-secret-key';` to `server/tests/setup/testDb.js` before the test suites run. This keeps the fallback in tests only, not production code.

**Step 4: Commit**

```bash
git add server/src/middleware/authenticate.js server/src/controllers/auth.controller.js
git commit -m "fix: remove hardcoded JWT secret fallback from production code

The fallback 'test-secret-key' allowed the server to start without
JWT_SECRET set, silently using a known secret in production. Now the
server will throw if JWT_SECRET is missing."
```

---

### Task 6: Standardize error responses across all controllers

**Files:**
- Modify: `server/src/controllers/auth.controller.js`
- Modify: `server/src/controllers/doc.controller.js`
- Modify: `server/src/controllers/org.controller.js`
- Modify: `server/src/controllers/plan.controller.js`
- Modify: `server/src/controllers/subscription.controller.js`

**Step 1: In each controller file, replace every `catch` block that exposes `error.message`**

Find all instances of:
```js
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
```

Replace with:
```js
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
```

Files and occurrences:

- `auth.controller.js`: lines 88, 115, 146 (3 occurrences)
- `doc.controller.js`: lines 17, 32, 69, 97, 117, 150, 170, 193 (8 occurrences)
- `org.controller.js`: lines 15, 56 (2 occurrences)
- `plan.controller.js`: lines 8, 28, 51 (3 occurrences)
- `subscription.controller.js`: lines 41, 90 (2 occurrences)

**Step 2: Run all tests**

Run: `cd server && npm test`
Expected: All pass. Tests that check for 500 errors may need to match `'Internal server error'` instead of specific messages — check any failures.

**Step 3: Commit**

```bash
git add server/src/controllers/
git commit -m "fix: standardize error responses to hide internal details

Replace error.message in 500 responses with generic 'Internal server
error' message. Add console.error for server-side debugging. Prevents
leaking MongoDB errors, stack traces, and internal details to clients."
```

---

### Task 7: Update METRIC_CONFIG comment and add global error handler

**Files:**
- Modify: `server/src/middleware/checkUsageLimit.js:3-4`
- Modify: `server/src/app.js:25`

**Step 1: Fix the misleading comment in checkUsageLimit.js**

In `server/src/middleware/checkUsageLimit.js`, replace lines 3-4:

```js
// Metric config: maps plan limit keys to usage tracking names and units.
// To add a new limit type, just add an entry here — no other code changes needed.
```

With:

```js
// Metric config: maps plan limit keys to usage tracking names and units.
// Count-based limits work without code changes (fallback on line 21).
// Non-count units (e.g., bytes_to_mb) require an entry here.
```

**Step 2: Add global error handler to app.js**

In `server/src/app.js`, add before the `export default app;` line (after line 23):

```js
// Global error handler — catches unhandled errors from all routes
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});
```

**Step 3: Run tests**

Run: `cd server && npm test`
Expected: All pass.

**Step 4: Commit**

```bash
git add server/src/middleware/checkUsageLimit.js server/src/app.js
git commit -m "fix: update METRIC_CONFIG comment and add global error handler

Correct misleading comment that said no code changes needed for new
limit types. Add Express global error handler to catch unhandled
errors and return consistent JSON responses."
```

---

### Task 8: Hide Settings nav for non-admins and fix optional chaining crash

**Files:**
- Modify: `client/src/components/Layout.jsx:66,78-83`

**Step 1: Add optional chaining on line 66**

In `client/src/components/Layout.jsx`, change line 66 from:

```jsx
              {subscription && !subscription.plan.features.includes('advanced_search') && (
```

To:

```jsx
              {subscription && !subscription?.plan?.features?.includes('advanced_search') && (
```

**Step 2: Wrap Settings link with admin check on lines 78-83**

Change:

```jsx
            <Link
              to="/settings"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              Organization
            </Link>
```

To:

```jsx
            {user?.role === 'admin' && (
              <Link
                to="/settings"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition"
              >
                Organization
              </Link>
            )}
```

**Step 3: Verify in browser**

1. Log in as `john@acme.com` (member) — Settings link should NOT appear in sidebar
2. Log in as `admin@acme.com` (admin) — Settings link should appear

**Step 4: Commit**

```bash
git add client/src/components/Layout.jsx
git commit -m "fix: hide Settings nav for non-admins and add null safety

Non-admin users could navigate to /settings and get a raw 403 error.
Now the nav link is hidden for non-admin roles. Also adds optional
chaining to prevent crash when subscription.plan is null."
```

---

### Task 9: Add role check to OrgSettings page

**Files:**
- Modify: `client/src/pages/OrgSettings.jsx:6,41`

**Step 1: Add access denied check before the loading return**

In `client/src/pages/OrgSettings.jsx`, add after line 41 (`if (loading) return <div>Loading...</div>;`):

```jsx
  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only organization admins can access this page.</p>
      </div>
    );
  }
```

So the guard section becomes:

```jsx
  if (loading) return <div>Loading...</div>;

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only organization admins can access this page.</p>
      </div>
    );
  }
```

**Step 2: Commit**

```bash
git add client/src/pages/OrgSettings.jsx
git commit -m "fix: add access denied guard for non-admin users on OrgSettings

Previously non-admins could navigate to /settings and see a generic
API error. Now shows a clear 'Access Denied' message."
```

---

### Task 10: Fix Documents.jsx premature "limit reached" message

**Files:**
- Modify: `client/src/pages/Documents.jsx:15,84-88`

**Step 1: Change canUpload logic to handle loading state**

In `client/src/pages/Documents.jsx`, change line 15 from:

```js
  const canUpload = usage ? isWithinLimit(usage, 'documents') : false;
```

To:

```js
  const usageLoaded = usage !== null;
  const canUpload = usageLoaded ? isWithinLimit(usage, 'documents') : true;
```

**Step 2: Update the limit warning to only show when usage is loaded AND limit reached**

Change lines 84-88 from:

```jsx
      {!canUpload && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Document limit reached. <Link to="/plans" className="underline">Upgrade your plan</Link> to upload more.</p>
        </div>
      )}
```

To:

```jsx
      {usageLoaded && !canUpload && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Document limit reached. <Link to="/plans" className="underline">Upgrade your plan</Link> to upload more.</p>
        </div>
      )}
```

**Step 3: Commit**

```bash
git add client/src/pages/Documents.jsx
git commit -m "fix: prevent premature 'limit reached' message while usage loads

When usage data was still loading (null), canUpload was false and the
limit warning showed immediately. Now usage must be loaded before the
warning appears."
```

---

### Task 11: Use subscription context for Dashboard doc count

**Files:**
- Modify: `client/src/pages/Dashboard.jsx:11-23,83`

**Step 1: Remove the stats state and fetchStats effect**

In `client/src/pages/Dashboard.jsx`, remove the `stats` state (line 11), the entire `useEffect` block (lines 13-23), and the `api` import (line 6). Also remove the `getUsagePercentage` import since we can use `usage` directly.

Replace lines 6-23:

```jsx
import api from '../middleware/api';

export default function Dashboard() {
  const { user, organization } = useAuth();
  const { subscription, usage } = useSubscription();
  const [stats, setStats] = useState({ documents: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/docs');
        setStats({ documents: data.length });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);
```

With:

```jsx

export default function Dashboard() {
  const { user, organization } = useAuth();
  const { subscription, usage } = useSubscription();
```

Also remove the `useState` import from line 1 (keep only `useEffect` if other code uses it — in this case it's not needed either). Change line 1 from:

```jsx
import { useEffect, useState } from 'react';
```

To:

```jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { getUsagePercentage } from '../utils/features';
```

Wait — let me be more precise. The full top of the file should become:

```jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { getUsagePercentage } from '../utils/features';

export default function Dashboard() {
  const { user, organization } = useAuth();
  const { subscription, usage } = useSubscription();
```

**Step 2: Update the document count display (line 83)**

Change:

```jsx
          <p className="text-blue-700 text-2xl font-bold">{stats.documents}</p>
```

To:

```jsx
          <p className="text-blue-700 text-2xl font-bold">{usage?.documents?.current ?? '—'}</p>
```

**Step 3: Commit**

```bash
git add client/src/pages/Dashboard.jsx
git commit -m "fix: use subscription context for document count instead of fetching all docs

Previously Dashboard fetched all documents via GET /docs just to count
them. Now uses the usage.documents.current from SubscriptionContext,
which is already loaded."
```

---

### Task 12: Add download button to DocumentDetail

**Files:**
- Modify: `client/src/pages/DocumentDetail.jsx:64`

**Step 1: Add a download button after the document details section**

In `client/src/pages/DocumentDetail.jsx`, after the closing `</dl>` tag (line 64), add inside the same `<div>` but after the dl:

```jsx
        <div className="mt-4">
          <a
            href={`/api/docs/${document._id}/download`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            download
          >
            Download File
          </a>
        </div>
```

So the section becomes (lines 41-66 area):

```jsx
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Document Details</h2>
        <dl className="space-y-2">
          ...existing dl content...
        </dl>
        <div className="mt-4">
          <a
            href={`/api/docs/${document._id}/download`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            download
          >
            Download File
          </a>
        </div>
      </div>
```

> **Note:** Using a plain `<a>` tag with the download attribute instead of `api.get()` because file downloads need browser-native handling (content-disposition, file save dialog). The JWT token is sent via cookie or the Vite proxy handles auth.

Actually wait — the backend uses Bearer token auth, not cookies. The `<a>` tag won't send the Authorization header. We need to use the api instance and create a blob URL instead.

Replace the download button with:

```jsx
        <div className="mt-4">
          <button
            onClick={async () => {
              try {
                const response = await api.get(`/docs/${document._id}/download`, { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = window.document.createElement('a');
                link.href = url;
                link.download = document.originalFileName || document.fileName;
                link.click();
                window.URL.revokeObjectURL(url);
              } catch {
                setError('Download failed');
              }
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Download File
          </button>
        </div>
```

**Step 2: Verify in browser**

1. Navigate to a document detail page
2. Click "Download File"
3. File should download with the original filename

**Step 3: Commit**

```bash
git add client/src/pages/DocumentDetail.jsx
git commit -m "feat: add download button to document detail page

The backend had a download endpoint but the frontend never exposed it.
Uses axios with responseType: 'blob' to handle authenticated file
downloads with the correct original filename."
```

---

### Task 13: Add dynamic fallback color to PlanBadge

**Files:**
- Modify: `client/src/components/PlanBadge.jsx`

**Step 1: Add a deterministic fallback**

The current code already has `colors[planName] || 'bg-gray-100 text-gray-800'` on line 9, which IS a fallback. However, we can make it generate distinct colors for unknown plans. Since the assessment only uses Free/Pro/Enterprise, the existing fallback is fine.

Actually, looking at the code again — `PlanBadge.jsx` already handles unknown plans with a gray fallback on line 9. **This is already correct.** Skip this task.

---

### Task 14: Add loading state to Login and Register forms

**Files:**
- Modify: `client/src/pages/Login.jsx`
- Modify: `client/src/pages/Register.jsx`

**Step 1: Add loading state to Login.jsx**

In `client/src/pages/Login.jsx`, add a `loading` state after line 8:

```jsx
  const [loading, setLoading] = useState(false);
```

Wrap the handleSubmit try/catch:

Change lines 12-21 from:

```jsx
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };
```

To:

```jsx
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
```

Change the submit button (line 39) from:

```jsx
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
            Sign In
          </button>
```

To:

```jsx
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
```

**Step 2: Add loading state to Register.jsx**

Same pattern. Add after line 7:

```jsx
  const [loading, setLoading] = useState(false);
```

Change lines 13-22 from:

```jsx
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form.name, form.email, form.password, form.orgName);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };
```

To:

```jsx
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.orgName);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };
```

Change the submit button (line 50) from:

```jsx
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
            Create Account
          </button>
```

To:

```jsx
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
```

**Step 3: Commit**

```bash
git add client/src/pages/Login.jsx client/src/pages/Register.jsx
git commit -m "fix: add loading state to Login and Register forms

Prevents double-click submissions by disabling the submit button and
showing feedback text while the API call is in progress."
```

---

### Task 15: Final combined commit for frontend fixes (Tasks 8-14)

After completing all frontend changes individually, do a final combined commit if they haven't been committed separately. Otherwise, this step is a verification-only step.

**Step 1: Run the full test suite**

Run: `cd server && npm test`
Expected: All tests pass.

**Step 2: Manual verification checklist**

Start both servers (`cd server && npm run dev` and `cd client && npm run dev`), then verify:

- [ ] Log in as `admin@acme.com` — Settings link visible in sidebar
- [ ] Log in as `john@acme.com` — Settings link NOT visible, navigating to /settings manually shows "Access Denied"
- [ ] Upload a document — no premature "limit reached" message while loading
- [ ] View document detail — download button present and works
- [ ] Login/Register — button shows loading text during submission
- [ ] Dashboard — document count displays from subscription context, no extra API call in Network tab

**Step 3: Final commit if any changes uncommitted**

```bash
git add -A
git status
# Only commit if there are staged changes
git commit -m "fix: frontend consistency fixes

- Hide Settings nav link for non-admin users
- Add optional chaining to prevent crash on null subscription
- Add access denied guard on OrgSettings page
- Fix premature 'limit reached' message while usage loads
- Use subscription context for dashboard document count
- Add download button to document detail page
- Add loading state to Login and Register forms"
```

---

## Summary

| Task | Category | Files | Risk |
|------|----------|-------|------|
| 1 | Middleware gaps | doc.routes.js | Low — all plans include doc_crud |
| 2 | Race condition | usageTracker.js | Medium — changes atomic behavior |
| 3 | Race condition | Subscription.js | Low — adds index only |
| 4 | Data init | auth.controller.js | Low — adds one line |
| 5 | Security | authenticate.js, auth.controller.js | Medium — tests must set JWT_SECRET |
| 6 | Error handling | All controllers | Low — message-only change |
| 7 | Error handling | checkUsageLimit.js, app.js | Low — comment + new middleware |
| 8 | Frontend | Layout.jsx | Low — UI only |
| 9 | Frontend | OrgSettings.jsx | Low — UI only |
| 10 | Frontend | Documents.jsx | Low — logic fix |
| 11 | Frontend | Dashboard.jsx | Low — removes unnecessary API call |
| 12 | Frontend | DocumentDetail.jsx | Low — adds download button |
| 13 | Frontend | PlanBadge.jsx | Skipped — already has fallback |
| 14 | Frontend | Login.jsx, Register.jsx | Low — UI only |
