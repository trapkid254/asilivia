import { Router } from 'express';
import Customer from '../models/Customer.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

// List customers
router.get('/', async (req, res, next) => {
  try {
    const items = await Customer.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { next(err); }
});

// Get customer
router.get('/:id', async (req, res, next) => {
  try {
    const item = await Customer.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Customer not found' });
    res.json(item);
  } catch (err) { next(err); }
});

// Create or upsert customer
router.post('/', async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone) return res.status(400).json({ error: 'email or phone required' });
    const ident = email || phone;
    const upserted = await Customer.findOneAndUpdate(
      { $or: [{ email: ident }, { phone: ident }] },
      { $set: { ...req.body } },
      { upsert: true, new: true }
    );
    res.status(201).json(upserted);
  } catch (err) { next(err); }
});

// Update customer
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Customer not found' });
    res.json(updated);
  } catch (err) { next(err); }
});

// Delete customer
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
