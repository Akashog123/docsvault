import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Set JWT_SECRET for test environment
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

let mongoServer;

beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect mongoose to the in-memory database
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Cleanup: disconnect and stop the in-memory database
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
