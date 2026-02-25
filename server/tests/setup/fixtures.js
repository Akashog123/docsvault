import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

export const createUser = async (overrides = {}) => {
  const hashedPassword = await bcrypt.hash('password123', 10);

  return {
    email: faker.internet.email(),
    password: hashedPassword,
    name: faker.person.fullName(),
    role: 'admin',
    organizationId: faker.database.mongodbObjectId(),
    ...overrides,
  };
};

export const createOrganization = (overrides = {}) => {
  return {
    name: faker.company.name(),
    ...overrides,
  };
};

export const createPlan = (overrides = {}) => {
  return {
    name: 'Free',
    features: ['doc_crud'],
    limits: {
      maxDocuments: 10,
      maxStorage: 100,
    },
    price: 0,
    ...overrides,
  };
};

export const createSubscription = (overrides = {}) => {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + 100); // Free plan gets 100 years

  return {
    organizationId: faker.database.mongodbObjectId(),
    planId: faker.database.mongodbObjectId(),
    status: 'active',
    startDate: now,
    expiresAt,
    ...overrides,
  };
};

export const createUsageRecord = (overrides = {}) => {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    organizationId: faker.database.mongodbObjectId(),
    periodStart,
    periodEnd,
    documents: 0,
    storage: 0,
    ...overrides,
  };
};

export const createDocument = (overrides = {}) => {
  return {
    name: faker.system.fileName(),
    path: faker.system.filePath(),
    size: faker.number.int({ min: 1000, max: 1000000 }),
    mimeType: 'application/pdf',
    organizationId: faker.database.mongodbObjectId(),
    uploadedBy: faker.database.mongodbObjectId(),
    ...overrides,
  };
};
