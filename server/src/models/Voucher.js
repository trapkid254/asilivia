import mongoose from 'mongoose';

const VoucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  amount: { type: Number, required: true },
  used: { type: Boolean, default: false },
  assignedTo: {
    email: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  usedAt: { type: Date },
}, { timestamps: true });

export default mongoose.model('Voucher', VoucherSchema);
