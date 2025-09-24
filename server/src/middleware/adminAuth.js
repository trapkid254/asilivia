export function adminAuth(req, res, next) {
  const token = req.header('x-admin-token');
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return res.status(500).json({ error: 'ADMIN_TOKEN not set' });
  if (!token || token !== expected) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
