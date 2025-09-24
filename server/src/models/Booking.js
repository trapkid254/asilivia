import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  // High-level service info (optional)
  service: { type: String },
  datetime: { type: Date },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },

  // Detailed fields matching the frontend payload structure
  device: {
    type: new mongoose.Schema({
      type: String,
      brand: String,
      model: String,
    }, { _id: false })
  },
  issue: {
    type: new mongoose.Schema({
      type: String,
      description: String,
    }, { _id: false })
  },
  serviceOptions: {
    type: new mongoose.Schema({
      urgency: String,
      location: String,
      pickupAddress: String,
      contactMethod: String,
    }, { _id: false })
  },

  customer: {
    firstName: String,
    lastName: String,
    name: String, // some forms use a single name field
    email: String,
    phone: String,
    address: String,
    notes: String,
  },
}, { timestamps: true });

export default mongoose.model('Booking', BookingSchema);
