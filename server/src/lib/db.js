import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI;

export async function connectDB() {
  if (!MONGO_URI) {
    throw new Error('MONGODB_URI is not set');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI, {
    autoIndex: true,
  });
  console.log('Connected to MongoDB');
}
