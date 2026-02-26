import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Set JWT_SECRET for test environment
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

let mongoServer;

beforeAll(async () => {
  // Prevent parallel beforeAll issues with mongoose.connect
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect mongoose to the in-memory database
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Cleanup: disconnect and stop the in-memory database
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  // Clear all collections after each test
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      if (key !== 'system.indexes') {
        try {
          await collections[key].deleteMany({});
        } catch (error) {
           console.log("Could not clear collection " + key);
        }
      }
    }
  }
});
