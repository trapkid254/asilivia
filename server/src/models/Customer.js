import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, index: true },
  phone: { type: String, index: true },
  address: String,
}, { timestamps: true });

export default mongoose.model('Customer', CustomerSchema);
