# Multi-Tenant SaaS Document Management System

A full-stack MERN application demonstrating subscription-based feature entitlements and usage limits.

## Features

- **Multi-tenant Architecture:** Organization-based data isolation
- **Subscription Plans:** Free, Pro, Enterprise with different feature sets
- **Feature Gating:** Server-side middleware enforces plan-based access
- **Usage Limits:** Monthly document limits with automatic reset
- **Document Management:** Upload, view, delete documents
- **Document Sharing:** Pro+ feature for sharing documents with team members
- **Version Control:** Pro+ feature for document versioning
- **Advanced Search:** Enterprise-only full-text search
- **Team Management:** Admin-only user management
- **Role-Based Access:** Admin and member roles

## Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB Atlas with Mongoose
- JWT authentication
- bcryptjs for password hashing
- Multer for file uploads

**Frontend:**
- React 18 with Vite
- Tailwind CSS
- React Router v6
- Axios with interceptors
- Context API for state management

## Architecture

### Middleware Chain
Every protected API route passes through:
1. `authenticate` - Verifies JWT and attaches user
2. `attachSubscription` - Loads active subscription and checks expiry
3. `checkFeature(featureName)` - Validates plan includes feature
4. `checkUsageLimit(metric)` - Enforces usage limits

### Subscription Plans

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Documents | 10 | 200 | Unlimited |
| Document CRUD | ✅ | ✅ | ✅ |
| Sharing | ❌ | ✅ | ✅ |
| Versioning | ❌ | ✅ | ✅ |
| Advanced Search | ❌ | ❌ | ✅ |
| Price | $0 | $29.99 | $99.99 |

## Project Structure

```
.
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection
│   │   ├── models/
│   │   │   ├── Plan.js               # Subscription plans
│   │   │   ├── Organization.js       # Multi-tenant orgs
│   │   │   ├── User.js               # Users with roles
│   │   │   ├── Subscription.js       # Org subscriptions
│   │   │   ├── Document.js           # Documents with versions
│   │   │   └── UsageRecord.js        # Usage tracking
│   │   ├── middleware/
│   │   │   ├── authenticate.js       # JWT verification
│   │   │   ├── attachSubscription.js # Load subscription
│   │   │   ├── checkFeature.js       # Feature gate
│   │   │   ├── checkUsageLimit.js    # Usage enforcement
│   │   │   └── adminOnly.js          # Role check
│   │   ├── controllers/
│   │   │   ├── auth.controller.js    # Register, login, getMe
│   │   │   ├── plan.controller.js    # List plans
│   │   │   ├── subscription.controller.js # Manage subscription
│   │   │   ├── doc.controller.js     # Document CRUD
│   │   │   └── org.controller.js     # Org management
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── plan.routes.js
│   │   │   ├── subscription.routes.js
│   │   │   ├── doc.routes.js
│   │   │   └── org.routes.js
│   │   ├── utils/
│   │   │   └── usageTracker.js       # Usage increment/decrement
│   │   ├── seeds/
│   │   │   └── plans.seed.js         # Seed plans
│   │   └── app.js                    # Express app
│   ├── server.js                     # Entry point
│   ├── .env                          # Environment variables
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       # Auth state
│   │   │   └── SubscriptionContext.jsx # Subscription state
│   │   ├── middleware/
│   │   │   └── api.js                # Axios instance
│   │   ├── utils/
│   │   │   └── features.js           # Feature helpers
│   │   ├── components/
│   │   │   ├── Layout.jsx            # App layout
│   │   │   ├── FeatureGate.jsx       # Feature gate component
│   │   │   ├── UsageBar.jsx          # Usage visualization
│   │   │   ├── UpgradeBanner.jsx     # Upgrade prompt
│   │   │   ├── PlanBadge.jsx         # Plan badge
│   │   │   └── SubscriptionStatus.jsx # Status display
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Documents.jsx
│   │   │   ├── DocumentDetail.jsx
│   │   │   ├── Search.jsx
│   │   │   ├── Plans.jsx
│   │   │   └── OrgSettings.jsx
│   │   ├── App.jsx                   # Router setup
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
│
└── VERIFICATION.md                   # Testing guide
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- npm or yarn

### Installation

1. **Clone and navigate to the project:**
```bash
cd multi-tenant-saas-app
```

2. **Set up the server:**
```bash
cd server
npm install
```

3. **Configure environment variables:**
Create `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/multitenant-dms?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

4. **Seed the database:**
```bash
npm run seed
```

5. **Start the server:**
```bash
npm run dev
```

6. **Set up the client (new terminal):**
```bash
cd client
npm install
npm run dev
```

7. **Access the application:**
Open http://localhost:5173

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new organization
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Plans
- `GET /api/plans` - List all plans

### Subscription
- `GET /api/subscription` - Get current subscription
- `POST /api/subscription/change` - Change plan (admin only)

### Documents
- `GET /api/docs` - List documents
- `GET /api/docs/:id` - Get document
- `POST /api/docs` - Upload document (requires doc_crud feature + usage check)
- `DELETE /api/docs/:id` - Delete document
- `POST /api/docs/:id/share` - Share document (requires sharing feature)
- `POST /api/docs/:id/version` - Upload new version (requires versioning feature)
- `GET /api/docs/search?q=query` - Search documents (requires advanced_search feature)

### Organization
- `GET /api/org` - Get organization details
- `POST /api/org/users` - Add user (admin only)

## Key Implementation Details

### Usage Tracking
- Monthly reset (first day of month)
- Lazy reset on first access after period end
- Atomic increment/decrement operations
- Prevents negative counts

### Subscription Lifecycle
- Lazy expiration check on each request
- Auto-transitions to 'expired' status
- Free plan never expires (100-year endDate)
- Paid plans default to 1-month duration

### Security
- JWT-based authentication
- Password hashing with bcryptjs
- Multi-tenant data isolation via orgId
- Server-side enforcement of all entitlements

## Testing

See [VERIFICATION.md](./VERIFICATION.md) for comprehensive testing guide.

## Production Considerations

Before deploying to production:

1. **File Storage:** Replace multer.memoryStorage() with S3 or disk storage
2. **Environment Variables:** Use secure secrets, not defaults
3. **Payment Integration:** Add Stripe/PayPal for plan changes
4. **Email Service:** Add email verification and notifications
5. **Rate Limiting:** Add rate limiting middleware
6. **HTTPS:** Enable SSL/TLS
7. **Error Logging:** Add Sentry or similar
8. **Database Indexes:** Verify all indexes are created
9. **CORS:** Configure CORS for production domains
10. **Session Management:** Consider Redis for session storage

## License

MIT

## Author

Built as a demonstration of subscription-based SaaS architecture with feature entitlements.
