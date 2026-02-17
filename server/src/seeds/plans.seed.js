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
