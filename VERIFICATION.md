# End-to-End Verification Guide

## Prerequisites

### 1. MongoDB Atlas Setup

**Create a MongoDB Atlas Account:**
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up for a free account
3. Verify your email address

**Create a Cluster:**
1. Click "Build a Database"
2. Choose "M0 Free" tier
3. Select your preferred cloud provider and region
4. Click "Create Cluster" (takes 3-5 minutes)

**Create Database User:**
1. Go to "Database Access" in left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `dbuser` (or your choice)
5. Password: Generate a secure password (save it!)
6. Database User Privileges: "Atlas admin"
7. Click "Add User"

**Configure Network Access:**
1. Go to "Network Access" in left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production, restrict to specific IPs
4. Click "Confirm"

**Get Connection String:**
1. Go to "Database" in left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: Node.js, Version: 5.5 or later
5. Copy the connection string, it looks like:
   ```
   mongodb+srv://dbuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual database user password
7. Add database name after `.net/`: `multitenant-dms`

   Final format:
   ```
   mongodb+srv://dbuser:yourpassword@cluster0.xxxxx.mongodb.net/multitenant-dms?retryWrites=true&w=majority
   ```

### 2. Configure Server Environment

Edit `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://dbuser:yourpassword@cluster0.xxxxx.mongodb.net/multitenant-dms?retryWrites=true&w=majority
JWT_SECRET=generate-a-random-32-character-string-here
JWT_EXPIRES_IN=7d
```

**Generate a secure JWT_SECRET:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Or use any random 32+ character string
```

## Running the Application

### Step 1: Install Dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

### Step 2: Seed Plans Data

This creates three subscription plans in your database:

```bash
cd server
npm run seed
```

**Expected output:**
```
MongoDB connected: cluster0.xxxxx.mongodb.net
Seeded 3 plans:
  - Free: doc_crud | max docs: 10
  - Pro: doc_crud, sharing, versioning | max docs: 200
  - Enterprise: doc_crud, sharing, versioning, advanced_search | max docs: -1
```

**What gets created:**
- **Free Plan:** $0/month, 10 documents max, basic CRUD only
- **Pro Plan:** $29.99/month, 200 documents, includes sharing & versioning
- **Enterprise Plan:** $99.99/month, unlimited documents, all features including advanced search

### Step 3: Start the Server

```bash
cd server
npm run dev
```

**Expected output:**
```
[nodemon] starting `node server.js`
MongoDB connected: cluster0.xxxxx.mongodb.net
Server running on port 5000
```

**Verify server is running:**
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-02-18T..."}
```

### Step 4: Start the Client

In a new terminal:
```bash
cd client
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 5: Access the Application

Open your browser to: **http://localhost:5173**

You should see the login page.

## Manual Testing Scenarios

### Test 1: Registration & Free Plan Assignment

**Steps:**
1. Navigate to http://localhost:5173/register
2. Fill in the registration form:
   - **Organization Name:** "Acme Corporation"
   - **Your Name:** "John Doe"
   - **Email:** "john@acme.com"
   - **Password:** "password123"
3. Click "Create Account"

**Expected Results:**
- ✅ Redirected to Dashboard at `/dashboard`
- ✅ Top bar shows "Acme Corporation" and "Free" plan badge
- ✅ Subscription Status card shows:
  - Current Plan: Free
  - Status: active (green badge)
  - Expires: ~100 years from now
- ✅ Document Usage shows: 0 / 10 documents
- ✅ Green usage bar at 0%
- ✅ Quick links to Documents, Plans, Organization

**What happened behind the scenes:**
- Organization created with slug "acme-corporation"
- User created with role "admin"
- Free plan subscription automatically assigned
- Usage record initialized for documents metric

### Test 2: Document Upload (Within Limit)

**Steps:**
1. Click "Documents" in sidebar
2. Click "Upload Document" button
3. Fill in:
   - **Title:** "Q1 Financial Report"
   - **Description:** "Quarterly financial summary"
   - **File:** Select any file (PDF, DOCX, etc.)
4. Click "Upload"

**Expected Results:**
- ✅ Upload form closes
- ✅ Document appears in table with:
  - Title: "Q1 Financial Report"
  - Size in KB
  - Your name as uploader
  - Today's date
- ✅ Dashboard usage updates to 1 / 10
- ✅ Usage bar shows ~10% (green)

**Repeat 9 more times** to reach the limit (10 documents total).

### Test 3: Usage Limit Enforcement

**Steps:**
1. After uploading 10 documents, return to Documents page
2. Observe the "Upload Document" button

**Expected Results:**
- ✅ Button is disabled (gray, cursor-not-allowed)
- ✅ Yellow banner appears: "Document limit reached. Upgrade your plan to upload more."
- ✅ Dashboard shows 10 / 10 documents
- ✅ Usage bar at 100% (red)

**Try to upload via button:**
- Button is disabled, cannot click

**Try to upload via API (optional):**
```bash
curl -X POST http://localhost:5000/api/docs \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: multipart/form-data" \
  -F "title=Test" \
  -F "file=@somefile.pdf"
```

Expected: `429 Too Many Requests`
```json
{
  "error": "Limit reached: 10/10 documents",
  "currentUsage": 10,
  "limit": 10,
  "resetsAt": "2024-03-01T..."
}
```

### Test 4: Feature Gate - Document Sharing (Free Plan)

**Steps:**
1. Click on any document title to view details
2. Scroll to "Share Document" section

**Expected Results:**
- ✅ Gray box with message: "Document sharing is available on Pro and Enterprise plans."
- ✅ Blue link: "Upgrade to unlock sharing →"
- ✅ No sharing form or user list visible

**Try to share via API (optional):**
```bash
curl -X POST http://localhost:5000/api/docs/<docId>/share \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"userIds":[]}'
```

Expected: `403 Forbidden`
```json
{
  "error": "Feature 'sharing' is not available in your Free plan",
  "currentPlan": "Free",
  "requiredFeature": "sharing"
}
```

### Test 5: Feature Gate - Version Control (Free Plan)

**Steps:**
1. On document detail page, scroll to "Version History" section

**Expected Results:**
- ✅ Gray box with message: "Version control is available on Pro and Enterprise plans."
- ✅ Blue link: "Upgrade to unlock versioning →"
- ✅ No version list or upload button visible

### Test 6: Feature Gate - Advanced Search (Free Plan)

**Steps:**
1. Click "Search" in sidebar (note the lock icon)
2. View the Search page

**Expected Results:**
- ✅ Yellow box with:
  - Heading: "Enterprise Feature"
  - Message: "Advanced search is only available on the Enterprise plan."
  - Button: "Upgrade to Enterprise"
- ✅ No search input field visible

### Test 7: Plan Upgrade to Pro

**Steps:**
1. Click "Plans" in sidebar
2. View the three plan cards (Free, Pro, Enterprise)
3. Free plan has "Current Plan" badge
4. Click "Change to Pro" button on Pro card
5. Confirm the dialog

**Expected Results:**
- ✅ Alert: "Plan changed successfully!"
- ✅ Page refreshes
- ✅ Pro plan now has "Current Plan" badge
- ✅ Return to Dashboard
- ✅ Top bar shows "Pro" plan badge (blue)
- ✅ Usage shows X / 200 documents
- ✅ Usage bar color recalculates (likely green now)

### Test 8: Sharing Feature Unlocked (Pro Plan)

**Steps:**
1. Go to any document detail page
2. Scroll to "Share Document" section

**Expected Results:**
- ✅ No upgrade prompt
- ✅ Shows: "Shared with: 0 users"
- ✅ Sharing functionality available (though UI may be basic)

### Test 9: Version Control Unlocked (Pro Plan)

**Steps:**
1. On document detail page, scroll to "Version History"

**Expected Results:**
- ✅ No upgrade prompt
- ✅ Shows: "Current Version: 1"
- ✅ Version list displays (currently just version 1)

### Test 10: Advanced Search Still Locked (Pro Plan)

**Steps:**
1. Click "Search" in sidebar
2. View Search page

**Expected Results:**
- ✅ Still shows "Enterprise Feature" message
- ✅ Search form NOT visible
- ✅ Advanced search is Enterprise-only

### Test 11: Upgrade to Enterprise

**Steps:**
1. Go to Plans page
2. Click "Change to Enterprise"
3. Confirm

**Expected Results:**
- ✅ Success message
- ✅ Enterprise plan now current
- ✅ Dashboard shows "Enterprise" badge (purple)
- ✅ Usage shows X / ∞ (unlimited symbol)
- ✅ Usage bar shows 0% (always, since unlimited)

### Test 12: Advanced Search Unlocked (Enterprise Plan)

**Steps:**
1. Click "Search" in sidebar
2. View Search page

**Expected Results:**
- ✅ Search input field visible
- ✅ "Search" button visible
- ✅ No upgrade prompt

**Test search:**
1. Enter a search term (e.g., "Financial")
2. Click "Search"

**Expected Results:**
- ✅ Results display matching documents
- ✅ Shows document title, description, uploader, date, size
- ✅ Click result to view document

### Test 13: Organization Management (Admin Only)

**Steps:**
1. Click "Organization" in sidebar
2. View organization details
3. Click "Add User" button
4. Fill in:
   - **Name:** "Jane Smith"
   - **Email:** "jane@acme.com"
   - **Password:** "password123"
   - **Role:** Member
5. Click "Add User"

**Expected Results:**
- ✅ Form closes
- ✅ Jane appears in members table
- ✅ Shows: name, email, role badge (gray "member"), join date

**Test with member account:**
1. Logout
2. Login as jane@acme.com
3. Go to Organization page
4. "Add User" button should NOT be visible (member role)

### Test 14: Document Deletion & Usage Decrement

**Steps:**
1. Go to Documents page
2. Note current usage (e.g., 10 / 200)
3. Click "Delete" on any document
4. Confirm deletion

**Expected Results:**
- ✅ Document removed from list
- ✅ Usage decrements (e.g., 9 / 200)
- ✅ Dashboard reflects new count

### Test 15: Monthly Usage Reset (Simulated)

**Manual database edit required:**

1. Open MongoDB Atlas
2. Go to Collections → usagerecords
3. Find your organization's record
4. Edit `periodEnd` to a past date (e.g., yesterday)
5. Save

**Then in app:**
1. Refresh any page
2. Upload a document or view dashboard

**Expected Results:**
- ✅ Usage resets to 0 (or current document count)
- ✅ `periodStart` updates to current month start
- ✅ `periodEnd` updates to current month end
- ✅ `lastResetAt` updates to now

### Test 16: Subscription Expiry

**Manual database edit required:**

1. Open MongoDB Atlas
2. Go to Collections → subscriptions
3. Find your organization's subscription
4. Edit `endDate` to yesterday's date
5. Save

**Then in app:**
1. Try to access any protected route (Dashboard, Documents, etc.)

**Expected Results:**
- ✅ API returns 403 Forbidden
- ✅ Error message: "Subscription expired"
- ✅ `expiredAt` timestamp included
- ✅ Subscription status changed to "expired" in database

## API Testing with cURL

### Get Plans List
```bash
curl http://localhost:5000/api/plans
```

Expected: Array of 3 plans with features and limits

### Register New Organization
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "orgName": "Test Organization"
  }'
```

Expected: 201 with token, user, and organization data

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Expected: 200 with token, user, and organization data

**Save the token for subsequent requests!**

### Get Current User
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

Expected: User, organization, subscription, and usage data

### Get Current Subscription
```bash
curl http://localhost:5000/api/subscription \
  -H "Authorization: Bearer <your-token>"
```

Expected: Subscription details with plan and usage

### Change Plan (Admin Only)
```bash
# First, get the Pro plan ID from /api/plans
curl -X POST http://localhost:5000/api/subscription/change \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"planId": "<pro-plan-id>"}'
```

Expected: 200 with new subscription details

### List Documents
```bash
curl http://localhost:5000/api/docs \
  -H "Authorization: Bearer <your-token>"
```

Expected: Array of documents for your organization

### Upload Document
```bash
curl -X POST http://localhost:5000/api/docs \
  -H "Authorization: Bearer <your-token>" \
  -F "title=Test Document" \
  -F "description=Test description" \
  -F "file=@/path/to/file.pdf"
```

Expected: 201 with document data (if within limits and has doc_crud feature)

### Delete Document
```bash
curl -X DELETE http://localhost:5000/api/docs/<document-id> \
  -H "Authorization: Bearer <your-token>"
```

Expected: 200 with success message

## Verification Checklist

### Backend
- [ ] Server starts without errors
- [ ] MongoDB connection successful
- [ ] Plans seeded (3 plans in database)
- [ ] Health endpoint responds
- [ ] JWT authentication works
- [ ] Middleware chain executes in order

### Authentication
- [ ] Registration creates org + user + Free subscription
- [ ] Login returns valid JWT
- [ ] JWT expires after configured time
- [ ] Invalid credentials rejected
- [ ] Duplicate email rejected

### Subscription Management
- [ ] Free plan assigned on registration
- [ ] Plan change works (Free → Pro → Enterprise)
- [ ] Subscription status displayed correctly
- [ ] Expired subscriptions block access

### Feature Gating
- [ ] Sharing blocked on Free
- [ ] Sharing allowed on Pro/Enterprise
- [ ] Versioning blocked on Free
- [ ] Versioning allowed on Pro/Enterprise
- [ ] Advanced search blocked on Free/Pro
- [ ] Advanced search allowed on Enterprise

### Usage Limits
- [ ] Document count tracked correctly
- [ ] Upload blocked at limit (Free: 10, Pro: 200)
- [ ] Unlimited works on Enterprise
- [ ] Usage increments on upload
- [ ] Usage decrements on delete
- [ ] Monthly reset works

### Multi-tenancy
- [ ] Organizations isolated (can't see other org's data)
- [ ] Users belong to one organization
- [ ] Documents scoped to organization

### Role-Based Access
- [ ] Admin can add users
- [ ] Admin can change plans
- [ ] Members cannot add users
- [ ] Members cannot change plans

### Frontend
- [ ] Client starts without errors
- [ ] Login/Register pages work
- [ ] Dashboard displays correctly
- [ ] Documents page functional
- [ ] Plans page shows all plans
- [ ] Organization page works
- [ ] Feature gates display correctly
- [ ] Usage bars color-coded properly
- [ ] Logout works

## Troubleshooting

### Server won't start
- Check MongoDB URI is correct
- Verify network access allows your IP
- Ensure database user credentials are correct
- Check PORT is not already in use

### "MongoDB connection error"
- Verify connection string format
- Check password doesn't contain special characters (URL encode if needed)
- Ensure database name is included in URI
- Verify cluster is running in Atlas

### "No active subscription" error
- Run seed script to create plans
- Check subscriptions collection has a record for your org
- Verify subscription status is 'active'
- Check endDate is in the future

### Plans not seeding
- Verify MongoDB connection works
- Check plans collection is empty before seeding
- Look for error messages in seed output

### JWT errors
- Verify JWT_SECRET is set in .env
- Check token is being sent in Authorization header
- Ensure token hasn't expired

### CORS errors
- Server and client must be running
- Check proxy configuration in vite.config.js
- Verify CORS is enabled in server

## Success Criteria

✅ **All 16 manual tests pass**
✅ **API endpoints return expected responses**
✅ **Feature gating enforced server-side**
✅ **Usage limits enforced correctly**
✅ **Multi-tenant isolation verified**
✅ **Role-based access working**
✅ **Subscription lifecycle managed properly**
