import { Router } from 'express';

const router = Router();

// Simple admin login: verifies username/password from env and returns admin token
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    const envUser = process.env.ADMIN_USERNAME || 'mepoclaires';
    const envPass = process.env.ADMIN_PASSWORD || 'admin254';
    if (String(username) === String(envUser) && String(password) === String(envPass)) {
      const token = process.env.ADMIN_TOKEN;
      if (!token) return res.status(500).json({ error: 'Admin token not configured' });
      return res.json({ token });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
