import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import planRoutes from './routes/plan.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import docRoutes from './routes/doc.routes.js';
import orgRoutes from './routes/org.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/docs', docRoutes);
app.use('/api/org', orgRoutes);

// Global error handler — catches unhandled errors from all routes
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

export default app;
