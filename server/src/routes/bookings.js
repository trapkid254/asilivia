import { Router } from 'express';
import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

// List bookings
router.get('/', async (req, res, next) => {
  try {
    const { email, phone } = req.query;
    const query = {};
    if (email || phone) {
      query.$or = [];
      if (email) query.$or.push({ 'customer.email': String(email).trim() });
      if (phone) query.$or.push({ 'customer.phone': String(phone).trim() });
    }
    const items = await Booking.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { next(err); }
});

// Propose a quote (admin)
router.post('/:id/quote', adminAuth, async (req, res, next) => {
  try {
    const { amount, note } = req.body || {};
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });
    b.quoteAmount = amount;
    b.quoteNote = note || '';
    b.quoteStatus = 'proposed';
    b.quoteAt = new Date();
    await b.save();
    res.json(b);
  } catch (err) { next(err); }
});

// Accept quote (customer)
router.post('/:id/quote/accept', async (req, res, next) => {
  try {
    const { email, phone } = req.body || {};
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    // Simple identity check
    if (b.customer?.email && email && b.customer.email !== email) return res.status(403).json({ error: 'Forbidden' });
    if (b.customer?.phone && phone && b.customer.phone !== phone) return res.status(403).json({ error: 'Forbidden' });
    if (b.quoteStatus !== 'proposed') return res.status(400).json({ error: 'No active quote' });
    b.quoteStatus = 'accepted';
    b.quoteAcceptedAt = new Date();
    await b.save();
    res.json(b);
  } catch (err) { next(err); }
});

// Decline quote (customer)
router.post('/:id/quote/decline', async (req, res, next) => {
  try {
    const { email, phone } = req.body || {};
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    if (b.customer?.email && email && b.customer.email !== email) return res.status(403).json({ error: 'Forbidden' });
    if (b.customer?.phone && phone && b.customer.phone !== phone) return res.status(403).json({ error: 'Forbidden' });
    if (b.quoteStatus !== 'proposed') return res.status(400).json({ error: 'No active quote' });
    b.quoteStatus = 'declined';
    b.quoteAcceptedAt = undefined;
    await b.save();
    res.json(b);
  } catch (err) { next(err); }
});

// Get booking
router.get('/:id', async (req, res, next) => {
  try {
    const item = await Booking.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Booking not found' });
    res.json(item);
  } catch (err) { next(err); }
});

// Create booking
router.post('/', async (req, res, next) => {
  try {
    const created = await Booking.create(req.body);
    // Upsert customer from booking.customer
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

// Update booking
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Booking not found' });
    res.json(updated);
  } catch (err) { next(err); }
});

// Delete booking
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Booking not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
