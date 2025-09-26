import { Router } from 'express';
import Voucher from '../models/Voucher.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

// List vouchers (admin only)
router.get('/', adminAuth, async (req, res, next) => {
  try {
    const items = await Voucher.find({}).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { next(err); }
});

// Create voucher (admin)
router.post('/', adminAuth, async (req, res, next) => {
  try {
    const { code, amount } = req.body || {};
    if (!code || !amount) return res.status(400).json({ error: 'code and amount are required' });
    const exists = await Voucher.findOne({ code });
    if (exists) return res.status(409).json({ error: 'Voucher exists' });
    const created = await Voucher.create({ code, amount });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// Delete voucher (admin)
router.delete('/:code', adminAuth, async (req, res, next) => {
  try {
    const { code } = req.params;
    const del = await Voucher.findOneAndDelete({ code });
    if (!del) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Assign voucher to customer (admin)
router.post('/assign', adminAuth, async (req, res, next) => {
  try {
    const { code, email, phone } = req.body || {};
    if (!code || (!email && !phone)) return res.status(400).json({ error: 'code and email or phone required' });
    const v = await Voucher.findOne({ code });
    if (!v) return res.status(404).json({ error: 'Voucher not found' });
    v.assignedTo = { email: email || '', phone: email ? '' : (phone || '') };
    await v.save();
    res.json(v);
  } catch (err) { next(err); }
});

// Redeem voucher (customer-side allowed)
router.post('/redeem', async (req, res, next) => {
  try {
    const { code, email, phone } = req.body || {};
    if (!code || (!email && !phone)) return res.status(400).json({ error: 'code and email or phone required' });
    const v = await Voucher.findOne({ code });
    if (!v) return res.status(404).json({ error: 'Voucher not found' });
    // Check assignment if exists
    if (v.assignedTo && (v.assignedTo.email || v.assignedTo.phone)) {
      if (v.assignedTo.email && v.assignedTo.email !== email) {
        return res.status(403).json({ error: 'Voucher not assigned to this email' });
      }
      if (v.assignedTo.phone && v.assignedTo.phone !== phone) {
        return res.status(403).json({ error: 'Voucher not assigned to this phone' });
      }
    }
    if (v.used) return res.status(410).json({ error: 'Voucher already used' });
    v.used = true;
    v.usedAt = new Date();
    if (!v.assignedTo || (!v.assignedTo.email && !v.assignedTo.phone)) {
      v.assignedTo = { email: email || '', phone: email ? '' : (phone || '') };
    }
    await v.save();
    res.json(v);
  } catch (err) { next(err); }
});

// Get vouchers for a customer (optional public endpoint)
router.get('/by-customer', async (req, res, next) => {
  try {
    const { email, phone } = req.query || {};
    if (!email && !phone) return res.status(400).json({ error: 'email or phone required' });
    const items = await Voucher.find({
      $or: [
        { 'assignedTo.email': email || null },
        { 'assignedTo.phone': phone || null },
      ],
    }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { next(err); }
});

export default router;
