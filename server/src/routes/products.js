import { Router } from 'express';
import Product from '../models/Product.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

// List products (optionally filter by status=active)
router.get('/', async (req, res, next) => {
  try {
    const { status, q, brand, category, featured, sort = 'createdAt:desc', page = '1', limit = '50' } = req.query;
    const query = {};
    if (status) query.status = status;
    if (brand) query.brand = brand;
    if (category) query.category = category;
    if (typeof featured !== 'undefined') {
      const fv = String(featured).toLowerCase();
      if (fv === 'true' || fv === '1') query.featured = true;
      else if (fv === 'false' || fv === '0') query.featured = false;
    }
    if (q) {
      query.$or = [
        { name: new RegExp(q, 'i') },
        { brand: new RegExp(q, 'i') },
        { category: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
      ];
    }

    const [sortField, sortDir] = String(sort).split(':');
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 50));

    const items = await Product.find(query)
      .sort({ [sortField || 'createdAt']: sortDir === 'asc' ? 1 : -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    res.json(items);
  } catch (err) { next(err); }
});

// Get single product
router.get('/:id', async (req, res, next) => {
  try {
    const item = await Product.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Product not found' });
    res.json(item);
  } catch (err) { next(err); }
});

// Create product
router.post('/', adminAuth, async (req, res, next) => {
  try {
    const created = await Product.create(req.body);
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// Update product
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (err) { next(err); }
});

// Delete product
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
