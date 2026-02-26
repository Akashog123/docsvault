import mongoose from 'mongoose';

let cached = global.__mongooseConnection;

if (!cached) {
  cached = global.__mongooseConnection = { promise: null };
}

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI).then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    });
  }

  try {
    await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
};

export default connectDB;
