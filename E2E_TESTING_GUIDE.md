# End-to-End Testing Guide

Complete step-by-step instructions to test all features of the Multi-Tenant SaaS DMS application in the browser.

---

## Prerequisites

1. Server running on `http://localhost:5000`
2. Client running on `http://localhost:5173`
3. MongoDB seeded with plans (run `npm run seed` in server folder)

---

## Test Scenarios

### Phase 1: Authentication

#### Test 1.1: Register New Organization
1. Open browser to `http://localhost:5173/register`
2. Fill in the form:
   - **Organization Name**: `Test Org 1`
   - **Your Name**: `John Admin`
   - **Email**: `john@testorg1.com`
   - **Password**: `password123`
3. Click "Create Account"
4. **Expected**: Redirect to Dashboard, user logged in as admin

#### Test 1.2: Login
1. Click "Sign Out" (if logged in)
2. Navigate to `http://localhost:5173/login`
3. Enter credentials:
   - **Email**: `john@testorg1.com`
   - **Password**: `password123`
4. Click "Sign In"
5. **Expected**: Redirect to Dashboard

#### Test 1.3: Login with Invalid Credentials
1. Enter wrong password
2. Click "Sign In"
3. **Expected**: Error message displayed

---

### Phase 2: Dashboard & Subscription

#### Test 2.1: View Dashboard
1. After login, view Dashboard
2. **Expected to see**:
   - Organization name
   - Current plan (Free)
   - Document usage (e.g., 0/10)
   - Quick stats

#### Test 2.2: View Plans Page
1. Navigate to `/plans`
2. **Expected to see**: Three plans (Free, Pro, Enterprise) with features and pricing

---

### Phase 3: Document Management (Free Plan)

#### Test 3.1: Upload Document (Within Limit)
1. Navigate to `/documents`
2. Click "Upload" button
3. Select a small file (text, image, or PDF)
4. **Expected**: Document appears in list

#### Test 3.2: Upload Document (At Limit)
1. Upload documents until reaching 10 (Free plan limit)
2. Try to upload one more
3. **Expected**: Error message about reaching limit

#### Test 3.3: View Document
1. Click on a document name
2. **Expected**: Navigate to Document Detail page

#### Test 3.4: Delete Document
1. On Documents list, click delete/trash icon
2. Confirm deletion if prompted
3. **Expected**: Document removed from list, usage count decreases

---

### Phase 4: Feature Gating Tests

#### Test 4.1: Test Sharing Feature (Free Plan - Should Fail)
1. As Free plan user, try to share a document
2. **Expected**: "Upgrade to Pro" message or feature unavailable

#### Test 4.2: Test Versioning Feature (Free Plan - Should Fail)
1. As Free plan user, try to upload new version
2. **Expected**: "Upgrade to Pro" message

#### Test 4.3: Test Search Feature (Free Plan - Should Fail)
1. Navigate to `/search`
2. Try to use advanced search
3. **Expected**: "Enterprise only" message

---

### Phase 5: Subscription Upgrade

#### Test 5.1: Upgrade to Pro Plan
1. Go to `/plans`
2. Click "Upgrade" or "Select" on Pro plan ($29.99)
3. Confirm upgrade (mock - no real payment)
4. **Expected**:
   - Subscription status changes to Pro
   - Usage limit increases to 200
   - Sharing and Versioning features become available

#### Test 5.2: Verify Pro Features Work
1. Upload documents (should work up to 200)
2. Try sharing a document - **Expected**: Should work now
3. Try versioning - **Expected**: Should work now

---

### Phase 6: Multi-Tenant Isolation

#### Test 6.1: Create Second Organization
1. Sign out
2. Register new account:
   - **Organization Name**: `Test Org 2`
   - **Email**: `jane@testorg2.com`
   - **Password**: `password123`
3. **Expected**: New organization created with separate data

#### Test 6.2: Verify Data Isolation
1. As Org 2 user, view Documents
2. **Expected**: Should NOT see Org 1's documents
3. **Expected**: Should show Org 2's plan and usage

---

### Phase 7: Organization Settings

#### Test 7.1: View Org Settings (As Admin)
1. Navigate to `/org-settings`
2. **Expected to see**:
   - Organization name
   - Plan details
   - Usage statistics

#### Test 7.2: Add User (As Admin)
1. In Org Settings, find "Add User" section
2. Enter:
   - **Name**: `New Member`
   - **Email**: `member@testorg1.com`
   - **Password**: `password123`
3. Click Add
4. **Expected**: User added to organization

---

### Phase 8: Edge Cases

#### Test 8.1: Session Expiry
1. Wait for JWT to expire (or modify JWT_EXPIRES_IN to test)
2. Try to access protected page
3. **Expected**: Redirect to login

#### Test 8.2: Direct URL Access
1. Copy URL of a protected page
2. Open in incognito window without login
3. **Expected**: Redirect to login

#### Test 8.3: Invalid Document ID
1. Navigate to `/documents/invalid-id-123`
2. **Expected**: Error message or redirect

---

## Testing Report Template

Fill this out after testing:

| Test Case | Status | Expected | Actual | Notes/Issues |
|-----------|--------|----------|--------|--------------|
| Register Org 1 | PASS/FAIL | Redirect to Dashboard | ? | |
| Upload Document | PASS/FAIL | Document in list | ? | |
| ... | | | | |

### Issues Found:

1. **[Issue Title]**
   - **Location**: Page/Component
   - **Expected Behavior**:
   - **Actual Behavior**:
   - **Severity**: Critical/High/Medium/Low

2. ...

---

## Running Tests from Browser Console

If you need to debug API calls:

```javascript
// Check current user
fetch('http://localhost:5000/api/auth/me', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(console.log)

// Check subscription
fetch('http://localhost:5000/api/subscription', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(console.log)

// List documents
fetch('http://localhost:5000/api/docs', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(console.log)
```

---

## Notes

- Free plan: 10 documents max
- Pro plan: 200 documents, sharing, versioning
- Enterprise: Unlimited, advanced search
- Plans must be seeded via `npm run seed` on first run
