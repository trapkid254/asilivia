import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  price: Number,
  qty: { type: Number, default: 1 },
  image: String,
});

const OrderSchema = new mongoose.Schema({
  items: { type: [OrderItemSchema], default: [] },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'processing', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'], default: 'pending' },
  customer: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: String,
  },
  notes: String,
  audit: { type: [{ action: String, note: String, at: Date }], default: [] },
}, { timestamps: true });

export default mongoose.model('Order', OrderSchema);
