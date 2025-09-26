import { Router } from 'express';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

// List orders
router.get('/', async (req, res, next) => {
  try {
    const { email, phone } = req.query;
    const query = {};
    if (email || phone) {
      query.$or = [];
      if (email) query.$or.push({ 'customer.email': String(email).trim() });
      if (phone) query.$or.push({ 'customer.phone': String(phone).trim() });
    }
    const items = await Order.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { next(err); }
});

// Get order
router.get('/:id', async (req, res, next) => {
  try {
    const item = await Order.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Order not found' });
    res.json(item);
  } catch (err) { next(err); }
});

// Create order
router.post('/', async (req, res, next) => {
  try {
    const created = await Order.create(req.body);
    // Upsert customer from order.customer
    if (created.customer && (created.customer.email || created.customer.phone)) {
      const ident = created.customer.email || created.customer.phone;
      await Customer.findOneAndUpdate(
        { $or: [{ email: ident }, { phone: ident }] },
        { $set: { ...created.customer } },
        { upsert: true, new: true }
      );
    }
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// Update order status/details
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const updates = req.body || {};
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Track status change
    const audit = order.audit || [];
    if (typeof updates.status !== 'undefined' && updates.status !== order.status) {
      audit.push({ action: 'status_change', note: `Status ${order.status} -> ${updates.status}`, at: new Date() });
    }
    // Merge updates
    Object.assign(order, updates, { audit });
    await order.save();
    res.json(order);
  } catch (err) { next(err); }
});

// Delete order
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Cancel order with note
router.post('/:id/cancel', adminAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const note = String(req.body?.note || '').trim();
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.audit = order.audit || [];
    order.audit.push({ action: 'cancel', note, at: new Date() });
    order.status = 'cancelled';
    await order.save();
    res.json(order);
  } catch (err) { next(err); }
});

// Refund order with note
router.post('/:id/refund', adminAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const note = String(req.body?.note || '').trim();
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.audit = order.audit || [];
    order.audit.push({ action: 'refund', note, at: new Date() });
    order.status = 'refunded';
    await order.save();
    res.json(order);
  } catch (err) { next(err); }
});

export default router;
