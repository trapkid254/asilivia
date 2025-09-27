import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  category: { type: String, index: true },
  brand: { type: String, index: true },
  image: { type: String },
  description: { type: String },
  stock: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  featured: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Product', ProductSchema);
