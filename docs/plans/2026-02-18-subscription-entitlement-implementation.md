# Subscription & Feature Entitlement System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-tenant Document Management System with database-driven subscription plans, API-level feature entitlement enforcement, usage limit tracking, and subscription lifecycle management.

**Architecture:** MERN stack with centralized Express middleware chain (authenticate → attachSubscription → checkFeature → checkUsageLimit) gating every API route. MongoDB Atlas stores plans, subscriptions, usage records, and documents. React frontend with Tailwind CSS provides UX gating backed by server-side enforcement.

**Tech Stack:** MongoDB Atlas, Express.js, React 18, Node.js, Tailwind CSS, JWT (jsonwebtoken), bcryptjs, Mongoose, Axios, React Router, Multer (file uploads), Vite

**Design Doc:** `docs/plans/2026-02-18-subscription-entitlement-design.md`

---

## Task 1: Server Project Scaffolding & Database Connection

**Files:**
- Create: `server/package.json`
- Create: `server/.env`
- Create: `server/src/config/db.js`
- Create: `server/src/app.js`
- Create: `server/server.js`

**Step 1: Initialize server project**

```bash
cd D:\Projects\docsvault
mkdir server
cd server
npm init -y
npm install express mongoose dotenv cors jsonwebtoken bcryptjs multer
npm install --save-dev nodemon
```

**Step 2: Create .env file**

Create `server/.env`:
```
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/multitenant-dms?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

**Step 3: Create database connection**

Create `server/src/config/db.js`:
```js
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
```

**Step 4: Create Express app**

Create `server/src/app.js`:
```js
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
```

Create `server/server.js`:
```js
import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/db.js';

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
```

**Step 5: Update package.json scripts**

Add to `server/package.json`:
```json
{
  "type": "module",
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "seed": "node src/seeds/plans.seed.js"
  }
}
```

**Step 6: Verify server starts**

Run: `cd server && npm run dev`
Expected: "MongoDB connected" + "Server running on port 5000"
Test: `curl http://localhost:5000/api/health` → `{ "status": "ok" }`

**Step 7: Commit**

```bash
git init
git add server/package.json server/src/ server/server.js server/.env
git commit -m "feat: scaffold Express server with MongoDB Atlas connection"
```

---

## Task 2: Mongoose Models

**Files:**
- Create: `server/src/models/Plan.js`
- Create: `server/src/models/Organization.js`
- Create: `server/src/models/User.js`
- Create: `server/src/models/Subscription.js`
- Create: `server/src/models/Document.js`
- Create: `server/src/models/UsageRecord.js`

**Step 1: Create Plan model**

Create `server/src/models/Plan.js`:
```js
import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  features: [{
    type: String,
    enum: ['doc_crud', 'sharing', 'versioning', 'advanced_search']
  }],
  limits: {
    maxDocuments: {
      type: Number,
      required: true  // -1 = unlimited
    }
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('Plan', planSchema);
```

**Step 2: Create Organization model**

Create `server/src/models/Organization.js`:
```js
import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  }
}, { timestamps: true });

organizationSchema.index({ slug: 1 }, { unique: true });

export default mongoose.model('Organization', organizationSchema);
```

**Step 3: Create User model**

Create `server/src/models/User.js`:
```js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  }
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ orgId: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
```

**Step 4: Create Subscription model**

Create `server/src/models/Subscription.js`:
```js
import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired'],
    default: 'active'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  }
}, { timestamps: true });

subscriptionSchema.index({ orgId: 1, status: 1 });

export default mongoose.model('Subscription', subscriptionSchema);
```

**Step 5: Create UsageRecord model**

Create `server/src/models/UsageRecord.js`:
```js
import mongoose from 'mongoose';

const usageRecordSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  metric: {
    type: String,
    required: true,
    default: 'documents'
  },
  count: {
    type: Number,
    default: 0
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  lastResetAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

usageRecordSchema.index(
  { orgId: 1, metric: 1, periodStart: 1 },
  { unique: true }
);

export default mongoose.model('UsageRecord', usageRecordSchema);
```

**Step 6: Create Document model**

Create `server/src/models/Document.js`:
```js
import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  versions: [versionSchema],
  currentVersion: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

documentSchema.index({ orgId: 1 });
documentSchema.index({ orgId: 1, title: 'text' });

export default mongoose.model('Document', documentSchema);
```

**Step 7: Commit**

```bash
git add server/src/models/
git commit -m "feat: add Mongoose models for all collections with indexes"
```

---

## Task 3: Seed Plans Data

**Files:**
- Create: `server/src/seeds/plans.seed.js`

**Step 1: Create seed script**

Create `server/src/seeds/plans.seed.js`:
```js
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Plan from '../models/Plan.js';

const plans = [
  {
    name: 'Free',
    features: ['doc_crud'],
    limits: { maxDocuments: 10 },
    price: 0,
    isActive: true
  },
  {
    name: 'Pro',
    features: ['doc_crud', 'sharing', 'versioning'],
    limits: { maxDocuments: 200 },
    price: 29.99,
    isActive: true
  },
  {
    name: 'Enterprise',
    features: ['doc_crud', 'sharing', 'versioning', 'advanced_search'],
    limits: { maxDocuments: -1 },
    price: 99.99,
    isActive: true
  }
];

const seedPlans = async () => {
  try {
    await connectDB();
    await Plan.deleteMany({});
    const created = await Plan.insertMany(plans);
    console.log(`Seeded ${created.length} plans:`);
    created.forEach(p => console.log(`  - ${p.name}: ${p.features.join(', ')} | max docs: ${p.limits.maxDocuments}`));
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seedPlans();
```

**Step 2: Run seed**

Run: `cd server && npm run seed`
Expected: "Seeded 3 plans: Free, Pro, Enterprise"

**Step 3: Commit**

```bash
git add server/src/seeds/
git commit -m "feat: add plan seed script with Free/Pro/Enterprise tiers"
```

---

## Task 4: Usage Tracker Utility

**Files:**
- Create: `server/src/utils/usageTracker.js`

**Step 1: Create usage tracker**

Create `server/src/utils/usageTracker.js`:
```js
import UsageRecord from '../models/UsageRecord.js';

const getPeriodBounds = () => {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { periodStart, periodEnd };
};

export const getOrCreateUsageRecord = async (orgId, metric = 'documents') => {
  const { periodStart, periodEnd } = getPeriodBounds();

  const record = await UsageRecord.findOneAndUpdate(
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

  // Lazy reset: if the record's periodEnd has passed, reset it
  if (record.periodEnd < new Date()) {
    record.count = 0;
    record.periodStart = periodStart;
    record.periodEnd = periodEnd;
    record.lastResetAt = new Date();
    await record.save();
  }

  return record;
};

export const incrementUsage = async (orgId, metric = 'documents') => {
  const { periodStart, periodEnd } = getPeriodBounds();

  return UsageRecord.findOneAndUpdate(
    { orgId, metric, periodStart },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        periodEnd,
        lastResetAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
};

export const decrementUsage = async (orgId, metric = 'documents') => {
  const { periodStart } = getPeriodBounds();

  return UsageRecord.findOneAndUpdate(
    { orgId, metric, periodStart, count: { $gt: 0 } },
    { $inc: { count: -1 } },
    { new: true }
  );
};
```

**Step 2: Commit**

```bash
git add server/src/utils/
git commit -m "feat: add usage tracker with lazy monthly reset and atomic increment/decrement"
```

---

## Task 5: Entitlement Middleware Chain

**Files:**
- Create: `server/src/middleware/authenticate.js`
- Create: `server/src/middleware/attachSubscription.js`
- Create: `server/src/middleware/checkFeature.js`
- Create: `server/src/middleware/checkUsageLimit.js`
- Create: `server/src/middleware/adminOnly.js`

**Step 1: Create authenticate middleware**

Create `server/src/middleware/authenticate.js`:
```js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      userId: user._id,
      orgId: user.orgId,
      role: user.role,
      name: user.name,
      email: user.email
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authenticate;
```

**Step 2: Create attachSubscription middleware**

Create `server/src/middleware/attachSubscription.js`:
```js
import Subscription from '../models/Subscription.js';

const attachSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({
      orgId: req.user.orgId,
      status: 'active'
    }).populate('planId');

    if (!subscription) {
      return res.status(403).json({ error: 'No active subscription' });
    }

    // Check expiration — lazy lifecycle transition
    if (subscription.endDate < new Date()) {
      subscription.status = 'expired';
      await subscription.save();
      return res.status(403).json({
        error: 'Subscription expired',
        expiredAt: subscription.endDate
      });
    }

    req.subscription = {
      id: subscription._id,
      plan: subscription.planId,
      status: subscription.status,
      endDate: subscription.endDate
    };

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to verify subscription' });
  }
};

export default attachSubscription;
```

**Step 3: Create checkFeature middleware**

Create `server/src/middleware/checkFeature.js`:
```js
const checkFeature = (featureName) => {
  return (req, res, next) => {
    const { plan } = req.subscription;

    if (!plan.features.includes(featureName)) {
      return res.status(403).json({
        error: `Feature '${featureName}' is not available in your ${plan.name} plan`,
        currentPlan: plan.name,
        requiredFeature: featureName
      });
    }

    next();
  };
};

export default checkFeature;
```

**Step 4: Create checkUsageLimit middleware**

Create `server/src/middleware/checkUsageLimit.js`:
```js
import { getOrCreateUsageRecord } from '../utils/usageTracker.js';

const checkUsageLimit = (metric) => {
  return async (req, res, next) => {
    try {
      const { plan } = req.subscription;
      const limit = plan.limits[metric];

      // -1 means unlimited
      if (limit === -1) {
        return next();
      }

      const usageRecord = await getOrCreateUsageRecord(req.user.orgId, metric === 'maxDocuments' ? 'documents' : metric);

      if (usageRecord.count >= limit) {
        return res.status(429).json({
          error: `Limit reached: ${usageRecord.count}/${limit} ${metric === 'maxDocuments' ? 'documents' : metric}`,
          currentUsage: usageRecord.count,
          limit,
          resetsAt: usageRecord.periodEnd
        });
      }

      req.usageRecord = usageRecord;
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to check usage limit' });
    }
  };
};

export default checkUsageLimit;
```

**Step 5: Create adminOnly middleware**

Create `server/src/middleware/adminOnly.js`:
```js
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export default adminOnly;
```

**Step 6: Commit**

```bash
git add server/src/middleware/
git commit -m "feat: add entitlement middleware chain — authenticate, attachSubscription, checkFeature, checkUsageLimit, adminOnly"
```

---

## Task 6: Auth Routes & Controller

**Files:**
- Create: `server/src/controllers/auth.controller.js`
- Create: `server/src/routes/auth.routes.js`
- Modify: `server/src/app.js` — mount auth routes

**Step 1: Create auth controller**

Create `server/src/controllers/auth.controller.js`:
```js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import { getOrCreateUsageRecord } from '../utils/usageTracker.js';

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, orgId: user.orgId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

export const register = async (req, res) => {
  try {
    const { name, email, password, orgName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create organization
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return res.status(400).json({ error: 'Organization name already taken' });
    }

    const org = await Organization.create({ name: orgName, slug });

    // Create admin user
    const user = await User.create({
      name,
      email,
      password,
      orgId: org._id,
      role: 'admin'
    });

    // Assign Free plan by default
    const freePlan = await Plan.findOne({ name: 'Free' });
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 100); // Free plan doesn't expire

    await Subscription.create({
      orgId: org._id,
      planId: freePlan._id,
      status: 'active',
      startDate: new Date(),
      endDate
    });

    // Initialize usage record
    await getOrCreateUsageRecord(org._id, 'documents');

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      organization: { id: org._id, name: org.name, slug: org.slug }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const org = await Organization.findById(user.orgId);
    const token = generateToken(user);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      organization: { id: org._id, name: org.name, slug: org.slug }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId);
    const subscription = await Subscription.findOne({
      orgId: req.user.orgId,
      status: 'active'
    }).populate('planId');

    const usageRecord = await getOrCreateUsageRecord(req.user.orgId, 'documents');

    res.json({
      user: req.user,
      organization: org,
      subscription: subscription ? {
        plan: subscription.planId,
        status: subscription.status,
        endDate: subscription.endDate
      } : null,
      usage: {
        documents: usageRecord.count,
        limit: subscription ? subscription.planId.limits.maxDocuments : 0,
        resetsAt: usageRecord.periodEnd
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

**Step 2: Create auth routes**

Create `server/src/routes/auth.routes.js`:
```js
import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller.js';
import authenticate from '../middleware/authenticate.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);

export default router;
```

**Step 3: Mount routes in app.js**

Modify `server/src/app.js` — add after the health check:
```js
import authRoutes from './routes/auth.routes.js';

app.use('/api/auth', authRoutes);
```

**Step 4: Test registration and login**

Run server, then:
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@acme.com","password":"password123","orgName":"Acme Corp"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@acme.com","password":"password123"}'
```

Expected: 201 with token, user, and organization data.

**Step 5: Commit**

```bash
git add server/src/controllers/auth.controller.js server/src/routes/auth.routes.js server/src/app.js
git commit -m "feat: add auth routes — register (creates org + Free subscription), login, getMe"
```

---

## Task 7: Plan & Subscription Routes

**Files:**
- Create: `server/src/controllers/plan.controller.js`
- Create: `server/src/routes/plan.routes.js`
- Create: `server/src/controllers/subscription.controller.js`
- Create: `server/src/routes/subscription.routes.js`
- Modify: `server/src/app.js` — mount routes

**Step 1: Create plan controller and routes**

Create `server/src/controllers/plan.controller.js`:
```js
import Plan from '../models/Plan.js';

export const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

Create `server/src/routes/plan.routes.js`:
```js
import { Router } from 'express';
import { getAllPlans } from '../controllers/plan.controller.js';

const router = Router();

router.get('/', getAllPlans);

export default router;
```

**Step 2: Create subscription controller and routes**

Create `server/src/controllers/subscription.controller.js`:
```js
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import { getOrCreateUsageRecord } from '../utils/usageTracker.js';

export const getCurrentSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      orgId: req.user.orgId,
      status: 'active'
    }).populate('planId');

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription' });
    }

    const usageRecord = await getOrCreateUsageRecord(req.user.orgId, 'documents');

    res.json({
      subscription: {
        id: subscription._id,
        plan: subscription.planId,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      },
      usage: {
        documents: {
          current: usageRecord.count,
          limit: subscription.planId.limits.maxDocuments,
          resetsAt: usageRecord.periodEnd
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const changePlan = async (req, res) => {
  try {
    const { planId } = req.body;

    const newPlan = await Plan.findById(planId);
    if (!newPlan || !newPlan.isActive) {
      return res.status(400).json({ error: 'Invalid or inactive plan' });
    }

    // Expire current subscription
    await Subscription.updateMany(
      { orgId: req.user.orgId, status: 'active' },
      { status: 'expired' }
    );

    // Create new subscription
    const startDate = new Date();
    const endDate = new Date();
    if (newPlan.price === 0) {
      endDate.setFullYear(endDate.getFullYear() + 100); // Free doesn't expire
    } else {
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
    }

    const subscription = await Subscription.create({
      orgId: req.user.orgId,
      planId: newPlan._id,
      status: 'active',
      startDate,
      endDate
    });

    await subscription.populate('planId');

    res.json({
      message: `Plan changed to ${newPlan.name}`,
      subscription: {
        id: subscription._id,
        plan: subscription.planId,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

Create `server/src/routes/subscription.routes.js`:
```js
import { Router } from 'express';
import { getCurrentSubscription, changePlan } from '../controllers/subscription.controller.js';
import authenticate from '../middleware/authenticate.js';
import attachSubscription from '../middleware/attachSubscription.js';
import adminOnly from '../middleware/adminOnly.js';

const router = Router();

router.get('/', authenticate, attachSubscription, getCurrentSubscription);
router.post('/change', authenticate, adminOnly, changePlan);

export default router;
```

**Step 3: Mount routes in app.js**

Add to `server/src/app.js`:
```js
import planRoutes from './routes/plan.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';

app.use('/api/plans', planRoutes);
app.use('/api/subscription', subscriptionRoutes);
```

**Step 4: Commit**

```bash
git add server/src/controllers/plan.controller.js server/src/controllers/subscription.controller.js server/src/routes/plan.routes.js server/src/routes/subscription.routes.js server/src/app.js
git commit -m "feat: add plan listing and subscription management routes with plan change"
```

---

## Task 8: Document Routes with Entitlement Enforcement

**Files:**
- Create: `server/src/controllers/doc.controller.js`
- Create: `server/src/routes/doc.routes.js`
- Modify: `server/src/app.js` — mount routes

**Step 1: Create document controller**

Create `server/src/controllers/doc.controller.js`:
```js
import Document from '../models/Document.js';
import { incrementUsage, decrementUsage } from '../utils/usageTracker.js';

export const getAllDocs = async (req, res) => {
  try {
    const docs = await Document.find({ orgId: req.user.orgId })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDocById = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, orgId: req.user.orgId })
      .populate('uploadedBy', 'name email')
      .populate('sharedWith', 'name email');

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadDoc = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const doc = await Document.create({
      title,
      description: description || '',
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      orgId: req.user.orgId,
      uploadedBy: req.user.userId,
      versions: [{
        versionNumber: 1,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedBy: req.user.userId,
        uploadedAt: new Date()
      }],
      currentVersion: 1
    });

    await incrementUsage(req.user.orgId, 'documents');

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteDoc = async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({
      _id: req.params.id,
      orgId: req.user.orgId
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await decrementUsage(req.user.orgId, 'documents');

    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const shareDoc = async (req, res) => {
  try {
    const { userIds } = req.body;

    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { $addToSet: { sharedWith: { $each: userIds } } },
      { new: true }
    ).populate('sharedWith', 'name email');

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadVersion = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const doc = await Document.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const newVersionNumber = doc.currentVersion + 1;
    doc.versions.push({
      versionNumber: newVersionNumber,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.user.userId,
      uploadedAt: new Date()
    });
    doc.currentVersion = newVersionNumber;
    doc.fileName = req.file.originalname;
    doc.fileSize = req.file.size;
    await doc.save();

    await incrementUsage(req.user.orgId, 'documents');

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const searchDocs = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const docs = await Document.find({
      orgId: req.user.orgId,
      $text: { $search: q }
    })
      .populate('uploadedBy', 'name email')
      .sort({ score: { $meta: 'textScore' } });

    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

**Step 2: Create document routes with middleware chain**

Create `server/src/routes/doc.routes.js`:
```js
import { Router } from 'express';
import multer from 'multer';
import { getAllDocs, getDocById, uploadDoc, deleteDoc, shareDoc, uploadVersion, searchDocs } from '../controllers/doc.controller.js';
import authenticate from '../middleware/authenticate.js';
import attachSubscription from '../middleware/attachSubscription.js';
import checkFeature from '../middleware/checkFeature.js';
import checkUsageLimit from '../middleware/checkUsageLimit.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// All plans — basic CRUD
router.get('/', authenticate, attachSubscription, getAllDocs);
router.get('/search', authenticate, attachSubscription, checkFeature('advanced_search'), searchDocs);
router.get('/:id', authenticate, attachSubscription, getDocById);
router.post('/', authenticate, attachSubscription, checkFeature('doc_crud'), checkUsageLimit('maxDocuments'), upload.single('file'), uploadDoc);
router.delete('/:id', authenticate, attachSubscription, deleteDoc);

// Pro+ features
router.post('/:id/share', authenticate, attachSubscription, checkFeature('sharing'), shareDoc);
router.post('/:id/version', authenticate, attachSubscription, checkFeature('versioning'), checkUsageLimit('maxDocuments'), upload.single('file'), uploadVersion);

export default router;
```

**Step 3: Mount routes in app.js**

Add to `server/src/app.js`:
```js
import docRoutes from './routes/doc.routes.js';

app.use('/api/docs', docRoutes);
```

**Step 4: Commit**

```bash
git add server/src/controllers/doc.controller.js server/src/routes/doc.routes.js server/src/app.js
git commit -m "feat: add document routes with full entitlement middleware chain — feature gates and usage limits"
```

---

## Task 9: Organization Routes

**Files:**
- Create: `server/src/controllers/org.controller.js`
- Create: `server/src/routes/org.routes.js`
- Modify: `server/src/app.js` — mount routes

**Step 1: Create org controller**

Create `server/src/controllers/org.controller.js`:
```js
import Organization from '../models/Organization.js';
import User from '../models/User.js';

export const getOrg = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const members = await User.find({ orgId: req.user.orgId }).select('name email role createdAt');

    res.json({ organization: org, members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      orgId: req.user.orgId,
      role: role || 'member'
    });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

Create `server/src/routes/org.routes.js`:
```js
import { Router } from 'express';
import { getOrg, addUser } from '../controllers/org.controller.js';
import authenticate from '../middleware/authenticate.js';
import attachSubscription from '../middleware/attachSubscription.js';
import adminOnly from '../middleware/adminOnly.js';

const router = Router();

router.get('/', authenticate, attachSubscription, getOrg);
router.post('/users', authenticate, attachSubscription, adminOnly, addUser);

export default router;
```

Add to `server/src/app.js`:
```js
import orgRoutes from './routes/org.routes.js';

app.use('/api/org', orgRoutes);
```

**Step 2: Commit**

```bash
git add server/src/controllers/org.controller.js server/src/routes/org.routes.js server/src/app.js
git commit -m "feat: add organization routes — get org details and add users"
```

---

## Task 10: Client Project Scaffolding

**Files:**
- Create: `client/` (via Vite)
- Modify: `client/tailwind.config.js`
- Create: `client/src/middleware/api.js`

**Step 1: Scaffold React project**

```bash
cd D:\Projects\docsvault
npm create vite@latest client -- --template react
cd client
npm install
npm install axios react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```

**Step 2: Configure Tailwind**

Add Tailwind CSS plugin to `client/vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
});
```

Replace `client/src/index.css` with:
```css
@import "tailwindcss";
```

**Step 3: Create Axios API instance**

Create `client/src/middleware/api.js`:
```js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401/403/429 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status, data } = error.response || {};

    if (status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
```

**Step 4: Commit**

```bash
git add client/
git commit -m "feat: scaffold React client with Vite, Tailwind CSS, and Axios API interceptors"
```

---

## Task 11: Auth & Subscription Context

**Files:**
- Create: `client/src/context/AuthContext.jsx`
- Create: `client/src/context/SubscriptionContext.jsx`
- Create: `client/src/utils/features.js`

**Step 1: Create AuthContext**

Create `client/src/context/AuthContext.jsx`:
```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../middleware/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setOrganization(data.organization);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setOrganization(data.organization);
    return data;
  };

  const register = async (name, email, password, orgName) => {
    const { data } = await api.post('/auth/register', { name, email, password, orgName });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setOrganization(data.organization);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ user, organization, loading, login, register, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

**Step 2: Create SubscriptionContext**

Create `client/src/context/SubscriptionContext.jsx`:
```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../middleware/api';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/subscription');
      setSubscription(data.subscription);
      setUsage(data.usage);
    } catch {
      setSubscription(null);
      setUsage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubscription(); }, [user]);

  return (
    <SubscriptionContext.Provider value={{ subscription, usage, loading, refreshSubscription: loadSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);
```

**Step 3: Create feature utility**

Create `client/src/utils/features.js`:
```js
export const hasFeature = (subscription, featureName) => {
  if (!subscription || !subscription.plan) return false;
  return subscription.plan.features.includes(featureName);
};

export const isWithinLimit = (usage, metric) => {
  if (!usage || !usage[metric]) return false;
  const { current, limit } = usage[metric];
  if (limit === -1) return true;
  return current < limit;
};

export const getUsagePercentage = (usage, metric) => {
  if (!usage || !usage[metric]) return 0;
  const { current, limit } = usage[metric];
  if (limit === -1) return 0;
  return Math.round((current / limit) * 100);
};
```

**Step 4: Commit**

```bash
git add client/src/context/ client/src/utils/
git commit -m "feat: add AuthContext, SubscriptionContext, and feature utility helpers"
```

---

## Task 12: Frontend Pages — Auth

**Files:**
- Create: `client/src/pages/Login.jsx`
- Create: `client/src/pages/Register.jsx`

**Step 1: Create Login page**

Create `client/src/pages/Login.jsx`:
```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
            Sign In
          </button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-600">
          Don't have an account? <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Create Register page**

Create `client/src/pages/Register.jsx`:
```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', orgName: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
            <input type="text" name="orgName" value={form.orgName} onChange={handleChange} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
            Create Account
          </button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add client/src/pages/Login.jsx client/src/pages/Register.jsx
git commit -m "feat: add Login and Register pages"
```

---

## Task 13: Frontend Pages — Dashboard, Documents, Plans

**Files:**
- Create: `client/src/pages/Dashboard.jsx`
- Create: `client/src/pages/Documents.jsx`
- Create: `client/src/pages/DocumentDetail.jsx`
- Create: `client/src/pages/Search.jsx`
- Create: `client/src/pages/Plans.jsx`
- Create: `client/src/pages/OrgSettings.jsx`

**Step 1: Create Dashboard**

Create `client/src/pages/Dashboard.jsx` with:
- Subscription status card (plan name, status, expiry date)
- Usage bar showing documents used / limit
- Color-coded: green (<70%), yellow (70-90%), red (>90%)
- Quick links to Documents, Plans, Org Settings

**Step 2: Create Documents page**

Create `client/src/pages/Documents.jsx` with:
- Document list table with title, size, uploaded by, date
- Upload button (gated by plan — disabled if limit reached)
- Delete button per document
- File upload form (title, description, file input)

**Step 3: Create DocumentDetail page**

Create `client/src/pages/DocumentDetail.jsx` with:
- Document metadata display
- Share section (Pro+ only — show upgrade prompt if Free)
- Version history list (Pro+ only)
- Upload new version button (Pro+ only)

**Step 4: Create Search page**

Create `client/src/pages/Search.jsx` with:
- Search input field
- Results list
- Feature gate — show "Enterprise only" message for lower plans

**Step 5: Create Plans page**

Create `client/src/pages/Plans.jsx` with:
- Plan cards showing name, price, features, limits
- Current plan highlighted
- "Change Plan" button per card (admin only)

**Step 6: Create OrgSettings page**

Create `client/src/pages/OrgSettings.jsx` with:
- Organization name display
- Members list with roles
- Add user form (admin only)

**Step 7: Commit**

```bash
git add client/src/pages/
git commit -m "feat: add Dashboard, Documents, DocumentDetail, Search, Plans, and OrgSettings pages"
```

---

## Task 14: Frontend Components & Layout

**Files:**
- Create: `client/src/components/Layout.jsx`
- Create: `client/src/components/FeatureGate.jsx`
- Create: `client/src/components/UsageBar.jsx`
- Create: `client/src/components/UpgradeBanner.jsx`
- Create: `client/src/components/PlanBadge.jsx`
- Create: `client/src/components/SubscriptionStatus.jsx`

**Step 1: Create Layout with sidebar**

Create `client/src/components/Layout.jsx` with:
- Sidebar with navigation links: Dashboard, Documents, Search, Plans, Org Settings
- Top bar with user name, org name, plan badge, logout button
- Feature-gated sidebar items (Search shows lock icon for non-Enterprise)

**Step 2: Create FeatureGate component**

Create `client/src/components/FeatureGate.jsx`:
```jsx
import { useSubscription } from '../context/SubscriptionContext';
import { hasFeature } from '../utils/features';

export default function FeatureGate({ feature, children, fallback }) {
  const { subscription } = useSubscription();

  if (hasFeature(subscription, feature)) {
    return children;
  }

  return fallback || (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <p className="text-gray-500">This feature requires an upgraded plan.</p>
    </div>
  );
}
```

**Step 3: Create UsageBar, UpgradeBanner, PlanBadge, SubscriptionStatus**

Implement per design Section 4.

**Step 4: Commit**

```bash
git add client/src/components/
git commit -m "feat: add Layout, FeatureGate, UsageBar, UpgradeBanner, and status components"
```

---

## Task 15: App Router & Wiring

**Files:**
- Modify: `client/src/App.jsx`

**Step 1: Wire everything together**

Replace `client/src/App.jsx`:
```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import Search from './pages/Search';
import Plans from './pages/Plans';
import OrgSettings from './pages/OrgSettings';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="documents" element={<Documents />} />
        <Route path="documents/:id" element={<DocumentDetail />} />
        <Route path="search" element={<Search />} />
        <Route path="plans" element={<Plans />} />
        <Route path="settings" element={<OrgSettings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <AppRoutes />
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

**Step 2: Verify full app runs**

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Test: Register → Dashboard → Upload doc → Try sharing on Free → See 403 → Change to Pro → Sharing works.

**Step 3: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat: wire App router with auth guards, layout, and all pages"
```

---

## Task 16: End-to-End Verification

**Step 1: Seed plans**

```bash
cd server && npm run seed
```

**Step 2: Test entitlement enforcement**

```bash
# Register org on Free plan
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"pass123","orgName":"TestOrg"}'
# Save the returned token

# Try sharing (Free plan) — expect 403
curl -X POST http://localhost:5000/api/docs/<docId>/share \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"userIds":[]}'
# Expected: 403 "Feature 'sharing' is not available in your Free plan"

# Upgrade to Pro
curl -X POST http://localhost:5000/api/subscription/change \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"planId":"<pro_plan_id>"}'

# Try sharing again — expect 200
# Upload docs until limit — expect 429
```

**Step 3: Test usage limit**

Upload 10 documents on Free plan. The 11th upload must return 429.

**Step 4: Test subscription expiry**

Manually set a subscription's `endDate` to the past in MongoDB Atlas. Subsequent API calls must return 403 "Subscription expired".

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete multi-tenant DMS with subscription entitlement system"
```

---

## Summary

| Task | What It Builds | Key Files |
|---|---|---|
| 1 | Server scaffolding + DB connection | `server.js`, `app.js`, `config/db.js` |
| 2 | All 6 Mongoose models | `models/*.js` |
| 3 | Plan seed data (Free/Pro/Enterprise) | `seeds/plans.seed.js` |
| 4 | Usage tracker utility | `utils/usageTracker.js` |
| 5 | Entitlement middleware chain | `middleware/*.js` |
| 6 | Auth routes (register/login/me) | `controllers/auth.controller.js` |
| 7 | Plan + subscription routes | `controllers/plan.controller.js`, `subscription.controller.js` |
| 8 | Document routes with entitlement gates | `controllers/doc.controller.js`, `routes/doc.routes.js` |
| 9 | Organization routes | `controllers/org.controller.js` |
| 10 | Client scaffolding (Vite + Tailwind) | `client/` |
| 11 | Auth + Subscription contexts | `context/*.jsx`, `utils/features.js` |
| 12 | Login + Register pages | `pages/Login.jsx`, `pages/Register.jsx` |
| 13 | Dashboard, Documents, Plans pages | `pages/*.jsx` |
| 14 | Layout + reusable components | `components/*.jsx` |
| 15 | App router wiring | `App.jsx` |
| 16 | End-to-end verification | Manual testing |
